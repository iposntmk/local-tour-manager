import { describe, expect, it } from 'vitest';
import {
  getEffectiveCommissionStatus,
  getShoppingCommissionInfo,
  withComputedCommissionStatus,
} from '@/lib/shopping-commission-utils';
import type { Shopping } from '@/types/tour';

const shopping = (patch: Partial<Shopping>): Shopping => ({
  name: 'Cua hang',
  price: 1_000_000,
  date: '2026-06-14',
  netCommission: 900_000,
  ...patch,
});

describe('shopping commission utils', () => {
  it('uses payment rows over a stale commissionStatus', () => {
    const paidShopping = shopping({
      commissionStatus: 'pending',
      payments: [{ amount: 900_000, paymentMethod: 'cash', paidAt: '2026-06-14' }],
    });

    expect(getEffectiveCommissionStatus(paidShopping)).toBe('paid');
    expect(withComputedCommissionStatus(paidShopping).commissionStatus).toBe('paid');
  });

  it('summarizes unpaid shopping commission rows', () => {
    const info = getShoppingCommissionInfo([
      shopping({ name: 'Paid', payments: [{ amount: 900_000, paymentMethod: 'cash', paidAt: '2026-06-14' }] }),
      shopping({ name: 'Missing', payments: [{ amount: 300_000, paymentMethod: 'cash', paidAt: '2026-06-14' }] }),
    ]);

    expect(info.hasShoppings).toBe(true);
    expect(info.allPaid).toBe(false);
    expect(info.unpaidItems).toEqual([{ name: 'Missing', remaining: 600_000 }]);
  });
});
