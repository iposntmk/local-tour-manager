import type { CommissionStatus } from '@/types/master';
import type { Shopping } from '@/types/tour';

export interface ShoppingCommissionInfo {
  hasShoppings: boolean;
  allPaid: boolean;
  unpaidItems: { name: string; remaining: number }[];
}

export const getNetCommission = (shopping: Shopping) =>
  shopping.netCommission ?? Math.max(0, shopping.price - (shopping.pitAmount || 0));

export const getPaidTotal = (shopping: Shopping) =>
  (shopping.payments || []).reduce((sum, payment) => sum + payment.amount, 0);

export const getPaymentRemaining = (shopping: Shopping) =>
  Math.max(0, getNetCommission(shopping) - getPaidTotal(shopping));

export const isFullyReceived = (shopping: Shopping) =>
  getPaymentRemaining(shopping) <= 0 && (shopping.payments || []).length > 0;

export const getCommissionStatus = (shopping: Shopping): 'pending' | 'partial' | 'paid' => {
  const payments = shopping.payments || [];
  if (payments.length === 0) return 'pending';
  return getPaidTotal(shopping) >= getNetCommission(shopping) ? 'paid' : 'partial';
};

export const getEffectiveCommissionStatus = (shopping: Shopping): CommissionStatus => {
  if (shopping.payments) return getCommissionStatus(shopping);
  return shopping.commissionStatus || getCommissionStatus(shopping);
};

export const withComputedCommissionStatus = (shopping: Shopping): Shopping => ({
  ...shopping,
  commissionStatus: getCommissionStatus(shopping),
});

export const getCommissionStatusLabel = (shopping: Shopping): string => {
  const status = getEffectiveCommissionStatus(shopping);
  if (status === 'paid') return 'Đã nhận đủ';
  if (status === 'partial') return 'Một phần';
  return 'Chưa nhận';
};

export const getCommissionBadgeVariant = (shopping: Shopping): 'default' | 'secondary' | 'outline' => {
  const status = getEffectiveCommissionStatus(shopping);
  return status === 'paid' ? 'default' : status === 'partial' ? 'secondary' : 'outline';
};

export const getCommissionRowClass = (shopping: Shopping): string => {
  if ((shopping.price ?? 0) === 0) return 'bg-red-100 dark:bg-red-950/60';
  const status = getEffectiveCommissionStatus(shopping);
  if (status === 'paid') return 'bg-emerald-50/80 hover:bg-emerald-50 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/40';
  if (status === 'partial') return 'bg-amber-200 hover:bg-amber-300 text-amber-950 dark:bg-amber-900/60 dark:hover:bg-amber-900/70 dark:text-amber-100';
  return 'bg-red-300 hover:bg-red-400 text-red-950 dark:bg-red-800/80 dark:hover:bg-red-800 dark:text-red-100';
};

export const getCommissionCardClass = (shopping: Shopping): string => {
  if ((shopping.price ?? 0) === 0) return 'border-red-200 bg-red-50 dark:bg-red-950/30';
  const status = getEffectiveCommissionStatus(shopping);
  if (status === 'paid') return 'border-emerald-200 bg-emerald-50/80 dark:bg-emerald-950/30';
  if (status === 'partial') return 'border-amber-300 bg-amber-100 dark:bg-amber-900/40';
  return 'border-red-300 bg-red-100 dark:bg-red-800/50';
};

export const getShoppingCommissionInfo = (shoppings: Shopping[] = []): ShoppingCommissionInfo => {
  const withCommission = shoppings.filter((shopping) => getNetCommission(shopping) > 0);
  if (withCommission.length === 0) return { hasShoppings: false, allPaid: true, unpaidItems: [] };

  const unpaidItems = withCommission
    .map((shopping) => ({
      name: shopping.name || 'Không tên',
      remaining: getPaymentRemaining(shopping),
    }))
    .filter((item) => item.remaining > 0);

  return { hasShoppings: true, allPaid: unpaidItems.length === 0, unpaidItems };
};

export const getUnpaidCommissionShoppingNames = (shoppings: Shopping[] = []) =>
  getShoppingCommissionInfo(shoppings).unpaidItems.map((item) => item.name);
