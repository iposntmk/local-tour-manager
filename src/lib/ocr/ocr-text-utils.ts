// Helper xử lý văn bản OCR (thuần, không phụ thuộc DOM/Node).
// Port từ scripts/tour-image-import-parser.mjs.

export interface AnalyzeResult {
  content?: string;
  pages?: Array<{ lines?: Array<{ content?: string }> }>;
  tables?: AnalyzeTable[];
}

export interface AnalyzeTable {
  cells?: Array<{ rowIndex: number; columnIndex: number; content?: string }>;
}

export interface ItineraryRow {
  dateRaw: string;
  date: string;
  visit: string;
  lunch: string;
  dinner: string;
  hotel: string;
}

const COMBINING_MARKS = /[̀-ͯ]/g;

export const normalize = (value = ''): string =>
  value.normalize('NFD').replace(COMBINING_MARKS, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

export const compact = (value = ''): string =>
  value.replace(/\r/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n\s+/g, '\n').trim();

export const oneLine = (value = ''): string => compact(value).replace(/\s*\n\s*/g, ' ');

export const isBlankOrZero = (value = ''): boolean => {
  const text = normalize(oneLine(value));
  return !text || text === '0' || text === '-' || text === 'o';
};

export const isNonProgramDay = (visit = ''): boolean => {
  const text = normalize(visit);
  if (text.includes('tu do') || text.includes('free')) return true;
  if (text.startsWith('no guide')) return !looksLikeVisit(visit);
  return false;
};

export const ymd = (year: number, month: number, day: number): string =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

export const parseSheetDate = (value: string, year: number): string => {
  const match = oneLine(value).match(/\b(\d{1,2})\s*\/\s*(\d{1,2})(?:\s*\/\s*(\d{2,4}))?\b/);
  if (!match) return '';
  const resolvedYear = match[3]
    ? Number(match[3].length === 2 ? `20${match[3]}` : match[3])
    : year;
  return ymd(resolvedYear, Number(match[2]), Number(match[1]));
};

export const dateDiffDays = (startDate: string, endDate: string): number => {
  if (!startDate || !endDate) return 0;
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
};

export const collectLines = (analyzeResult: AnalyzeResult = {}): string[] => {
  const pageLines = (analyzeResult.pages || [])
    .flatMap((page) => page.lines || [])
    .map((line) => line.content)
    .filter(Boolean) as string[];
  if (pageLines.length > 0) return pageLines.map(compact);
  return compact(analyzeResult.content || '').split('\n').map(compact).filter(Boolean);
};

export const matchValue = (text: string, labelSource: string, stopSources: string[] = []): string => {
  const stop = stopSources.length ? `(?=[ \\t]+(?:${stopSources.join('|')})[ \\t]*:|\\n|$)` : '(?=\\n|$)';
  const regex = new RegExp(`${labelSource}[ \\t]*:[ \\t]*(.*?)${stop}`, 'isu');
  return oneLine(text.match(regex)?.[1] || '');
};

export const parseGuestCount = (text: string): number => {
  const match = text.match(/(?:S[ốo]\s*kh[aá]ch|So\s*khach)\s*:\s*(\d+)/iu);
  return match ? Number(match[1]) : 0;
};

export const stripPunctuation = (value = ''): string =>
  oneLine(value).replace(/^[\s:.-]+|[\s:.,;-]+$/g, '');

export const parsePrice = (value = ''): number => {
  const text = normalize(value).replace(/,/g, '.');
  const perPax = text.match(/(\d+(?:\.\d+)?)\s*k\s*\/?\s*p(?:ax)?\s*x\s*(\d+)/);
  if (perPax) return Math.round(Number(perPax[1]) * 1000 * Number(perPax[2]));
  const thousand = text.match(/(\d+(?:\.\d+)?)\s*k\b/);
  if (thousand) return Math.round(Number(thousand[1]) * 1000);
  return 0;
};

export const looksLikeVisit = (value = ''): boolean => {
  const text = normalize(value);
  return /tham|city|dai noi|lang|bana|ba na|hoi an|hai van|thien mu|tu duc|khai dinh|bao tang|tra/.test(text);
};

export const looksLikeExpense = (value = ''): boolean => {
  const text = normalize(value);
  return /vat|book|xe|oto|don sb|tien sb|no guide|khong oto|nuoc|reaching out/.test(text);
};

export const looksLikeHdvMeal = (value = ''): boolean => {
  const text = normalize(value);
  return /hdv\s*(?:book|ttoan)/.test(text) && /\d+\s*k/.test(text);
};

export const extractInlineDinner = (visit = ''): string => {
  const match = visit.match(/(?:A[nă]\s*t[ốo]i|An\s*toi)\s*:\s*([^,\n]+)/iu);
  return oneLine(match?.[1] || '');
};

export const isHotelInfoLine = (line = ''): boolean =>
  /khach\s*san|hotel|ksan/.test(normalize(line));
