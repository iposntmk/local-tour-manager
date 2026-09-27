/**
 * Nén ảnh ở client (thu nhỏ cạnh dài + JPEG) trước khi gửi lên mạng.
 * Dùng chung cho luồng OCR và luồng upload ảnh tour.
 */

export interface CompressOptions {
  maxLongEdge: number;
  quality: number;
  /** Ảnh nhỏ hơn ngưỡng này, đúng định dạng và không quá cạnh dài thì giữ nguyên. */
  passthroughBytes: number;
  passthroughTypes?: ReadonlySet<string>;
  errorMessage?: string;
}

const DEFAULT_PASSTHROUGH_TYPES: ReadonlySet<string> = new Set(['image/jpeg', 'image/png']);
const DEFAULT_ERROR = 'Không đọc được ảnh để nén. Vui lòng lưu ảnh dạng JPG/PNG rồi thử lại.';

const loadBitmap = async (file: File, errorMessage: string): Promise<ImageBitmap> => {
  try {
    return await createImageBitmap(file);
  } catch {
    throw new Error(errorMessage);
  }
};

async function drawToJpeg(file: File, bitmap: ImageBitmap, opts: CompressOptions, errorMessage: string): Promise<File> {
  const scale = Math.min(1, opts.maxLongEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error(errorMessage);
  // Nền trắng: ảnh PNG trong suốt khi sang JPEG sẽ thành nền đen.
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', opts.quality));
  if (!blob) throw new Error(errorMessage);

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
  return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
}

/** Trả về file đã nén, hoặc chính file gốc nếu nó đã đủ nhỏ / nén không có lợi. */
export async function compressImageFile(file: File, opts: CompressOptions): Promise<File> {
  const errorMessage = opts.errorMessage ?? DEFAULT_ERROR;
  const passthroughTypes = opts.passthroughTypes ?? DEFAULT_PASSTHROUGH_TYPES;
  const bitmap = await loadBitmap(file, errorMessage);
  const fitsAsIs =
    passthroughTypes.has(file.type) &&
    file.size <= opts.passthroughBytes &&
    Math.max(bitmap.width, bitmap.height) <= opts.maxLongEdge;
  if (fitsAsIs) {
    bitmap.close?.();
    return file;
  }
  const compressed = await drawToJpeg(file, bitmap, opts, errorMessage);
  // Nén lại PNG/JPEG đã tối ưu đôi khi còn to hơn — khi đó giữ file gốc nếu định dạng hợp lệ.
  return compressed.size < file.size || !passthroughTypes.has(file.type) ? compressed : file;
}
