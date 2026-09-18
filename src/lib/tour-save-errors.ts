import { toVietnameseError } from './error-messages';

const TOUR_CODE_DUPLICATE = 'Mã tour này đã tồn tại. Vui lòng dùng mã khác.';
const NATIONALITY_CONFLICT =
  'Không lưu được quốc tịch khách do có hai thao tác lưu cùng lúc. Vui lòng thử lại.';

/**
 * Thông báo lỗi khi tạo/cập nhật tour.
 *
 * Bảng `tours` không có unique constraint trên `tour_code`, nên mọi lỗi 23505
 * ("duplicate key ... unique constraint") đến từ bảng khác — chủ yếu là
 * `tour_nationalities`. Vì vậy không được bắt chung `unique`/`duplicate` rồi báo
 * "trùng mã tour": chỉ lỗi nhắc đúng tên mã tour mới được map như vậy.
 */
export function toTourSaveErrorMessage(error: unknown, fallback: string): string {
  const raw = typeof error === 'string' ? error : (error as { message?: string } | null)?.message ?? '';
  const msg = raw.toLowerCase();
  if (msg.includes('tour_nationalities')) return NATIONALITY_CONFLICT;
  if (msg.includes('tour code') || msg.includes('tour_code')) return TOUR_CODE_DUPLICATE;
  return toVietnameseError(error, fallback);
}
