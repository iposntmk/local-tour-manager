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

const TOUR_COLLECTIONS: ReadonlyArray<readonly [TourCollectionKey, LineType]> = [
  ['destinations', 'destination'],
  ['expenses', 'expense'],
  ['meals', 'meal'],
  ['allowances', 'allowance'],
  ['shoppings', 'shopping'],
];

const tourQueryKey = (tourId: string) => ['tour', tourId] as const;

/**
 * TourDetail đọc từng sub-collection qua query riêng (`useTourDetail`), nên mọi cập nhật
 * lạc quan phải ghi vào key này thì bảng mới đổi ngay; ghi vào ['tour', id] không có tác dụng
 * vì bản info-only luôn có mảng rỗng và bị `??` bỏ qua.
 */
export const tourCollectionQueryKey = (tourId: string, collection: TourCollectionKey) =>
  ['tour', tourId, collection] as const;

export interface TourLineCacheSnapshot {
  tour?: Tour;
  rows?: unknown[];
}

export const getTourLineCacheSnapshot = (
  queryClient: QueryClient,
  tourId: string,
  collection: TourCollectionKey,
): TourLineCacheSnapshot => ({
  tour: queryClient.getQueryData<Tour>(tourQueryKey(tourId)),
  rows: queryClient.getQueryData<unknown[]>(tourCollectionQueryKey(tourId, collection)),
});

export const restoreTourLineCacheSnapshot = (
  queryClient: QueryClient,
  tourId: string,
  collection: TourCollectionKey,
  snapshot?: TourLineCacheSnapshot,
) => {
  if (!snapshot) return;
  if (snapshot.tour) queryClient.setQueryData(tourQueryKey(tourId), snapshot.tour);
  if (snapshot.rows) queryClient.setQueryData(tourCollectionQueryKey(tourId, collection), snapshot.rows);
};

const lineDateTime = (line: unknown) => {
  const rawDate = (line as { date?: string } | undefined)?.date;
  const time = rawDate ? Date.parse(rawDate) : Number.NaN;
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
};

/** Giữ thứ tự giống `order('date')` của Supabase để index dòng trong cache khớp index server. */
export const sortTourCacheLines = <T>(rows: T[]): T[] =>
  [...rows].sort((a, b) => lineDateTime(a) - lineDateTime(b));

/** Chèn lạc quan một dòng mới. Trả về false khi cache chưa có dữ liệu (không thể rollback an toàn). */
export const appendTourCacheLine = <T>(
  queryClient: QueryClient,
  tourId: string,
  collection: TourCollectionKey,
  line: T,
): boolean => {
  const key = tourCollectionQueryKey(tourId, collection);
  const rows = queryClient.getQueryData<T[]>(key);
  if (!rows) return false;
  queryClient.setQueryData<T[]>(key, sortTourCacheLines([...rows, line]));
  return true;
};

/** Vá dòng lạc quan bằng so khớp tham chiếu (dòng chưa có id cho tới khi server trả về). */
export const patchTourCacheLineRef = <T>(
  queryClient: QueryClient,
  tourId: string,
  collection: TourCollectionKey,
  target: T,
  patch: Partial<T>,
) => {
  queryClient.setQueryData<T[]>(tourCollectionQueryKey(tourId, collection), (rows) =>
    rows ? rows.map((row) => (row === target ? { ...row, ...patch } : row)) : rows
  );
};

export interface TourAggregateCacheSnapshot {
  previousTour?: Tour;
  previousTourLists: Array<[QueryKey, TourListResult | undefined]>;
}

const emptyAggregateSnapshot: TourAggregateCacheSnapshot = { previousTourLists: [] };

export interface TourDetailCacheSnapshot {
  tour?: Tour;
  collections: Array<[TourCollectionKey, unknown[] | undefined]>;
}

/** Ảnh chụp cả 5 sub-collection — dùng khi một thao tác chạm tới nhiều loại dòng cùng lúc. */
export const getTourDetailCacheSnapshot = (
  queryClient: QueryClient,
  tourId: string,
): TourDetailCacheSnapshot => ({
  tour: queryClient.getQueryData<Tour>(tourQueryKey(tourId)),
  collections: TOUR_COLLECTIONS.map(([collection]) => [
    collection,
    queryClient.getQueryData<unknown[]>(tourCollectionQueryKey(tourId, collection)),
  ]),
});

export const restoreTourDetailCacheSnapshot = (
  queryClient: QueryClient,
  tourId: string,
  snapshot?: TourDetailCacheSnapshot,
) => {
  if (!snapshot) return;
  if (snapshot.tour) queryClient.setQueryData(tourQueryKey(tourId), snapshot.tour);
  snapshot.collections.forEach(([collection, rows]) => {
    if (rows) queryClient.setQueryData(tourCollectionQueryKey(tourId, collection), rows);
  });
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
    current && Array.isArray(current.tours)
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
  queryClient.setQueryData<Array<{ id?: string }>>(
    tourCollectionQueryKey(tourId, collection),
    (rows) => {
      if (!rows) return rows;
      const next = [...rows];
      const previous = next[index];
      next[index] = { ...(line as object), id: (line as { id?: string }).id ?? previous?.id };
      return next;
    }
  );
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
  const idsByType = new Map<LineType, Set<string>>();
  targets.forEach((target) => {
    const ids = idsByType.get(target.lineType) || new Set<string>();
    ids.add(target.lineId);
    idsByType.set(target.lineType, ids);
  });

  const patchRows = <T extends { id?: string }>(rows: T[] | undefined, lineType: LineType) => {
    const ids = idsByType.get(lineType);
    if (!rows || !ids?.size) return rows;
    return rows.map((row) =>
      row.id && ids.has(row.id)
        ? { ...row, lineStatus: value.lineStatus, lineComment: value.lineComment }
        : row
    );
  };

  // Nguồn hiển thị thật của TourDetail là từng query sub-collection.
  TOUR_COLLECTIONS.forEach(([collection, lineType]) => {
    if (!idsByType.has(lineType)) return;
    queryClient.setQueryData<Array<{ id?: string }>>(
      tourCollectionQueryKey(tourId, collection),
      (rows) => patchRows(rows, lineType)
    );
  });

  // Tour cache chỉ còn mang dòng ở các luồng cũ (import/tour chưa tách query) — vá cho đồng bộ.
  queryClient.setQueryData<Tour>(tourQueryKey(tourId), (current) => {
    if (!current) return current;
    return {
      ...current,
      destinations: patchRows(current.destinations, 'destination') as Tour['destinations'],
      expenses: patchRows(current.expenses, 'expense') as Tour['expenses'],
      meals: patchRows(current.meals, 'meal') as Tour['meals'],
      allowances: patchRows(current.allowances, 'allowance') as Tour['allowances'],
      shoppings: patchRows(current.shoppings, 'shopping') as Tour['shoppings'],
    };
  });
};
