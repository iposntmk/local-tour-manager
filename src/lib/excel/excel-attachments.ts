import type { Row, Worksheet } from 'exceljs';
import type { Tour, TourLineAttachment } from '@/types/tour';
import { store } from '@/lib/datastore';
import { headerFill, thinBorder, type ServiceItem } from './excel-helpers';
import { TOUR_SHEET_COLUMNS } from './tour-sheet-layout';

export type AttachmentUrlMap = Record<string, string>;
export type AttachmentCellValue = number | string | { text: string; hyperlink: string };

/** Cột Q — ô chứng từ đầu tiên; file thứ 2 trở đi nằm ở các cột kế tiếp (R, S, ...). */
export const ATTACHMENT_FIRST_COL = TOUR_SHEET_COLUMNS.length;
const ATTACHMENT_COL_WIDTH = TOUR_SHEET_COLUMNS[ATTACHMENT_FIRST_COL - 1].width;

type AttachmentLine = { attachments?: TourLineAttachment[] };

const getAttachmentLines = (tour: Tour): AttachmentLine[] => [
  ...(tour.destinations || []),
  ...(tour.expenses || []),
  ...(tour.meals || []),
];

/** Signed URL cho mọi file chứng từ của danh sách tour, gom về một map theo filePath. */
export const generateAttachmentUrlsForTours = async (tours: Tour[]): Promise<AttachmentUrlMap> => {
  const paths = new Set<string>();
  tours.forEach(tour => getAttachmentLines(tour).forEach(line =>
    (line.attachments || []).forEach(a => paths.add(a.filePath))));
  if (!paths.size) return {};
  const entries = await Promise.allSettled(
    Array.from(paths).map(async fp => [fp, await store.getTourLineAttachmentUrl(fp)] as const),
  );
  const map: AttachmentUrlMap = {};
  for (const entry of entries) {
    if (entry.status === 'fulfilled') map[entry.value[0]] = entry.value[1];
  }
  return map;
};

export const generateAttachmentUrls = (tour: Tour): Promise<AttachmentUrlMap> =>
  generateAttachmentUrlsForTours([tour]);

/** Cột cuối của sheet: cột Q cộng thêm một cột cho mỗi file vượt quá 1 trên cùng một dòng. */
export const getAttachmentLastCol = (tours: Tour[]): number => {
  const maxFiles = Math.max(
    1,
    ...tours.flatMap(tour => getAttachmentLines(tour).map(line => line.attachments?.length || 0)),
  );
  return ATTACHMENT_FIRST_COL + maxFiles - 1;
};

/**
 * Giá trị các ô chứng từ của một dòng, mỗi file một ô theo hàng ngang: hiện tên file theo
 * dữ liệu form (tên dòng - ngày - số lượng), kèm link tải khi đã lấy được signed URL.
 * Không có file thì ô đầu để 0 cho dễ lọc/tính.
 */
export const getAttachmentCellValues = (service: ServiceItem, urls?: AttachmentUrlMap): AttachmentCellValue[] => {
  const files = service.attachmentFiles;
  if (!files?.length) return [0];
  return files.map(file => {
    const url = urls?.[file.filePath];
    return url ? { text: file.displayName, hyperlink: url } : file.displayName;
  });
};

/** Ghi các ô chứng từ từ cột Q trở đi cho cả bản xuất 1 tour lẫn bản xuất gộp nhiều tour. */
export const writeAttachmentCells = (row: Row, service: ServiceItem, urls?: AttachmentUrlMap) => {
  getAttachmentCellValues(service, urls).forEach((value, idx) => {
    const cell = row.getCell(ATTACHMENT_FIRST_COL + idx);
    cell.value = value;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: typeof value !== 'number' };
    if (typeof value === 'object') cell.font = { color: { argb: 'FF0563C1' }, underline: true };
  });
};

/** Độ rộng + tiêu đề dòng 2 cho các cột chứng từ phụ (sau cột Q). */
export const writeExtraAttachmentHeaders = (worksheet: Worksheet, lastCol: number) => {
  const h2 = worksheet.getRow(2);
  for (let col = ATTACHMENT_FIRST_COL + 1; col <= lastCol; col++) {
    worksheet.getColumn(col).width = ATTACHMENT_COL_WIDTH;
    const cell = h2.getCell(col);
    cell.value = `Chứng từ/ảnh ${col - ATTACHMENT_FIRST_COL + 1}`;
    cell.font = { bold: true }; cell.fill = headerFill;
    cell.border = thinBorder; cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  }
};
