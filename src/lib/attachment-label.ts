/**
 * Tên hiển thị cho file chứng từ đính kèm dòng tour (điểm đến / chi phí / bữa ăn).
 *
 * Quy ước: `<tên dòng> - <dd-MM-yyyy> - <số lượng> <phần mở rộng>`, ví dụ
 * `Chua Cau - 12-06-2026 - 10.jpg`. Dùng chung cho mọi file Excel xuất ra để tên
 * file đính kèm luôn phản ánh dữ liệu đã nhập ở form, thay vì tên file gốc của máy.
 */

const INVALID_FILENAME_CHARS = /[\\/:*?"<>|\r\n\t]/g;

const sanitizeNamePart = (value: string) =>
  value.replace(INVALID_FILENAME_CHARS, ' ').replace(/\s+/g, ' ').trim();

/** `2026-06-12` -> `12-06-2026`. Trả về chuỗi rỗng nếu không parse được. */
export const formatDateForFileName = (date?: string): string => {
  if (!date) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date.trim());
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '';
  const pad2 = (n: number) => String(n).padStart(2, '0');
  return `${pad2(parsed.getDate())}-${pad2(parsed.getMonth() + 1)}-${parsed.getFullYear()}`;
};

export const getFileExtension = (fileName?: string): string => {
  if (!fileName) return '';
  const idx = fileName.lastIndexOf('.');
  if (idx <= 0 || idx === fileName.length - 1) return '';
  return fileName.slice(idx).toLowerCase();
};

export interface AttachmentLabelInput {
  /** Tên điểm đến / chi phí / bữa ăn lấy từ form nhập. */
  lineName?: string;
  /** Ngày của dòng (YYYY-MM-DD). */
  lineDate?: string;
  /** Số lượng: số khách, số ngày, hoặc số chai nước. */
  quantity?: number;
  /** Tên file gốc — chỉ dùng để giữ phần mở rộng và làm fallback. */
  originalFileName?: string;
  /** Thứ tự file trong cùng một dòng (1-based) khi có nhiều file. */
  index?: number;
  /** Tổng số file của dòng; > 1 thì thêm hậu tố thứ tự. */
  total?: number;
}

/**
 * Ghép tên file đính kèm từ dữ liệu form. Bỏ qua các phần trống thay vì chèn
 * dấu phân cách rỗng, nên một dòng thiếu ngày/số lượng vẫn ra tên gọn gàng.
 */
export const buildAttachmentDisplayName = ({
  lineName,
  lineDate,
  quantity,
  originalFileName,
  index,
  total,
}: AttachmentLabelInput): string => {
  const parts: string[] = [];
  const name = sanitizeNamePart(lineName || '');
  if (name) parts.push(name);
  const date = formatDateForFileName(lineDate);
  if (date) parts.push(date);
  if (typeof quantity === 'number' && Number.isFinite(quantity) && quantity > 0) {
    parts.push(`${quantity} pax`);
  }

  const extension = getFileExtension(originalFileName);
  if (!parts.length) return sanitizeNamePart(originalFileName || '') || 'chung-tu';

  let base = parts.join(' - ');
  if (typeof total === 'number' && total > 1 && typeof index === 'number') {
    base = `${base} (${index})`;
  }
  return `${base}${extension}`;
};

export interface LabeledAttachmentFile {
  fileName: string;
  filePath: string;
  displayName: string;
}

/** Gắn `displayName` cho toàn bộ file của một dòng tour. */
export const buildAttachmentFileLabels = (
  attachments: { fileName: string; filePath: string }[] | undefined,
  line: Pick<AttachmentLabelInput, 'lineName' | 'lineDate' | 'quantity'>,
): LabeledAttachmentFile[] | undefined => {
  if (!attachments?.length) return undefined;
  const total = attachments.length;
  return attachments.map((attachment, idx) => ({
    fileName: attachment.fileName,
    filePath: attachment.filePath,
    displayName: buildAttachmentDisplayName({
      ...line,
      originalFileName: attachment.fileName,
      index: idx + 1,
      total,
    }),
  }));
};
