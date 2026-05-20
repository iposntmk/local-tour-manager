import { describe, it, expect } from 'vitest';
import {
  canEditPayment,
  canRecordPayment,
  computePaymentRemaining,
  formatPaymentMethod,
  getPaymentStatusLabel,
  getTourFinalTotal,
  hasAnyPayment,
  isTourPaymentEligible,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
} from '../payment-utils';
import type { Tour } from '@/types/tour';

const baseTour = (overrides: Partial<Tour> = {}): Tour => ({
  id: 't1',
  tourCode: 'T-001',
  companyRef: { id: 'c1', nameAtBooking: 'Co A' },
  guideRef: { id: 'g1', nameAtBooking: 'Guide A' },
  clientNationalityRef: { id: 'n1', nameAtBooking: 'VN' },
  clientNationalities: [{ id: 'n1', nameAtBooking: 'VN', paxCount: 2 }],
  clientName: 'Khách A',
  adults: 2,
  children: 0,
  totalGuests: 2,
  driverName: '',
  clientPhone: '',
  startDate: '2026-05-10',
  endDate: '2026-05-12',
  totalDays: 3,
  notes: '',
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
  summary: {
    totalTabs: 1_000_000,
    finalTotal: 1_000_000,
  },
  ...overrides,
});

describe('payment-utils labels', () => {
  it('exports a label for each payment status', () => {
    expect(PAYMENT_STATUS_LABELS.pending).toBeTruthy();
    expect(PAYMENT_STATUS_LABELS.partial).toBeTruthy();
    expect(PAYMENT_STATUS_LABELS.paid).toBeTruthy();
  });

  it('exports a label for each payment method', () => {
    expect(PAYMENT_METHOD_LABELS.cash).toBeTruthy();
    expect(PAYMENT_METHOD_LABELS.bank_transfer).toBeTruthy();
  });

  it('getPaymentStatusLabel returns the mapped label', () => {
    expect(getPaymentStatusLabel('partial')).toBe(PAYMENT_STATUS_LABELS.partial);
  });

  it('formatPaymentMethod handles falsy method', () => {
    expect(formatPaymentMethod(undefined)).toBe('');
    expect(formatPaymentMethod(null as any)).toBe('');
    expect(formatPaymentMethod('cash')).toBe(PAYMENT_METHOD_LABELS.cash);
  });
});

describe('getTourFinalTotal', () => {
  it('prefers finalTotal when present', () => {
    expect(getTourFinalTotal(baseTour({ summary: { totalTabs: 100, finalTotal: 200 } }))).toBe(200);
  });

  it('falls back to totalTabs when finalTotal is missing', () => {
    expect(getTourFinalTotal(baseTour({ summary: { totalTabs: 100 } }))).toBe(100);
  });

  it('returns 0 when summary is empty', () => {
    expect(getTourFinalTotal({ summary: {} as any })).toBe(0);
  });
});

describe('computePaymentRemaining', () => {
  it('returns the full total when nothing paid', () => {
    expect(computePaymentRemaining(baseTour({ paymentTotal: 0 }))).toBe(1_000_000);
  });

  it('returns 0 when paid >= total', () => {
    expect(computePaymentRemaining(baseTour({ paymentTotal: 1_000_000 }))).toBe(0);
    expect(computePaymentRemaining(baseTour({ paymentTotal: 1_500_000 }))).toBe(0);
  });

  it('returns the difference for partial payments', () => {
    expect(computePaymentRemaining(baseTour({ paymentTotal: 400_000 }))).toBe(600_000);
  });
});

describe('isTourPaymentEligible', () => {
  it('is true for approved and closed', () => {
    expect(isTourPaymentEligible({ settlementStatus: 'approved' })).toBe(true);
    expect(isTourPaymentEligible({ settlementStatus: 'closed' })).toBe(true);
  });

  it('is false for other statuses', () => {
    expect(isTourPaymentEligible({ settlementStatus: 'draft' })).toBe(false);
    expect(isTourPaymentEligible({ settlementStatus: 'submitted' })).toBe(false);
    expect(isTourPaymentEligible({ settlementStatus: 'need_changes' })).toBe(false);
  });
});

describe('canRecordPayment', () => {
  it('requires the permission', () => {
    const tour = baseTour();
    expect(canRecordPayment(tour, false)).toBe(false);
    expect(canRecordPayment(tour, true)).toBe(true);
  });

  it('rejects unsettled tours', () => {
    expect(canRecordPayment(baseTour({ settlementStatus: 'draft' }), true)).toBe(false);
    expect(canRecordPayment(baseTour({ settlementStatus: 'submitted' }), true)).toBe(false);
  });

  it('rejects fully-paid tours', () => {
    expect(canRecordPayment(baseTour({ paymentStatus: 'paid' }), true)).toBe(false);
  });

  it('allows partial state', () => {
    expect(canRecordPayment(baseTour({ paymentStatus: 'partial' }), true)).toBe(true);
  });
});

describe('canEditPayment', () => {
  it('requires the permission and an eligible tour', () => {
    expect(canEditPayment(baseTour(), false)).toBe(false);
    expect(canEditPayment(baseTour({ settlementStatus: 'draft' }), true)).toBe(false);
    expect(canEditPayment(baseTour({ settlementStatus: 'approved' }), true)).toBe(true);
    expect(canEditPayment(baseTour({ settlementStatus: 'closed' }), true)).toBe(true);
  });

  it('allows editing even when paid (e.g. to correct method/amount)', () => {
    expect(canEditPayment(baseTour({ paymentStatus: 'paid' }), true)).toBe(true);
  });
});

describe('hasAnyPayment', () => {
  it('is true when paymentTotal > 0', () => {
    expect(hasAnyPayment({ paymentTotal: 1 })).toBe(true);
  });
  it('is false when paymentTotal is 0 or falsy', () => {
    expect(hasAnyPayment({ paymentTotal: 0 })).toBe(false);
    expect(hasAnyPayment({ paymentTotal: undefined as any })).toBe(false);
  });
});
