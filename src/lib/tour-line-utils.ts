import type { Allowance, Destination, Expense, Meal, Tour } from '@/types/tour';
import { getExpenseGuestCount, getExpenseLineTotal, isWaterExpense } from '@/lib/water-expense-utils';

export type CostLine = Destination | Expense | Meal;
export type SummaryReviewLine = CostLine | Allowance;

export const getLineGuests = (line: CostLine, tourGuests: number): number => {
  if (isWaterExpense(line)) return getExpenseGuestCount(line, tourGuests);
  if (typeof line.guests === 'number') return line.guests;
  return tourGuests || 0;
};

export const getLineTotal = (line: CostLine, tourGuests: number): number => {
  if (isWaterExpense(line)) return getExpenseLineTotal(line, tourGuests);
  return (Number(line.price) || 0) * getLineGuests(line, tourGuests);
};

export const getSuggestedVatAmount = (line: CostLine, tourGuests: number, vatRate: number): number =>
  Math.round((getLineTotal(line, tourGuests) * (Number(vatRate) || 0)) / 100);

export const isVatAmountValid = (line: CostLine, tourGuests: number): boolean =>
  (Number(line.vatAmount) || 0) <= getLineTotal(line, tourGuests);

export const hasLineAttachments = (line: CostLine, pendingFiles: File[] = []): boolean =>
  (line.attachments?.length || 0) + pendingFiles.length > 0;

export const getReviewableSettlementLines = (tour: Tour): SummaryReviewLine[] => [
  ...(tour.destinations || []),
  ...(tour.expenses || []),
  ...(tour.meals || []),
  ...(tour.allowances || []),
];

export const areAllSettlementLinesApproved = (tour: Tour): boolean => {
  const lines = getReviewableSettlementLines(tour);
  return lines.length > 0 && lines.every((line) => (line.lineStatus || 'unchecked') === 'valid');
};

export const hasSettlementLinesNeedingFix = (tour: Tour): boolean =>
  getReviewableSettlementLines(tour).some((line) => {
    const status = line.lineStatus || 'unchecked';
    return status === 'need_more' || status === 'invalid';
  });
