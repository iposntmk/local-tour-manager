import { describe, expect, it } from 'vitest';
import type { Tour } from '@/types/tour';
import { filterToursForList, isTourInListFilters } from './tour-list-filters';

const baseFilters = {
  settlementStatusFilter: 'all',
  paymentStatusFilter: 'all',
  nationalityFilter: 'all',
  shoppingCommissionFilter: 'all',
  selectedMonth: 'all',
  selectedYear: 'all',
  hasDateRangeFilter: false,
};

const makeTour = (overrides: Partial<Tour>): Tour => ({
  id: 'tour-1',
  tourCode: 'T-001',
  companyRef: { id: 'company-1', nameAtBooking: 'Company' },
  guideRef: { id: 'guide-1', nameAtBooking: 'Guide' },
  clientNationalityRef: { id: 'vn', nameAtBooking: 'Việt Nam' },
  clientNationalities: [{ id: 'vn', nameAtBooking: 'Việt Nam', paxCount: 1 }],
  clientName: 'Client',
  adults: 1,
  children: 0,
  totalGuests: 1,
  driverName: '',
  clientPhone: '',
  startDate: '2026-03-10',
  endDate: '2026-03-12',
  totalDays: 3,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  settlementStatus: 'approved',
  submissionCount: 0,
  paymentStatus: 'paid',
  paymentTotal: 0,
  destinations: [],
  expenses: [],
  meals: [],
  allowances: [],
  shoppings: [],
  summary: { totalTabs: 0, finalTotal: 0 },
  hasUnpaidCommission: false,
  ...overrides,
});

describe('tour-list-filters', () => {
  it('applies advanced grid filters client-side', () => {
    const matching = makeTour({ id: 'matching' });
    const tours = [
      matching,
      makeTour({ id: 'wrong-status', settlementStatus: 'draft' }),
      makeTour({ id: 'wrong-payment', paymentStatus: 'pending' }),
      makeTour({
        id: 'wrong-nationality',
        clientNationalityRef: { id: 'kr', nameAtBooking: 'Hàn Quốc' },
        clientNationalities: [{ id: 'kr', nameAtBooking: 'Hàn Quốc', paxCount: 1 }],
      }),
      makeTour({ id: 'wrong-commission', hasUnpaidCommission: true }),
      makeTour({ id: 'wrong-year', startDate: '2025-03-10', endDate: '2025-03-12' }),
    ];

    const filtered = filterToursForList(tours, {
      ...baseFilters,
      settlementStatusFilter: 'approved',
      paymentStatusFilter: 'paid',
      nationalityFilter: 'vn',
      shoppingCommissionFilter: 'paid',
      selectedYear: '2026',
    });

    expect(filtered).toEqual([matching]);
  });

  it('supports month-only filtering for displayed rows and export rows', () => {
    const marchTour = makeTour({ id: 'march', startDate: '2026-03-30', endDate: '2026-04-02' });
    const aprilTour = makeTour({ id: 'april', startDate: '2026-04-01', endDate: '2026-04-03' });
    const filters = { ...baseFilters, selectedMonth: '3' };

    expect(filterToursForList([marchTour, aprilTour], filters)).toEqual([marchTour]);
    expect(isTourInListFilters(marchTour, filters)).toBe(true);
    expect(isTourInListFilters(aprilTour, filters)).toBe(false);
  });
});
