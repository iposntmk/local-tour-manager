import type { Shopping } from '@/types/tour';

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

export const getCommissionStatusLabel = (shopping: Shopping): string => {
  const status = shopping.commissionStatus || getCommissionStatus(shopping);
  if (status === 'paid') return 'Đã nhận đủ';
  if (status === 'partial') return 'Một phần';
  return 'Chưa nhận';
};

export const getCommissionBadgeVariant = (shopping: Shopping): 'default' | 'secondary' | 'outline' => {
  const status = shopping.commissionStatus || getCommissionStatus(shopping);
  return status === 'paid' ? 'default' : status === 'partial' ? 'secondary' : 'outline';
};

export const getCommissionRowClass = (shopping: Shopping): string => {
  if ((shopping.price ?? 0) === 0) return 'bg-red-100 dark:bg-red-950/60';
  const status = shopping.commissionStatus || getCommissionStatus(shopping);
  if (status === 'paid') return 'bg-emerald-50/80 hover:bg-emerald-50 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/40';
  if (status === 'partial') return 'bg-amber-200 hover:bg-amber-300 text-amber-950 dark:bg-amber-900/60 dark:hover:bg-amber-900/70 dark:text-amber-100';
  return 'bg-red-300 hover:bg-red-400 text-red-950 dark:bg-red-800/80 dark:hover:bg-red-800 dark:text-red-100';
};
