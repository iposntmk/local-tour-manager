// Trích xuất công ty / quốc tịch / điện thoại từ văn bản OCR.
// Port từ scripts/tour-image-import-parser.mjs.

import { COUNTRY_MAP, phonePrefixNationalities } from './country-map';
import { normalize, oneLine, stripPunctuation, matchValue, type AnalyzeTable } from './ocr-text-utils';

export const cleanPhone = (value = ''): string =>
  oneLine(value).replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');

export const extractPhones = (value = ''): string[] =>
  Array.from(value.matchAll(/\+\d{1,3}[\d\s().-]{5,22}/g))
    .map((match) => cleanPhone(match[0]))
    .filter((phone, index, all) => phone.length >= 8 && all.indexOf(phone) === index);

export const inferNationalityFromPhone = (phone = ''): string => {
  const match = [...phonePrefixNationalities]
    .sort((a, b) => b[0].length - a[0].length)
    .find(([prefix]) => phone.startsWith(prefix));
  return match?.[1] || '';
};

export const extractNationalityFromTables = (tables: AnalyzeTable[] = []): string => {
  for (const table of tables) {
    const colCounts = new Map<number, string[]>();
    for (const cell of table.cells || []) {
      const viet = COUNTRY_MAP.get(normalize(cell.content || ''));
      if (!viet) continue;
      if (!colCounts.has(cell.columnIndex)) colCounts.set(cell.columnIndex, []);
      colCounts.get(cell.columnIndex)!.push(viet);
    }
    for (const [, vals] of colCounts) {
      if (vals.length >= 2 && vals.every((v) => v === vals[0])) return vals[0];
    }
  }
  return '';
};

export const extractNationalityFromGuestCount = (text: string): string => {
  const match = text.match(/(?:S[ốo]\s*kh[aá]ch|So\s*khach)\s*:\s*\d+\s+([^\d\n/+].*?)(?:\n|$)/iu);
  if (!match) return '';
  const val = normalize(stripPunctuation(match[1]));
  return COUNTRY_MAP.get(val) || '';
};

const isGenericNationality = (value = ''): boolean => {
  const text = normalize(value).replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  return !text || ['viet nam', 'vn', 'quoc te', 'international', 'pax viet nam', 'pax quoc te'].includes(text);
};

export const extractExplicitNationality = (text: string): string => {
  const pattern = /(?:Qu[ốo]c\s*t[ịi]ch|Quoc\s*tich|Nationality)[ \t]*:[ \t]*(.*?)(?=[ \t]+(?:SĐT|SDT|Điện\s*thoại|Dien\s*thoai|Phone)(?:[ \t]+(?:kh[aá]ch|pax|client))?[ \t]*:|\n|$)/isu;
  const value = text.match(pattern)?.[1] || '';
  const normalizedValue = stripPunctuation(value.replace(/\b(pax|kh[aá]ch)\b/giu, ''));
  return isGenericNationality(normalizedValue) ? '' : normalizedValue;
};

export const extractClientPhone = (text: string, driver = '', guide = ''): string => {
  const labeled = matchValue(text, '(?:SĐT|SDT|Điện\\s*thoại|Dien\\s*thoai|Phone)(?:\\s*(?:kh[aá]ch|pax|client))?');
  const labeledPhone = extractPhones(labeled)[0];
  if (labeledPhone) return labeledPhone;

  const excluded = new Set([...extractPhones(driver), ...extractPhones(guide)]);
  const candidates = extractPhones(text).filter((phone) => !excluded.has(phone));
  return candidates.find((phone) => inferNationalityFromPhone(phone)) || candidates[0] || '';
};

export const extractCompany = (text: string): string => {
  const patterns = [
    /kh[aá]ch\s*s[aạ]n\s*do\s*:?\s*(.+?)(?:\s+(?:đ[ặa]t|book(?:ing)?|b[o0]{2}k)\b|[.;,\n]|$)/iu,
    /kh[aá]ch\s*s[aạ]n\s*:\s*(.+?)(?:\s+(?:đ[ặa]t|book(?:ing)?|b[o0]{2}k)\b|[.;,\n]|$)/iu,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return stripPunctuation(match[1]);
  }
  return '';
};

/** Quốc tịch giải quyết theo thứ tự ưu tiên giống CLI gốc. */
export const resolveNationality = (
  tables: AnalyzeTable[],
  text: string,
  clientPhone: string,
  fallback = '',
): string => {
  const tableNationality = extractNationalityFromTables(tables);
  const guestCountNationality = extractNationalityFromGuestCount(text);
  const explicitNationality = COUNTRY_MAP.get(normalize(extractExplicitNationality(text))) || '';
  const inferredNationality = inferNationalityFromPhone(clientPhone);
  return tableNationality || guestCountNationality || explicitNationality || fallback || inferredNationality || '';
};
