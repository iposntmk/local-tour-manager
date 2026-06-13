import { getLineGuests, getLineTotal } from '@/lib/tour-line-utils';
import type {
  Allowance,
  AttachmentLineType,
  Destination,
  Expense,
  LineStatus,
  Meal,
  Tour,
} from '@/types/tour';

export type SummaryLineType = AttachmentLineType | 'allowance';
export type ReviewLine = Destination | Meal | Expense | Allowance;

export interface SummaryLineGroup {
  title: string;
  lineType: SummaryLineType;
  className: string;
  rows: Array<{ line: ReviewLine; index: number }>;
}

export interface FilteredSummaryLineGroup extends SummaryLineGroup {
  filteredRows: Array<{ line: ReviewLine; index: number }>;
}

export type StatusFilter = 'hide_approved' | 'all' | 'approved' | 'pending' | 'invalid';

export const SUMMARY_STATUS_LABELS: Partial<Record<LineStatus, string>> = {
  valid: 'Đã duyệt',
  need_more: 'Chưa đúng',
  invalid: 'Chưa đúng',
};

export const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'hide_approved', label: 'Chưa xong' },
  { value: 'all', label: 'Tất cả' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'pending', label: 'Chưa duyệt' },
  { value: 'invalid', label: 'Chưa đúng' },
];

export const buildGroups = (tour: Tour): SummaryLineGroup[] => [
  { title: 'Điểm đến (vé)', lineType: 'destination', className: 'bg-sky-50 text-sky-900 dark:bg-sky-950 dark:text-sky-100', rows: (tour.destinations || []).map((line, index) => ({ line, index })) },
  { title: 'Ăn', lineType: 'meal', className: 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100', rows: (tour.meals || []).map((line, index) => ({ line, index })) },
  { title: 'Dịch vụ / Chi phí', lineType: 'expense', className: 'bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100', rows: (tour.expenses || []).map((line, index) => ({ line, index })) },
  { title: 'Công tác phí', lineType: 'allowance', className: 'bg-violet-50 text-violet-900 dark:bg-violet-950 dark:text-violet-100', rows: (tour.allowances || []).map((line, index) => ({ line, index })) },
];

export const isAttachmentLineType = (lineType: SummaryLineType): lineType is AttachmentLineType =>
  lineType === 'destination' || lineType === 'meal' || lineType === 'expense';

export const getQuantity = (line: ReviewLine, tourGuests: number) =>
  'quantity' in line ? (line.quantity || 1) : getLineGuests(line, tourGuests);

export const getTotal = (line: ReviewLine, tourGuests: number) =>
  'quantity' in line ? line.price * (line.quantity || 1) : getLineTotal(line, tourGuests);
