/**
 * Chuẩn hóa file trước khi gửi OCR.
 *
 * - Azure Document Intelligence gói F0 chỉ nhận file ≤ 4MB, và KHÔNG nhận WebP/HEIC.
 *   Ảnh chụp điện thoại thường 5–12MB nên bị Azure trả 400 "InvalidContentLength".
 * - Thu nhỏ về cạnh dài tối đa 2000px + nén JPEG: bảng lịch trình vẫn được Azure nhận đủ,
 *   payload chỉ còn vài trăm KB → upload (nhất là trên 4G) nhanh hơn nhiều.
 * PDF giữ nguyên (không nén được ở client).
 */

import { compressImageFile } from '@/lib/image-compress';

/** Giới hạn cứng của Azure gói F0. */
export const AZURE_MAX_BYTES = 4 * 1024 * 1024;

const OCR_COMPRESS = {
  maxLongEdge: 2000,
  quality: 0.8,
  passthroughBytes: 800 * 1024,
  errorMessage: 'Không đọc được ảnh để nén trước khi OCR. Vui lòng lưu ảnh dạng JPG/PNG rồi thử lại.',
};

/** Trả về file nhỏ gọn, đúng định dạng mà Azure đọc được. */
export async function normalizeImageForOcr(file: File): Promise<File> {
  if (file.type === 'application/pdf') {
    if (file.size > AZURE_MAX_BYTES) {
      throw new Error('File PDF lớn hơn 4MB. Hãy chụp màn hình trang chương trình tour (JPG/PNG) rồi thử lại.');
    }
    return file;
  }
  return compressImageFile(file, OCR_COMPRESS);
}
