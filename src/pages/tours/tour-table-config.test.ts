import { describe, expect, it } from 'vitest';
import { getTourWarningInfo } from './tour-table-config';
import type { Tour } from '@/types/tour';

const baseTour = (patch: Partial<Tour>): Tour => ({
  id: 'tour-1',
  tourCode: 'T-001',
  companyRef: { id: 'company-1', nameAtBooking: 'Company' },
  guideRef: { id: 'guide-1', nameAtBooking: 'Guide' },
  clientNationalityRef: { id: 'nat-1', nameAtBooking: 'VN' },
  clientNationalities: [],
  clientName: 'Client',
  adults: 1,
  children: 0,
  totalGuests: 1,
  driverName: '',
  clientPhone: '',
  startDate: '2026-06-14',
  endDate: '2026-06-14',
  totalDays: 1,
  createdAt: '2026-06-14',
  updatedAt: '2026-06-14',
  settlementStatus: 'draft',
  submissionCount: 0,
  paymentStatus: 'pending',
  paymentTotal: 0,
  destinations: [],
  expenses: [],
  meals: [],
  allowances: [],
  shoppings: [],
  summary: { totalTabs: 0 },
  waterExpenseDismissed: true,
  hasZeroPrice: false,
  hasDuplicateDestNames: false,
  missingWaterExpense: false,
  hasUnpaidCommission: false,
  ...patch,
});

describe('tour table warning info', () => {
  it('trusts fetched shopping payment rows over a stale unpaid commission flag', () => {
    const warningInfo = getTourWarningInfo(baseTour({
      hasUnpaidCommission: true,
      shoppings: [{
        id: 'shopping-1',
        name: 'Cua hang',
        price: 1_000_000,
        date: '2026-06-14',
        netCommission: 900_000,
        payments: [{ amount: 900_000, paymentMethod: 'cash', paidAt: '2026-06-14' }],
      }],
    }));

    expect(warningInfo.hasUnpaidCommission).toBe(false);
    expect(warningInfo.showRedFlag).toBe(false);
  });
});
