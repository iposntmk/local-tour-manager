import { describe, it, expect } from 'vitest';
import {
  validateSettlementReady,
  canEditTourData,
  canSubmitTour,
  canReviewTour,
  isTourLocked,
  summarizeLineStatuses,
} from '../settlement-utils';
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
  settlementStatus: 'draft',
  submittedAt: undefined,
  approvedAt: undefined,
  approvedBy: undefined,
  lockedAt: undefined,
  submissionCount: 0,
  paymentStatus: 'pending',
  paymentTotal: 0,
  destinations: [],
  expenses: [],
  meals: [],
  allowances: [],
  shoppings: [],
  summary: {
    totalTabs: 1000000,
    advancePayment: 0,
    finalTotal: 1000000,
  },
  ...overrides,
});

describe('validateSettlementReady', () => {
  it('passes for a complete tour', () => {
    const result = validateSettlementReady(baseTour());
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('fails when tourCode is empty', () => {
    const result = validateSettlementReady(baseTour({ tourCode: '' }));
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('mã tour'))).toBe(true);
  });

  it('fails when no guests', () => {
    const result = validateSettlementReady(baseTour({ adults: 0, children: 0, totalGuests: 0 }));
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('1 khách'))).toBe(true);
  });

  it('fails when totalTabs is zero', () => {
    const result = validateSettlementReady(baseTour({ summary: { totalTabs: 0 } }));
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('Tổng tabs'))).toBe(true);
  });

  it('detects expense lines missing name', () => {
    const result = validateSettlementReady(
      baseTour({
        expenses: [{ name: '', price: 100000, date: '2026-05-10' }],
      })
    );
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('chi phí'))).toBe(true);
  });
});

describe('settlement transition helpers', () => {
  it('canEditTourData is true for draft and need_changes', () => {
    expect(canEditTourData(baseTour({ settlementStatus: 'draft' }))).toBe(true);
    expect(canEditTourData(baseTour({ settlementStatus: 'need_changes' }))).toBe(true);
    expect(canEditTourData(baseTour({ settlementStatus: 'submitted' }))).toBe(false);
    expect(canEditTourData(baseTour({ settlementStatus: 'approved' }))).toBe(false);
    expect(canEditTourData(baseTour({ settlementStatus: 'closed' }))).toBe(false);
  });

  it('canSubmitTour matches canEditTourData scope', () => {
    expect(canSubmitTour(baseTour({ settlementStatus: 'draft' }))).toBe(true);
    expect(canSubmitTour(baseTour({ settlementStatus: 'submitted' }))).toBe(false);
  });

  it('canReviewTour is only true when submitted', () => {
    expect(canReviewTour(baseTour({ settlementStatus: 'submitted' }))).toBe(true);
    expect(canReviewTour(baseTour({ settlementStatus: 'draft' }))).toBe(false);
    expect(canReviewTour(baseTour({ settlementStatus: 'need_changes' }))).toBe(false);
  });

  it('isTourLocked is true when approved or closed', () => {
    expect(isTourLocked(baseTour({ settlementStatus: 'approved' }))).toBe(true);
    expect(isTourLocked(baseTour({ settlementStatus: 'closed' }))).toBe(true);
    expect(isTourLocked(baseTour({ settlementStatus: 'draft' }))).toBe(false);
  });
});

describe('summarizeLineStatuses', () => {
  it('counts statuses across all line collections', () => {
    const tour = baseTour({
      destinations: [{ name: 'D1', price: 0, date: '2026-05-10', lineStatus: 'valid' }],
      expenses: [
        { name: 'E1', price: 0, date: '2026-05-10', lineStatus: 'need_more' },
        { name: 'E2', price: 0, date: '2026-05-10', lineStatus: 'invalid' },
      ],
      meals: [{ name: 'M1', price: 0, date: '2026-05-10' }],
    });
    const counts = summarizeLineStatuses(tour);
    expect(counts.valid).toBe(1);
    expect(counts.need_more).toBe(1);
    expect(counts.invalid).toBe(1);
    expect(counts.unchecked).toBe(1);
  });
});
