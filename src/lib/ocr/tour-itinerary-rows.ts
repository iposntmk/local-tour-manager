// Dựng danh sách dòng lịch trình (ngày / tham quan / ăn / khách sạn) từ kết quả OCR.
// Tách riêng vì cả bộ trích thông tin tour (tour-image-parser) lẫn bộ dựng
// sub-collection (tour-itinerary-builder) đều cần cùng một tập dòng này.

import {
  type AnalyzeResult, type AnalyzeTable, type ItineraryRow,
  normalize, oneLine, ymd, parseSheetDate, collectLines,
} from './ocr-text-utils';

const tableCellText = (rowCells: NonNullable<AnalyzeTable['cells']>, columnIndex: number): string => {
  const exact = (rowCells || []).filter((cell) => cell.columnIndex === columnIndex);
  if (exact.length === 0) return '';
  return exact.map((cell) => cell.content).filter(Boolean).join('\n');
};

const findHeaderColumns = (cells: NonNullable<AnalyzeTable['cells']>) => {
  const columns: Record<string, number> = {};
  cells.forEach((cell) => {
    const text = normalize(cell.content || '');
    if (text.includes('ngay')) columns.date = cell.columnIndex;
    if (text.includes('tham')) columns.visit = cell.columnIndex;
    if (text.includes('an trua')) columns.lunch = cell.columnIndex;
    if (text.includes('an toi')) columns.dinner = cell.columnIndex;
    if (text.includes('khach san')) columns.hotel = cell.columnIndex;
  });
  return columns.date !== undefined && columns.visit !== undefined ? columns : null;
};

const rowsFromTables = (tables: AnalyzeTable[] = [], year: number): ItineraryRow[] => {
  for (const table of tables) {
    const rows = new Map<number, NonNullable<AnalyzeTable['cells']>>();
    (table.cells || []).forEach((cell) => {
      const list = rows.get(cell.rowIndex) || [];
      list.push(cell);
      rows.set(cell.rowIndex, list);
    });

    for (const [rowIndex, cells] of rows) {
      const columns = findHeaderColumns(cells);
      if (!columns) continue;
      return Array.from(rows.entries())
        .filter(([index]) => index > rowIndex)
        .map(([, rowCells]) => {
          const dateRaw = tableCellText(rowCells, columns.date);
          return {
            dateRaw: oneLine(dateRaw),
            date: parseSheetDate(dateRaw, year),
            visit: tableCellText(rowCells, columns.visit),
            lunch: columns.lunch !== undefined ? tableCellText(rowCells, columns.lunch) : '',
            dinner: columns.dinner !== undefined ? tableCellText(rowCells, columns.dinner) : '',
            hotel: columns.hotel !== undefined ? tableCellText(rowCells, columns.hotel) : '',
          };
        })
        .filter((row) => row.date);
    }
  }
  return [];
};

const rowsFromLines = (lines: string[], year: number): ItineraryRow[] => {
  const startIdx = lines.findIndex((l) => {
    const t = normalize(l).trim();
    return t.includes('ngay') || t.includes('tham');
  });
  const relevant = startIdx >= 0 ? lines.slice(startIdx) : lines;
  const rows: ItineraryRow[] = [];
  for (let i = 0; i < relevant.length; i += 1) {
    const line = relevant[i];
    const match = line.match(/^\s*(\d{1,2}\s*\/\s*\d{1,2}(?:\s*\/\s*\d{2,4})?)(?:\s+(.*))?$/);
    if (!match) continue;
    const dateRaw = oneLine(match[1]);
    let visit = match[2] ? oneLine(match[2]) : '';
    if (!visit && i + 1 < relevant.length) {
      const next = oneLine(relevant[i + 1]);
      if (next && !next.match(/^\d{1,2}\s*\/\s*\d{1,2}/)) {
        visit = next;
        i += 1;
      }
    }
    if (!visit) continue;
    const date = parseSheetDate(dateRaw, year);
    if (date && /\d{4}/.test(dateRaw)) {
      const y = Number(date.slice(0, 4));
      if (y !== year && y !== year + 1) continue;
    }
    rows.push({ dateRaw, date, visit, lunch: '', dinner: '', hotel: '' });
  }
  return rows;
};

/**
 * Ưu tiên bảng (Azure table extraction); không có bảng thì rơi về quét theo dòng.
 * Lịch trình vắt qua năm mới: nếu ngày sau nhỏ hơn ngày trước thì cộng thêm 1 năm.
 */
export const buildItineraryRows = (analyzeResult: AnalyzeResult, year: number): ItineraryRow[] => {
  const lines = collectLines(analyzeResult);
  const tableRows = rowsFromTables(analyzeResult.tables || [], year);
  const rows = tableRows.length > 0 ? tableRows : rowsFromLines(lines, year);

  for (let i = 1; i < rows.length; i += 1) {
    if (rows[i].date && rows[i - 1].date && rows[i].date < rows[i - 1].date) {
      const d = new Date(rows[i].date);
      d.setFullYear(d.getFullYear() + 1);
      rows[i].date = ymd(d.getFullYear(), d.getMonth() + 1, d.getDate());
    }
  }
  return rows;
};
