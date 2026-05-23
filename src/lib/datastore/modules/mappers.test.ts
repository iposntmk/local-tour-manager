import { describe, expect, it } from 'vitest';
import { getCommissionStatus, mapTourShopping } from './mappers';

describe('shopping commission mapping', () => {
  it('computes commission status from payments and net commission', () => {
    expect(getCommissionStatus(1_000_000, [])).toBe('pending');
    expect(getCommissionStatus(1_000_000, [{ amount: 400_000, paymentMethod: 'cash', paidAt: '2026-05-01' }])).toBe('partial');
    expect(getCommissionStatus(1_000_000, [{ amount: 1_000_000, paymentMethod: 'bank_transfer', paidAt: '2026-05-01' }])).toBe('paid');
  });

  it('maps tax, net commission and payment status for tour shopping rows', () => {
    const shopping = mapTourShopping({
      id: 'ts1',
      tour_id: 't1',
      name: 'Cua hang',
      price: 1_000_000,
      date: '2026-05-01',
      withholds_pit: true,
      pit_rate: 0.1,
      pit_amount: 100_000,
      net_commission: 900_000,
      line_status: 'unchecked',
      line_comment: null,
      reviewed_by: null,
      reviewed_at: null,
      created_at: null,
      updated_at: null,
      shopping_commission_payments: [
        {
          id: 'p1',
          tour_shopping_id: 'ts1',
          amount: 450_000,
          payment_method: 'cash',
          paid_at: '2026-05-01',
          note: null,
          created_at: null,
          updated_at: null,
        },
      ],
    });

    expect(shopping.pitAmount).toBe(100_000);
    expect(shopping.netCommission).toBe(900_000);
    expect(shopping.payments).toHaveLength(1);
    expect(shopping.commissionStatus).toBe('partial');
  });
});
