import type { Allowance, Destination, Expense, Meal, Shopping as TourShopping } from '@/types/tour';
import { buildLineWritePayload } from './tour-line-mappers';

/**
 * Payload chèn hàng loạt cho các bảng con của tour.
 *
 * Import/tạo tour trước đây gọi `add*` cho từng dòng, mà mỗi `add*` lại kéo theo
 * `recalculateTourSummary` (đọc full tour + ghi lại) → 4 request cho MỘT dòng.
 * Ở đây mỗi bảng chỉ 1 request, tổng kết tính một lần duy nhất ở cuối.
 */
export type TourBulkLines = {
  destinations?: Destination[];
  expenses?: Expense[];
  meals?: Meal[];
  allowances?: Allowance[];
  shoppings?: TourShopping[];
};

export const buildDestinationRows = (tourId: string, lines: Destination[]) =>
  lines.map((line) => ({ tour_id: tourId, ...buildLineWritePayload(line) }));

export const buildExpenseRows = (tourId: string, lines: Expense[]) =>
  lines.map((line) => ({ tour_id: tourId, ...buildLineWritePayload(line) }));

export const buildMealRows = (tourId: string, lines: Meal[]) =>
  lines.map((line) => ({ tour_id: tourId, ...buildLineWritePayload(line) }));

export const buildAllowanceRows = (tourId: string, lines: Allowance[]) =>
  lines.map((line) => ({
    tour_id: tourId,
    date: line.date,
    name: line.name,
    price: line.price,
    quantity: line.quantity || 1,
    category_id: line.categoryId ?? null,
  }));

export const buildShoppingRows = (tourId: string, lines: TourShopping[]) =>
  lines.map((line) => ({
    tour_id: tourId,
    name: line.name,
    price: line.price,
    date: line.date,
    withholds_pit: line.withholdsPit ?? null,
    pit_rate: line.pitRate ?? null,
    pit_amount: line.pitAmount ?? null,
    net_commission: line.netCommission ?? null,
  }));

/** Đổi mã lỗi Postgres sang thông báo nêu rõ bảng con nào hỏng. */
export function toBulkInsertError(label: string, error: { code?: string; message?: string }): Error {
  if (error.code === '23503') return new Error(`Invalid tour reference while adding ${label}`);
  if (error.code === '23502') return new Error(`Required ${label} field is missing`);
  if (error.code === '22001') return new Error(`${label} data too long`);
  if (error.code === '22003') return new Error(`Invalid ${label} price`);
  if (error.code === '22007') return new Error(`Invalid ${label} date format`);
  return new Error(`Failed to add ${label}: ${error.message ?? 'unknown error'}`);
}
