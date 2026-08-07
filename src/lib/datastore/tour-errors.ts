import type { Tour } from '@/types/tour';

/**
 * Tour đã được tạo thành công nhưng một phần dòng chi tiết (điểm tham quan,
 * chi phí, bữa ăn, công tác phí, mua sắm) ghi thất bại.
 *
 * Trước đây lỗi này bị nuốt bằng `console.error`, khiến người dùng thấy thông
 * báo "import thành công" trong khi tour thiếu dữ liệu. Ném ra để mỗi luồng gọi
 * tự quyết định: giữ tour đã tạo, nhưng cảnh báo rõ phần bị thiếu.
 */
export class TourSubcollectionError extends Error {
  readonly tour: Tour;
  readonly cause?: unknown;

  constructor(tour: Tour, cause?: unknown) {
    const detail = cause instanceof Error ? cause.message : String(cause ?? 'Lỗi không xác định');
    super(`Tour ${tour.tourCode} đã được tạo nhưng một số dòng chi tiết lưu thất bại: ${detail}`);
    this.name = 'TourSubcollectionError';
    this.tour = tour;
    this.cause = cause;
  }
}

export const isTourSubcollectionError = (error: unknown): error is TourSubcollectionError =>
  error instanceof TourSubcollectionError;
