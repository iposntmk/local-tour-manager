import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { enrichTourWithSummary } from '@/lib/tour-utils';
import type {
  LineStatus,
  LineType,
  PaymentStatus,
  SettlementStatus,
  Tour,
  TourListResult,
  TourPayment,
} from '@/types/tour';

export type TourCollectionKey = 'destinations' | 'expenses' | 'meals' | 'allowances' | 'shoppings';

const tourQueryKey = (tourId: string) => ['tour', tourId] as const;

export interface TourAggregateCacheSnapshot {
  previousTour?: Tour;
  previousTourLists: Array<[QueryKey, TourListResult | undefined]>;
}

const emptyAggregateSnapshot: TourAggregateCacheSnapshot = { previousTourLists: [] };

export const getTourCacheSnapshot = (queryClient: QueryClient, tourId: string) =>
  queryClient.getQueryData<Tour>(tourQueryKey(tourId));

export const restoreTourCacheSnapshot = (
  queryClient: QueryClient,
  tourId: string,
  snapshot: Tour | undefined,
) => {
  if (snapshot) queryClient.setQueryData(tourQueryKey(tourId), snapshot);
};

export const snapshotTourAggregateCaches = async (
  queryClient: QueryClient,
  tourId?: string,
): Promise<TourAggregateCacheSnapshot> => {
  if (!tourId) return emptyAggregateSnapshot;
  await Promise.all([
    queryClient.cancelQueries({ queryKey: tourQueryKey(tourId) }),
    queryClient.cancelQueries({ queryKey: ['tours'] }),
  ]);
  return {
    previousTour: queryClient.getQueryData<Tour>(tourQueryKey(tourId)),
    previousTourLists: queryClient.getQueriesData<TourListResult>({ queryKey: ['tours'] }),
  };
};

export const restoreTourAggregateCaches = (
  queryClient: QueryClient,
  tourId: string | undefined,
  snapshot?: TourAggregateCacheSnapshot,
) => {
  if (!snapshot) return;
  if (tourId && snapshot.previousTour) queryClient.setQueryData(tourQueryKey(tourId), snapshot.previousTour);
  snapshot.previousTourLists.forEach(([queryKey, data]) => queryClient.setQueryData(queryKey, data));
};

export const patchTourInAggregateCaches = (
  queryClient: QueryClient,
  tourId: string,
  patchTour: (tour: Tour) => Tour,
) => {
  queryClient.setQueryData<Tour>(tourQueryKey(tourId), (current) =>
    current ? patchTour(current) : current
  );
  queryClient.setQueriesData<TourListResult>({ queryKey: ['tours'] }, (current) =>
    current
      ? { ...current, tours: current.tours.map((tour) => (tour.id === tourId ? patchTour(tour) : tour)) }
      : current
  );
};

export const replaceTourCacheLine = (
  queryClient: QueryClient,
  tourId: string,
  collection: TourCollectionKey,
  index: number,
  line: unknown,
) => {
  queryClient.setQueryData<Tour>(tourQueryKey(tourId), (current) => {
    if (!current) return current;
    const rows = [...((current[collection] as unknown[]) || [])];
    const previous = rows[index] as { id?: string } | undefined;
    rows[index] = { ...(line as object), id: (line as { id?: string }).id ?? previous?.id };
    return enrichTourWithSummary({ ...current, [collection]: rows });
  });
};

const getTourFinalTotalForCache = (tour: Pick<Tour, 'summary'>): number => {
  const finalTotal = tour.summary?.finalTotal;
  if (typeof finalTotal === 'number' && !Number.isNaN(finalTotal)) return finalTotal;
  return tour.summary?.totalTabs ?? 0;
};

const getPaymentStatusForCache = (paymentTotal: number, finalTotal: number): PaymentStatus => {
  if (paymentTotal <= 0) return 'pending';
  return paymentTotal >= finalTotal && finalTotal > 0 ? 'paid' : 'partial';
};

const getPaymentTime = (value?: string) => {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const sortPaymentsNewestFirst = (payments: TourPayment[]) =>
  [...payments].sort((a, b) => getPaymentTime(b.paidAt) - getPaymentTime(a.paidAt));

const applyPaymentRows = (tour: Tour, payments: TourPayment[]): Tour => {
  const sortedPayments = sortPaymentsNewestFirst(payments);
  const paymentTotal = sortedPayments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
  const lastPayment = sortedPayments[0];
  return {
    ...tour,
    paymentTotal,
    paymentStatus: getPaymentStatusForCache(paymentTotal, getTourFinalTotalForCache(tour)),
    lastPaidAt: lastPayment?.paidAt,
    lastPaymentMethod: lastPayment?.method,
    ...(tour.payments !== undefined ? { payments: sortedPayments } : {}),
  };
};

const resetPaymentRows = (tour: Tour): Tour => ({
  ...tour,
  paymentStatus: 'pending',
  paymentTotal: 0,
  lastPaidAt: undefined,
  lastPaymentMethod: undefined,
  ...(tour.payments !== undefined ? { payments: [] } : {}),
});

export const patchTourPaymentRowsInCache = (
  queryClient: QueryClient,
  tourId: string,
  payments: TourPayment[],
) => {
  patchTourInAggregateCaches(queryClient, tourId, (current) => applyPaymentRows(current, payments));
};

export const patchTourSettlementStatusInCache = (
  queryClient: QueryClient,
  tourId: string,
  status: SettlementStatus,
) => {
  patchTourInAggregateCaches(queryClient, tourId, (current) => {
    if (!current) return current;
    const patched = { ...current, settlementStatus: status };
    const wasPaymentEligible = current.settlementStatus === 'approved' || current.settlementStatus === 'closed';
    const isPaymentEligible = status === 'approved' || status === 'closed';
    return wasPaymentEligible && !isPaymentEligible ? resetPaymentRows(patched) : patched;
  });
};

export const patchTourLineReviewInCache = (
  queryClient: QueryClient,
  tourId: string,
  targets: Array<{ lineType: LineType; lineId: string }>,
  value: { lineStatus: LineStatus; lineComment?: string },
) => {
  queryClient.setQueryData<Tour>(tourQueryKey(tourId), (current) => {
    if (!current) return current;
    const byType = new Map<LineType, Set<string>>();
    targets.forEach((target) => {
      const ids = byType.get(target.lineType) || new Set<string>();
      ids.add(target.lineId);
      byType.set(target.lineType, ids);
    });

    const patchCollection = (collection: TourCollectionKey, lineType: LineType) => {
      const ids = byType.get(lineType);
      if (!ids?.size) return current[collection];
      return (current[collection] as Array<{ id?: string }>).map((line) =>
        line.id && ids.has(line.id)
          ? { ...line, lineStatus: value.lineStatus, lineComment: value.lineComment }
          : line
      );
    };

    return {
      ...current,
      destinations: patchCollection('destinations', 'destination') as Tour['destinations'],
      expenses: patchCollection('expenses', 'expense') as Tour['expenses'],
      meals: patchCollection('meals', 'meal') as Tour['meals'],
      allowances: patchCollection('allowances', 'allowance') as Tour['allowances'],
      shoppings: patchCollection('shoppings', 'shopping') as Tour['shoppings'],
    };
  });
};
