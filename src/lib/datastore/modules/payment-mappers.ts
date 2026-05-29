import type { PaymentMethod, TourPayment, CommissionPayment, Shopping as TourShopping } from '@/types/tour';
import type { TourPaymentRow, CommissionPaymentRow, TourShoppingRow } from './store-types';
import { mapLineReviewFields } from './line-review-mapper';

export function mapTourPayment(row: TourPaymentRow): TourPayment {
  return {
    id: row.id,
    tourId: row.tour_id,
    amount: Number(row.amount) || 0,
    method: (row.payment_method as PaymentMethod) || 'cash',
    paidAt: row.paid_at,
    paidBy: row.paid_by ?? undefined,
    note: row.note ?? undefined,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function mapCommissionPayment(row: CommissionPaymentRow): CommissionPayment {
  return {
    id: row.id,
    tourShoppingId: row.tour_shopping_id,
    amount: Number(row.amount) || 0,
    paymentMethod: (row.payment_method as PaymentMethod) || 'cash',
    paidAt: row.paid_at,
    note: row.note ?? undefined,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function getCommissionStatus(
  netCommission: number,
  payments: Array<Pick<CommissionPayment, 'amount'>>
): 'pending' | 'partial' | 'paid' {
  const paidAmount = payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
  if (paidAmount <= 0) return 'pending';
  return paidAmount >= netCommission ? 'paid' : 'partial';
}

export function mapTourShopping(
  row: TourShoppingRow & { shopping_commission_payments?: CommissionPaymentRow[] | null }
): TourShopping {
  const payments = (row.shopping_commission_payments || []).map((payment) => mapCommissionPayment(payment));
  const netCommission = row.net_commission !== null && row.net_commission !== undefined
    ? Number(row.net_commission)
    : undefined;
  const commissionBase = netCommission ?? (Number(row.price) || 0);

  return {
    id: row.id,
    name: row.name,
    price: Number(row.price) || 0,
    date: row.date,
    withholdsPit: row.withholds_pit ?? false,
    pitRate: row.pit_rate ?? undefined,
    pitAmount: row.pit_amount ?? undefined,
    netCommission,
    payments,
    commissionStatus: getCommissionStatus(commissionBase, payments),
    ...mapLineReviewFields(row),
  };
}
