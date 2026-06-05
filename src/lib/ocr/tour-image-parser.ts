// Bộ dựng JSON import tour từ kết quả OCR (analyzeResult của Azure).
// Port từ scripts/tour-image-import-parser.mjs, dùng điểm đến từ DB.

import {
  type AnalyzeResult, type AnalyzeTable, type ItineraryRow,
  normalize, oneLine, ymd, parseSheetDate, dateDiffDays, collectLines,
  matchValue, parseGuestCount, isBlankOrZero, isNonProgramDay,
  parsePrice, looksLikeVisit, looksLikeHdvMeal, extractInlineDinner,
} from './ocr-text-utils';
import { extractClientPhone, extractCompany, resolveNationality } from './ocr-extractors';
import { type DestinationEntry } from './destination-lookup';
import { extractVisitCandidates } from './visit-candidates';
import { buildMatcher, AUTO_MATCH_PCT, type Matcher } from '@/lib/import-match-utils';

export interface TourImportOptions {
  year?: number | string;
  company?: string;
  nationality?: string;
}

const DEFAULT_COMPANY = 'Việt Á';

const tableCellText = (rowCells: AnalyzeTable['cells'] & {}, columnIndex: number): string => {
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

// Mỗi điểm tham quan trong OCR đều được đưa vào JSON: khớp token/fuzzy với DB,
// nếu đạt ngưỡng tự động thì lấy tên + giá từ DB; nếu không, giữ nguyên tên OCR
// (giá 0) để bước review gợi ý/cho người dùng chọn hoặc tạo mới.
const buildDestinations = (rows: ItineraryRow[], matcher: Matcher<DestinationEntry>) => {
  const result: Array<{ name: string; price: number; date: string; orderIndex: number }> = [];
  let orderIndex = 0;
  for (const row of rows) {
    if (!row.date || isBlankOrZero(row.visit) || !looksLikeVisit(row.visit)) continue;
    for (const candidate of extractVisitCandidates(row.visit)) {
      const best = matcher.best(candidate);
      const matched = best && best.percent >= AUTO_MATCH_PCT ? best.item : null;
      result.push({
        name: matched ? matched.name : candidate,
        price: matched ? (matched.price ?? 0) : 0,
        date: row.date,
        orderIndex: orderIndex++,
      });
    }
  }
  return result;
};

const buildMeals = (rows: ItineraryRow[]) => {
  const meals: Array<{ name: string; price: number; date: string; orderIndex: number }> = [];
  rows.forEach((row) => {
    ([['Ăn trưa', row.lunch], ['Ăn tối', row.dinner]] as const).forEach(([label, value]) => {
      if (row.date && !isBlankOrZero(value) && looksLikeHdvMeal(value)) {
        meals.push({ name: `${label}: ${oneLine(value)}`, price: parsePrice(value), date: row.date, orderIndex: meals.length });
      }
    });
    const inlineDinner = extractInlineDinner(row.visit);
    if (row.date && inlineDinner && looksLikeHdvMeal(inlineDinner)) {
      meals.push({ name: `Ăn tối: ${inlineDinner}`, price: 0, date: row.date, orderIndex: meals.length });
    }
  });
  return meals;
};

const PICKUP_PHRASES = ['don sb hue', 'don sb da nang', 'don san bay hue', 'don san bay da nang'];

const buildAllowances = (rows: ItineraryRow[]) => {
  const allowances: Array<{ name: string; price: number; date: string; orderIndex: number }> = [];
  let orderIndex = 0;
  for (const row of rows) {
    if (!row.date || isNonProgramDay(row.visit)) continue;
    const norm = normalize(row.visit);
    const isPickupDay = !norm.includes('no guide') && !looksLikeVisit(row.visit)
      && PICKUP_PHRASES.some((p) => norm.includes(p));
    allowances.push(isPickupDay
      ? { name: 'Đón or Tiễn sân bay 350k', price: 350000, date: row.date, orderIndex: orderIndex++ }
      : { name: 'Công tác phí - Huế 700k', price: 700000, date: row.date, orderIndex: orderIndex++ });
  }
  return allowances;
};

export const buildTourImportJson = (
  analyzeResult: AnalyzeResult,
  destinations: DestinationEntry[],
  options: TourImportOptions = {},
) => {
  const year = Number(options.year) || new Date().getFullYear();
  const lines = collectLines(analyzeResult);
  const text = lines.join('\n');
  const tableRows = rowsFromTables(analyzeResult.tables || [], year);
  const itineraryRows = tableRows.length > 0 ? tableRows : rowsFromLines(lines, year);

  // Lịch trình vắt qua năm mới: nếu ngày sau nhỏ hơn ngày trước thì +1 năm.
  for (let i = 1; i < itineraryRows.length; i += 1) {
    if (itineraryRows[i].date && itineraryRows[i - 1].date && itineraryRows[i].date < itineraryRows[i - 1].date) {
      const d = new Date(itineraryRows[i].date);
      d.setFullYear(d.getFullYear() + 1);
      itineraryRows[i].date = ymd(d.getFullYear(), d.getMonth() + 1, d.getDate());
    }
  }

  const dates = itineraryRows.map((row) => row.date).filter(Boolean).sort();
  const totalGuests = parseGuestCount(text);
  const tourCode = matchValue(text, '(?:Code\\s*(?:đoàn|doan)?|Mã\\s*đoàn)', ['S[ốo]\\s*kh[aá]ch', 'So\\s*khach']);
  const guide = matchValue(text, '(?:Hướng\\s*dẫn|Huong\\s*dan)', ['L[aá]i\\s*xe', 'Lai\\s*xe']);
  const driver = matchValue(text, '(?:L[aá]i\\s*xe|Lai\\s*xe)');
  const clientName = matchValue(text, '(?:T[eê]n\\s*kh[aá]ch|Ten\\s*khach)', ['Ng[aà]y', 'Ngay']);
  const clientPhone = extractClientPhone(text, driver, guide);
  const company = extractCompany(text) || options.company || DEFAULT_COMPANY;
  const nationality = resolveNationality(analyzeResult.tables || [], text, clientPhone, options.nationality);

  const firstReal = itineraryRows.find((row) => !isNonProgramDay(row.visit));
  const startDate = firstReal?.date || dates[0] || '';
  const lastReal = [...itineraryRows].reverse().find((row) => !isNonProgramDay(row.visit));
  const endDate = lastReal?.date || startDate;

  const destinationMatcher = buildMatcher(destinations, true);

  return [{
    tour: {
      tourCode,
      company,
      tourGuide: guide,
      clientName: tourCode || clientName || 'Khách tour',
      clientNationality: nationality,
      adults: totalGuests,
      children: 0,
      totalGuests,
      driverName: driver,
      clientPhone,
      startDate,
      endDate,
      totalDays: dateDiffDays(startDate, endDate) || itineraryRows.length,
    },
    subcollections: {
      destinations: buildDestinations(itineraryRows, destinationMatcher),
      expenses: [] as Array<{ name: string; price: number; date: string; orderIndex: number }>,
      meals: buildMeals(itineraryRows),
      allowances: buildAllowances(itineraryRows),
      summary: {
        totalTabs: 0, advancePayment: 0, totalAfterAdvance: 0, companyTip: 0,
        totalAfterTip: 0, collectionsForCompany: 0, totalAfterCollections: 0, finalTotal: 0,
      },
    },
  }];
};
