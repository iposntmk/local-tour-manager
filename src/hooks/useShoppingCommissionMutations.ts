import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { store } from '@/lib/datastore';
import { invalidateTourAggregateCaches } from '@/lib/query-cache';
import { getShoppingCommissionInfo, withComputedCommissionStatus } from '@/lib/shopping-commission-utils';
import {
  patchTourInAggregateCaches,
  restoreTourAggregateCaches,
  snapshotTourAggregateCaches,
  type TourAggregateCacheSnapshot,
} from '@/lib/tour-cache-updates';
import type { CommissionPayment, Shopping, Tour } from '@/types/tour';

type PaymentInput = Omit<CommissionPayment, 'id' | 'tourShoppingId'>;
type PatchShopping = (shopping: Shopping) => Shopping;

interface CacheSnapshot extends TourAggregateCacheSnapshot {
  optimisticPaymentId?: string;
}

const recomputeUnpaidFlag = (shoppings: Shopping[]) => {
  const info = getShoppingCommissionInfo(shoppings);
  return info.hasShoppings && !info.allPaid;
};

const patchTourShoppings = (tour: Tour, patchShopping: PatchShopping): Tour => {
  let changed = false;
  const shoppings = (tour.shoppings || []).map((shopping) => {
    const nextShopping = patchShopping(shopping);
    if (nextShopping !== shopping) changed = true;
    return nextShopping;
  });
  return changed ? { ...tour, shoppings, hasUnpaidCommission: recomputeUnpaidFlag(shoppings) } : tour;
};

const patchCommissionCaches = (
  queryClient: QueryClient,
  tourId: string,
  patchShopping: PatchShopping,
) => {
  patchTourInAggregateCaches(queryClient, tourId, (current) => patchTourShoppings(current, patchShopping));
};

const snapshotCommissionCaches = async (queryClient: QueryClient, tourId?: string): Promise<CacheSnapshot> => {
  return snapshotTourAggregateCaches(queryClient, tourId);
};

const restoreCommissionCaches = (queryClient: QueryClient, tourId: string | undefined, snapshot?: CacheSnapshot) => {
  restoreTourAggregateCaches(queryClient, tourId, snapshot);
};

const invalidateCommissionCaches = (queryClient: QueryClient, tourId?: string) => {
  if (tourId) queryClient.invalidateQueries({ queryKey: ['tour', tourId], refetchType: 'none' });
  void invalidateTourAggregateCaches(queryClient, 'none');
};

export function useShoppingCommissionMutations(tourId?: string) {
  const queryClient = useQueryClient();

  const addPaymentMutation = useMutation<
    CommissionPayment,
    Error,
    { shopping: Shopping; payment: PaymentInput },
    CacheSnapshot
  >({
    mutationFn: async ({ shopping, payment }) => {
      if (!shopping.id) throw new Error('Chỉ thêm thanh toán sau khi mục mua sắm đã được lưu.');
      return store.addCommissionPayment({ ...payment, tourShoppingId: shopping.id });
    },
    onMutate: async ({ shopping, payment }) => {
      const snapshot = await snapshotCommissionCaches(queryClient, tourId);
      if (!tourId || !shopping.id) return snapshot;
      const optimisticPaymentId = `optimistic-${Date.now()}`;
      const optimisticPayment: CommissionPayment = { ...payment, id: optimisticPaymentId, tourShoppingId: shopping.id };
      patchCommissionCaches(queryClient, tourId, (current) =>
        current.id === shopping.id
          ? withComputedCommissionStatus({ ...current, payments: [...(current.payments || []), optimisticPayment] })
          : current
      );
      return { ...snapshot, optimisticPaymentId };
    },
    onSuccess: (createdPayment, { shopping }, snapshot) => {
      if (!tourId || !shopping.id || !snapshot?.optimisticPaymentId) return;
      patchCommissionCaches(queryClient, tourId, (current) =>
        current.id === shopping.id
          ? withComputedCommissionStatus({
              ...current,
              payments: (current.payments || []).map((payment) =>
                payment.id === snapshot.optimisticPaymentId ? createdPayment : payment
              ),
            })
          : current
      );
      toast.success('Đã thêm khoản nhận hoa hồng');
    },
    onError: (error, _variables, snapshot) => {
      restoreCommissionCaches(queryClient, tourId, snapshot);
      toast.error(error.message);
    },
    onSettled: () => invalidateCommissionCaches(queryClient, tourId),
  });

  const deletePaymentMutation = useMutation<void, Error, string, CacheSnapshot>({
    mutationFn: (id: string) => store.deleteCommissionPayment(id),
    onMutate: async (id) => {
      const snapshot = await snapshotCommissionCaches(queryClient, tourId);
      if (!tourId) return snapshot;
      patchCommissionCaches(queryClient, tourId, (shopping) => {
        const payments = shopping.payments || [];
        if (!payments.some((payment) => payment.id === id)) return shopping;
        return withComputedCommissionStatus({ ...shopping, payments: payments.filter((payment) => payment.id !== id) });
      });
      return snapshot;
    },
    onSuccess: () => toast.success('Đã xóa khoản nhận hoa hồng'),
    onError: (error, _id, snapshot) => {
      restoreCommissionCaches(queryClient, tourId, snapshot);
      toast.error(error.message);
    },
    onSettled: () => invalidateCommissionCaches(queryClient, tourId),
  });

  const clearPaymentsMutation = useMutation<void, Error, Shopping, CacheSnapshot>({
    mutationFn: async (shopping) => {
      const ids = (shopping.payments || []).map((payment) => payment.id).filter((id): id is string => Boolean(id));
      await Promise.all(ids.map((id) => store.deleteCommissionPayment(id)));
    },
    onMutate: async (shopping) => {
      const snapshot = await snapshotCommissionCaches(queryClient, tourId);
      if (!tourId || !shopping.id) return snapshot;
      patchCommissionCaches(queryClient, tourId, (current) =>
        current.id === shopping.id ? withComputedCommissionStatus({ ...current, payments: [] }) : current
      );
      return snapshot;
    },
    onSuccess: () => toast.success('Đã bỏ ghi nhận hoa hồng'),
    onError: (error, _shopping, snapshot) => {
      restoreCommissionCaches(queryClient, tourId, snapshot);
      toast.error(error.message);
    },
    onSettled: () => invalidateCommissionCaches(queryClient, tourId),
  });

  return { addPaymentMutation, deletePaymentMutation, clearPaymentsMutation };
}
