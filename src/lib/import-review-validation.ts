import type { ReviewItem } from '@/hooks/useEnhancedImportReview';

/**
 * Kiểm tra dữ liệu tour ở màn hình review import.
 * Hàm thuần, tách khỏi hook để hook chỉ còn lo state/side-effect.
 *
 * - `buildValidationWarnings`: cảnh báo hiển thị trên từng thẻ tour (không chặn).
 * - `validateReviewItems`: lỗi chặn nút Import.
 */

const totalGuestsOf = (item: ReviewItem): number =>
  (Number(item.tour.adults) || 0) + (Number(item.tour.children) || 0);

// Phân biệt "OCR không đọc được" và "đọc được nhưng chưa khớp master data" để
// người dùng biết nên chọn lại hay tạo mới bản ghi master.
const entityWarning = (label: string, id?: string, rawName?: string): string | null => {
  if (id) return null;
  return rawName?.trim()
    ? `${label} "${rawName.trim()}" chưa khớp master data — chọn hoặc tạo mới`
    : `${label} chưa được chọn (OCR không đọc được)`;
};

export const buildValidationWarnings = (draft: ReviewItem[]): Record<number, string[]> => {
  const result: Record<number, string[]> = {};
  draft.forEach((item, index) => {
    const { tour, raw } = item;
    const warnings: string[] = [];
    if (!tour.tourCode) warnings.push('Thiếu mã tour');
    if (!tour.clientName) warnings.push('Thiếu tên khách');
    if (!tour.startDate) warnings.push('Thiếu ngày bắt đầu');
    if (!tour.endDate) warnings.push('Thiếu ngày kết thúc');
    if (totalGuestsOf(item) <= 0) warnings.push('Số khách phải lớn hơn 0');

    [
      entityWarning('Công ty', tour.companyRef?.id, raw.company),
      entityWarning('HDV', tour.guideRef?.id, raw.guide),
      entityWarning('Quốc tịch', tour.clientNationalityRef?.id, raw.nationality),
    ].forEach((w) => { if (w) warnings.push(w); });

    if (warnings.length) result[index] = warnings;
  });
  return result;
};

export const validateReviewItems = (draft: ReviewItem[]): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  draft.forEach((item, index) => {
    const { tour } = item;
    const name = tour.tourCode || `Tour ${index + 1}`;
    if (!tour.tourCode) errors.push(`${name}: thiếu mã tour`);
    if (!tour.clientName) errors.push(`${name}: thiếu tên khách`);
    if (!tour.startDate) errors.push(`${name}: thiếu ngày bắt đầu`);
    if (!tour.endDate) errors.push(`${name}: thiếu ngày kết thúc`);
    if (totalGuestsOf(item) <= 0) errors.push(`${name}: số khách phải lớn hơn 0`);
    if (!tour.companyRef?.id) errors.push(`${name}: chưa chọn công ty`);
    if (!tour.guideRef?.id) errors.push(`${name}: chưa chọn HDV`);
    if (!tour.clientNationalityRef?.id) errors.push(`${name}: chưa chọn quốc tịch`);
  });
  return { valid: errors.length === 0, errors };
};
