import type { Tour, SettlementStatus, LineStatus } from '@/types/tour';

export const SETTLEMENT_STATUS_LABELS: Record<SettlementStatus, string> = {
  draft: 'Đang soạn',
  submitted: 'Đã gửi kế toán',
  need_changes: 'Cần bổ sung',
  approved: 'Đã duyệt',
  closed: 'Đã đóng',
};

export const LINE_STATUS_LABELS: Record<LineStatus, string> = {
  unchecked: 'Chưa kiểm tra',
  valid: 'Hợp lệ',
  need_more: 'Cần bổ sung',
  invalid: 'Không hợp lệ',
};

export function isTourLocked(tour: Pick<Tour, 'settlementStatus'>): boolean {
  return tour.settlementStatus === 'approved' || tour.settlementStatus === 'closed';
}

export function canEditTourData(tour: Pick<Tour, 'settlementStatus'>): boolean {
  return tour.settlementStatus === 'draft' || tour.settlementStatus === 'need_changes';
}

export function canSubmitTour(tour: Pick<Tour, 'settlementStatus'>): boolean {
  return tour.settlementStatus === 'draft' || tour.settlementStatus === 'need_changes';
}

export function canReviewTour(tour: Pick<Tour, 'settlementStatus'>): boolean {
  return tour.settlementStatus === 'submitted';
}

export interface SettlementValidationResult {
  ok: boolean;
  errors: string[];
}

export function validateSettlementReady(tour: Tour): SettlementValidationResult {
  const errors: string[] = [];

  if (!tour.tourCode?.trim()) errors.push('Thiếu mã tour.');
  if (!tour.companyRef?.id) errors.push('Thiếu công ty.');
  if (!tour.guideRef?.id) errors.push('Thiếu hướng dẫn viên.');
  if (!tour.startDate || !tour.endDate) errors.push('Thiếu ngày bắt đầu hoặc kết thúc.');
  if ((tour.adults || 0) + (tour.children || 0) <= 0) {
    errors.push('Tour phải có ít nhất 1 khách.');
  }
  if (!tour.clientNationalities?.length && !tour.clientNationalityRef?.id) {
    errors.push('Thiếu quốc tịch khách.');
  }
  if (tour.clientNationalities?.length) {
    const totalNationalityPax = tour.clientNationalities.reduce((sum, nationality) => sum + (Number(nationality.paxCount) || 0), 0);
    const totalGuests = tour.totalGuests || (tour.adults || 0) + (tour.children || 0);
    if (totalGuests > 0 && totalNationalityPax !== totalGuests) {
      errors.push('Tổng pax theo quốc tịch phải bằng tổng khách.');
    }
  }

  const noEmptyName = (items: Array<{ name?: string }>, label: string) => {
    const empties = items.filter((i) => !i.name?.trim()).length;
    if (empties > 0) errors.push(`Có ${empties} dòng ${label} bị thiếu tên.`);
  };

  noEmptyName(tour.destinations, 'điểm tham quan');
  noEmptyName(tour.expenses, 'chi phí');
  noEmptyName(tour.meals, 'ăn uống');
  noEmptyName(tour.allowances, 'phụ cấp');
  noEmptyName(tour.shoppings, 'mua sắm');

  const tabs = tour.summary?.totalTabs ?? 0;
  if (tabs <= 0) errors.push('Tổng tabs phải lớn hơn 0.');

  const hasUnchecked = [
    ...tour.expenses,
    ...tour.allowances,
  ].some((line) => !line.name?.trim());
  if (hasUnchecked) {
    // already counted above; no-op kept for clarity if rules grow
  }

  return { ok: errors.length === 0, errors };
}

export function summarizeLineStatuses(tour: Tour): Record<LineStatus, number> {
  const counts: Record<LineStatus, number> = {
    unchecked: 0,
    valid: 0,
    need_more: 0,
    invalid: 0,
  };
  const lines = [
    ...tour.destinations,
    ...tour.expenses,
    ...tour.meals,
    ...tour.allowances,
    ...tour.shoppings,
  ];
  for (const line of lines) {
    const status = (line.lineStatus ?? 'unchecked') as LineStatus;
    counts[status] = (counts[status] || 0) + 1;
  }
  return counts;
}
