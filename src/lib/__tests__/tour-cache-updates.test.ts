import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import {
  patchTourPaymentRowsInCache,
  patchTourSettlementStatusInCache,
  restoreTourAggregateCaches,
  snapshotTourAggregateCaches,
} from '../tour-cache-updates';
import type { Tour, TourListResult, TourPayment } from '@/types/tour';

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const baseTour = (overrides: Partial<Tour> = {}): Tour => ({
  id: 't1',
  tourCode: 'T-001',
  companyRef: { id: 'c1', nameAtBooking: 'Co A' },
  guideRef: { id: 'g1', nameAtBooking: 'Guide A' },
  clientNationalityRef: { id: 'n1', nameAtBooking: 'VN' },
  clientNationalities: [{ id: 'n1', nameAtBooking: 'VN', paxCount: 2 }],
  clientName: 'Khach A',
  adults: 2,
  children: 0,
  totalGuests: 2,
  driverName: '',
  clientPhone: '',
  startDate: '2026-05-10',
  endDate: '2026-05-12',
  totalDays: 3,
  createdAt: '2026-05-01',
  updatedAt: '2026-05-01',
  settlementStatus: 'approved',
  submissionCount: 1,
  paymentStatus: 'pending',
  paymentTotal: 0,
  destinations: [],
  expenses: [],
  meals: [],
  allowances: [],
  shoppings: [],
  summary: { totalTabs: 1_000_000, finalTotal: 1_000_000 },
  ...overrides,
});

const basePayment = (overrides: Partial<TourPayment> = {}): TourPayment => ({
  id: 'p1',
  tourId: 't1',
  amount: 1_000_000,
  method: 'bank_transfer',
  paidAt: '2026-05-20T12:00:00.000Z',
  ...overrides,
});

const seedTourCaches = (client: QueryClient, tour: Tour) => {
  const listResult: TourListResult = { tours: [tour], total: 1 };
  client.setQueryData(['tour', tour.id], tour);
  client.setQueryData(['tours', { sortBy: 'startDate' }], listResult);
};

describe('tour-cache-updates', () => {
  it('patches payment status in both tour detail and tour list caches', () => {
    const client = createQueryClient();
    seedTourCaches(client, baseTour({ payments: [] }));

    patchTourPaymentRowsInCache(client, 't1', [basePayment()]);

    expect(client.getQueryData<Tour>(['tour', 't1'])?.paymentStatus).toBe('paid');
    const list = client.getQueryData<TourListResult>(['tours', { sortBy: 'startDate' }]);
    expect(list?.tours[0].paymentStatus).toBe('paid');
    expect(list?.tours[0].paymentTotal).toBe(1_000_000);
  });

  it('resets payment cache when reopening an approved tour', () => {
    const client = createQueryClient();
    seedTourCaches(client, baseTour({
      payments: [basePayment()],
      paymentStatus: 'paid',
      paymentTotal: 1_000_000,
      lastPaidAt: '2026-05-20T12:00:00.000Z',
      lastPaymentMethod: 'bank_transfer',
    }));

    patchTourSettlementStatusInCache(client, 't1', 'draft');

    const detail = client.getQueryData<Tour>(['tour', 't1']);
    const list = client.getQueryData<TourListResult>(['tours', { sortBy: 'startDate' }]);
    expect(detail?.settlementStatus).toBe('draft');
    expect(detail?.paymentStatus).toBe('pending');
    expect(detail?.paymentTotal).toBe(0);
    expect(detail?.payments).toEqual([]);
    expect(list?.tours[0].paymentStatus).toBe('pending');
  });

  it('restores aggregate cache snapshots on rollback', async () => {
    const client = createQueryClient();
    seedTourCaches(client, baseTour({ settlementStatus: 'submitted' }));
    const snapshot = await snapshotTourAggregateCaches(client, 't1');

    patchTourSettlementStatusInCache(client, 't1', 'approved');
    restoreTourAggregateCaches(client, 't1', snapshot);

    expect(client.getQueryData<Tour>(['tour', 't1'])?.settlementStatus).toBe('submitted');
    const list = client.getQueryData<TourListResult>(['tours', { sortBy: 'startDate' }]);
    expect(list?.tours[0].settlementStatus).toBe('submitted');
  });
});
