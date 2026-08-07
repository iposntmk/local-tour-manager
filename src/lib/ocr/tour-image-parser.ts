// Bộ dựng JSON import tour từ kết quả OCR (analyzeResult của Azure).
//
// Phạm vi: CHỈ trích xuất thông tin tab "Thông tin tour" (mã tour, công ty, HDV,
// khách, quốc tịch, lái xe, SĐT, ngày bắt đầu/kết thúc). Ghi chú luôn để trống
// cho người dùng tự nhập. Điểm tham quan / bữa ăn / công tác phí KHÔNG được lấy
// — xem `tour-itinerary-builder.ts` nếu cần bật lại.

import {
  type AnalyzeResult,
  ymd, dateDiffDays, collectLines,
  matchValue, parseGuestCount, isNonProgramDay, parseSheetDate,
} from './ocr-text-utils';
import { extractClientPhone, extractCompany, resolveNationality } from './ocr-extractors';
import { buildItineraryRows } from './tour-itinerary-rows';

export interface TourImportOptions {
  year?: number | string;
  company?: string;
  nationality?: string;
}

const DEFAULT_COMPANY = 'Việt Á';

const hashText = (value: string): string => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = Math.imul(31, hash) + value.charCodeAt(i) | 0;
  }
  return Math.abs(hash).toString(36).toUpperCase().padStart(5, '0').slice(0, 5);
};

const buildFallbackTourCode = (text: string, startDate: string, year: number): string => {
  const datePart = (startDate || ymd(year, 1, 1)).replace(/-/g, '');
  return `OCR-${datePart}-${hashText(text)}`;
};

const extractTextDates = (text: string, year: number): string[] => {
  const matches = Array.from(text.matchAll(/\b\d{1,2}\s*\/\s*\d{1,2}(?:\s*\/\s*\d{2,4})?\b/g));
  const dates = matches.map((match) => parseSheetDate(match[0], year)).filter(Boolean);
  return Array.from(new Set(dates)).sort();
};

export const buildTourImportJson = (
  analyzeResult: AnalyzeResult,
  options: TourImportOptions = {},
) => {
  const year = Number(options.year) || new Date().getFullYear();
  const lines = collectLines(analyzeResult);
  const text = lines.join('\n');
  const itineraryRows = buildItineraryRows(analyzeResult, year);

  const textDates = extractTextDates(text, year);
  const dates = Array.from(new Set([
    ...itineraryRows.map((row) => row.date).filter(Boolean),
    ...textDates,
  ])).sort();
  const totalGuests = parseGuestCount(text);
  const extractedTourCode = matchValue(text, '(?:Code\\s*(?:đoàn|doan)?|Mã\\s*đoàn)', ['S[ốo]\\s*kh[aá]ch', 'So\\s*khach']);
  const guide = matchValue(text, '(?:Hướng\\s*dẫn|Huong\\s*dan)', ['L[aá]i\\s*xe', 'Lai\\s*xe']);
  const driver = matchValue(text, '(?:L[aá]i\\s*xe|Lai\\s*xe)');
  const clientName = matchValue(text, '(?:T[eê]n\\s*kh[aá]ch|Ten\\s*khach)', ['Ng[aà]y', 'Ngay']);
  const clientPhone = extractClientPhone(text, driver, guide);
  const company = extractCompany(text) || options.company || DEFAULT_COMPANY;
  const nationality = resolveNationality(analyzeResult.tables || [], text, clientPhone, options.nationality);

  const firstReal = itineraryRows.find((row) => !isNonProgramDay(row.visit));
  const startDate = firstReal?.date || dates[0] || '';
  const lastReal = [...itineraryRows].reverse().find((row) => !isNonProgramDay(row.visit));
  const endDate = lastReal?.date || dates[dates.length - 1] || startDate;
  const tourCode = extractedTourCode || buildFallbackTourCode(text, startDate, year);

  return [{
    tour: {
      tourCode,
      company,
      tourGuide: guide,
      clientName: clientName || tourCode || 'Khách tour',
      clientNationality: nationality,
      adults: totalGuests,
      children: 0,
      totalGuests,
      driverName: driver,
      clientPhone,
      startDate,
      endDate,
      totalDays: dateDiffDays(startDate, endDate) || itineraryRows.length,
      // Ghi chú luôn để trống — người dùng tự nhập sau khi import.
      notes: '',
    },
    // Info-only: các tab dòng chi tiết để trống, người dùng nhập ở màn hình tour.
    subcollections: {
      destinations: [] as Array<{ name: string; price: number; date: string; orderIndex: number }>,
      expenses: [] as Array<{ name: string; price: number; date: string; orderIndex: number }>,
      meals: [] as Array<{ name: string; price: number; date: string; orderIndex: number }>,
      allowances: [] as Array<{ name: string; price: number; date: string; orderIndex: number }>,
      summary: {
        totalTabs: 0, advancePayment: 0, totalAfterAdvance: 0, companyTip: 0,
        totalAfterTip: 0, collectionsForCompany: 0, totalAfterCollections: 0, finalTotal: 0,
      },
    },
  }];
};
