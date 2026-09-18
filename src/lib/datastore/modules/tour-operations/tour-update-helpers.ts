import { differenceInDays } from 'date-fns';
import type { Tour, TourNationality } from '@/types/tour';

/**
 * Ảnh chụp nhẹ của tour trước khi update: chỉ các cột cần để quyết định
 * "có thật sự phải chạy nhánh nặng hay không" (đổi mã tour / đổi quốc tịch /
 * đổi số khách / đổi số ngày). Thay cho `getTour()` (join toàn bộ sub-collection).
 */
export type TourUpdateSnapshot = {
  tourCode: string;
  adults: number;
  children: number;
  totalGuests: number;
  totalDays: number;
  startDate: string;
  endDate: string;
  nationalities: TourNationality[];
};

export const TOUR_UPDATE_SNAPSHOT_SELECT =
  'tour_code, adults, children, total_guests, total_days, start_date, end_date, ' +
  'tour_nationalities(nationality_id, nationality_name_at_booking, pax_count)';

export function mapTourUpdateSnapshot(row: any): TourUpdateSnapshot {
  return {
    tourCode: row.tour_code ?? '',
    adults: Number(row.adults) || 0,
    children: Number(row.children) || 0,
    totalGuests: Number(row.total_guests) || 0,
    totalDays: Number(row.total_days) || 0,
    startDate: row.start_date ?? '',
    endDate: row.end_date ?? '',
    nationalities: (row.tour_nationalities || []).map((n: any) => ({
      id: n.nationality_id,
      nameAtBooking: n.nationality_name_at_booking || '',
      paxCount: Number(n.pax_count) || 0,
    })),
  };
}

/** Số khách sau khi áp patch (patch có thể chỉ gửi adults hoặc children). */
export function resolveNextGuests(patch: Partial<Tour>, snapshot: TourUpdateSnapshot | null): number {
  if (patch.totalGuests !== undefined) return patch.totalGuests;
  const adults = patch.adults ?? snapshot?.adults ?? 0;
  const children = patch.children ?? snapshot?.children ?? 0;
  return adults + children;
}

/** Số ngày sau khi áp patch (tính bao gồm cả ngày đầu và ngày cuối). */
export function resolveNextDays(patch: Partial<Tour>, snapshot: TourUpdateSnapshot | null): number {
  if (patch.totalDays !== undefined) return patch.totalDays;
  const startDate = patch.startDate ?? snapshot?.startDate;
  const endDate = patch.endDate ?? snapshot?.endDate;
  if (!startDate || !endDate) return snapshot?.totalDays ?? 0;
  try { return Math.max(0, differenceInDays(new Date(endDate), new Date(startDate)) + 1); }
  catch { return snapshot?.totalDays ?? 0; }
}

export function sameTourCode(next: string, previous: string | undefined): boolean {
  return (previous || '').trim().toLowerCase() === next.trim().toLowerCase();
}

export function sameNationalities(next: TourNationality[], previous: TourNationality[]): boolean {
  if (next.length !== previous.length) return false;
  const byId = new Map(previous.map((n) => [n.id, n]));
  return next.every((n) => {
    const prev = byId.get(n.id);
    return !!prev && prev.paxCount === n.paxCount && prev.nameAtBooking === n.nameAtBooking;
  });
}

/**
 * Map các cột tour "phẳng" từ patch. Không xử lý tour_code / nationality_id vì
 * hai trường đó cần so sánh với snapshot trước khi ghi.
 */
export function buildTourUpdatePayload(tour: Partial<Tour>): Record<string, unknown> {
  const updates: Record<string, unknown> = {};
  if (tour.companyRef !== undefined) {
    updates.company_id = tour.companyRef.id;
    updates.company_name_at_booking = tour.companyRef.nameAtBooking;
  }
  if (tour.landOperatorRef !== undefined) {
    updates.land_operator_id = tour.landOperatorRef?.id || null;
    updates.land_operator_name_at_booking = tour.landOperatorRef?.nameAtBooking || null;
  }
  if (tour.guideRef !== undefined) {
    updates.guide_id = tour.guideRef.id;
    updates.guide_name_at_booking = tour.guideRef.nameAtBooking;
  }
  if (tour.clientName !== undefined) updates.client_name = tour.clientName;
  if (tour.adults !== undefined) updates.adults = tour.adults;
  if (tour.children !== undefined) updates.children = tour.children;
  if (tour.totalGuests !== undefined) updates.total_guests = tour.totalGuests;
  if (tour.driverName !== undefined) updates.driver_name = tour.driverName;
  if (tour.clientPhone !== undefined) updates.client_phone = tour.clientPhone;
  if (tour.startDate !== undefined) updates.start_date = tour.startDate;
  if (tour.endDate !== undefined) updates.end_date = tour.endDate;
  if (tour.totalDays !== undefined) updates.total_days = tour.totalDays;
  if (tour.notes !== undefined) updates.notes = tour.notes;
  if (tour.waterExpenseDismissed !== undefined) updates.water_warning_dismissed = tour.waterExpenseDismissed;
  if (tour.hasZeroPrice !== undefined) updates.has_zero_price = tour.hasZeroPrice;
  if (tour.hasDuplicateDestNames !== undefined) updates.has_duplicate_dest_names = tour.hasDuplicateDestNames;
  if (tour.missingWaterExpense !== undefined) updates.missing_water_expense = tour.missingWaterExpense;
  if (tour.hasUnpaidCommission !== undefined) updates.has_unpaid_commission = tour.hasUnpaidCommission;
  if (tour.allowanceTotal !== undefined) updates.allowance_total = tour.allowanceTotal;
  if (tour.summary !== undefined) {
    updates.total_tabs = tour.summary.totalTabs ?? 0;
    updates.advance_payment = tour.summary.advancePayment ?? 0;
    updates.total_after_advance = tour.summary.totalAfterAdvance ?? 0;
    updates.company_tip = tour.summary.companyTip ?? 0;
    updates.total_after_tip = tour.summary.totalAfterTip ?? 0;
    updates.collections_for_company = tour.summary.collectionsForCompany ?? 0;
    updates.total_after_collections = tour.summary.totalAfterCollections ?? 0;
    updates.final_total = tour.summary.finalTotal ?? 0;
  }
  return updates;
}
