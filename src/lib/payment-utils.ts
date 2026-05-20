import type { Tour, PaymentMethod, PaymentStatus } from '@/types/tour';

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Chờ thanh toán',
  partial: 'Thanh toán một phần',
  paid: 'Đã thanh toán',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Tiền mặt',
  bank_transfer: 'Chuyển khoản',
};

export function formatPaymentMethod(method?: PaymentMethod | null): string {
  if (!method) return '';
  return PAYMENT_METHOD_LABELS[method] || method;
}

export function getPaymentStatusLabel(status: PaymentStatus): string {
  return PAYMENT_STATUS_LABELS[status] || status;
}

export function getTourFinalTotal(tour: Pick<Tour, 'summary'>): number {
  const finalTotal = tour.summary?.finalTotal;
  if (typeof finalTotal === 'number' && !Number.isNaN(finalTotal)) return finalTotal;
  return tour.summary?.totalTabs ?? 0;
}

export function computePaymentRemaining(
  tour: Pick<Tour, 'summary' | 'paymentTotal'>
): number {
  const total = getTourFinalTotal(tour);
  const paid = Number(tour.paymentTotal) || 0;
  return Math.max(0, total - paid);
}

export function isTourPaymentEligible(
  tour: Pick<Tour, 'settlementStatus'>
): boolean {
  return tour.settlementStatus === 'approved' || tour.settlementStatus === 'closed';
}

export function canRecordPayment(
  tour: Pick<Tour, 'settlementStatus' | 'paymentStatus'>,
  hasMarkPaidPermission: boolean
): boolean {
  if (!hasMarkPaidPermission) return false;
  if (!isTourPaymentEligible(tour)) return false;
  return tour.paymentStatus !== 'paid';
}

export function canEditPayment(
  tour: Pick<Tour, 'settlementStatus'>,
  hasMarkPaidPermission: boolean
): boolean {
  if (!hasMarkPaidPermission) return false;
  return isTourPaymentEligible(tour);
}

export function hasAnyPayment(tour: Pick<Tour, 'paymentTotal'>): boolean {
  return (Number(tour.paymentTotal) || 0) > 0;
}
