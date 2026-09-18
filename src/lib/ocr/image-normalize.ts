/**
 * Chuẩn hóa file trước khi gửi OCR.
 *
 * Azure Document Intelligence (prebuilt-layout) chỉ nhận JPEG, PNG, BMP, TIFF, PDF —
 * KHÔNG nhận WebP. Nhưng dialog import ảnh lại cho chọn `image/webp`, và store gửi thẳng
 * `file.type` sang Edge Function, nên ảnh webp làm Azure trả 400. Google Vision có hỗ trợ
 * webp nên không cần đổi.
 */

const AZURE_SUPPORTED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/bmp',
  'image/tiff',
  'application/pdf',
]);

const CONVERT_ERROR =
  'Không đọc được ảnh để chuyển sang PNG. Vui lòng lưu ảnh dạng JPG/PNG rồi thử lại.';

async function convertToPng(file: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(CONVERT_ERROR);
  }

  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error(CONVERT_ERROR);
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close?.();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error(CONVERT_ERROR);

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
  return new File([blob], `${baseName}.png`, { type: 'image/png' });
}

/** Trả về file Azure đọc được; file đã hợp lệ hoặc provider google thì giữ nguyên. */
export async function normalizeImageForOcr(
  file: File,
  provider: 'azure' | 'google' = 'azure',
): Promise<File> {
  if (provider === 'google') return file;
  if (AZURE_SUPPORTED_TYPES.has(file.type)) return file;
  return convertToPng(file);
}
