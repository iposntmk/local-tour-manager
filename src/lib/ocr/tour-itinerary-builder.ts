// Bộ dựng sub-collection (điểm tham quan / bữa ăn / công tác phí) từ lịch trình OCR.
//
// LƯU Ý: luồng "Import tour từ ảnh" hiện chỉ lấy thông tin tab Info nên
// `buildTourImportJson` KHÔNG gọi file này. Code được giữ nguyên (và vẫn có test)
// để bật lại chỉ bằng một lời gọi `buildItinerarySubcollections` khi cần.

import {
  type AnalyzeResult, type ItineraryRow,
  normalize, oneLine, isBlankOrZero, isNonProgramDay,
  parsePrice, looksLikeVisit, looksLikeHdvMeal, extractInlineDinner,
} from './ocr-text-utils';
import { type DestinationEntry } from './destination-lookup';
import { extractVisitCandidates } from './visit-candidates';
import { buildItineraryRows } from './tour-itinerary-rows';
import { buildMatcher, AUTO_MATCH_PCT, type Matcher } from '@/lib/import-match-utils';

export interface ItinerarySubcollections {
  destinations: Array<{ name: string; price: number; date: string; orderIndex: number }>;
  expenses: Array<{ name: string; price: number; date: string; orderIndex: number }>;
  meals: Array<{ name: string; price: number; date: string; orderIndex: number }>;
  allowances: Array<{ name: string; price: number; date: string; orderIndex: number; provinceCandidates?: string[] }>;
}

// Mỗi điểm tham quan trong OCR đều được đưa vào JSON: khớp token/fuzzy với DB,
// nếu đạt ngưỡng tự động thì lấy tên + giá từ DB; nếu không, giữ nguyên tên OCR
// (giá 0) để bước review gợi ý/cho người dùng chọn hoặc tạo mới.
// Điểm khớp master `destinations_free` (điểm miễn phí) bị loại khỏi JSON; tỉnh
// thành của mỗi ngày suy từ điểm thường khớp được ĐẦU TIÊN trong ngày để đặt
// tên công tác phí ở buildAllowances.

/**
 * Thử tách candidate gộp (OCR mất dấu phân cách) thành nhiều điểm riêng.
 * Dùng matcher DB — thử mọi vị trí split 2-phần, nếu cả hai phần đều khớp
 * DB ≥ AUTO_MATCH_PCT thì tách và đệ quy tiếp (xử lý gộp 3+ điểm).
 */
const decomposeCandidate = (
  candidate: string,
  matcher: Matcher<DestinationEntry>,
  freeMatcher: Matcher<DestinationEntry>,
): string[] => {
  const tokens = candidate.split(/\s+/).filter(Boolean);
  if (tokens.length < 3) return [candidate];

  const ok = (text: string): boolean => {
    const p = matcher.best(text);
    const f = freeMatcher.best(text);
    return Math.max(p?.percent ?? 0, f?.percent ?? 0) >= AUTO_MATCH_PCT;
  };

  for (let i = 1; i < tokens.length; i++) {
    const left = tokens.slice(0, i).join(' ');
    const right = tokens.slice(i).join(' ');
    if (ok(left) && ok(right)) {
      return [
        ...decomposeCandidate(left, matcher, freeMatcher),
        ...decomposeCandidate(right, matcher, freeMatcher),
      ];
    }
  }
  return [candidate];
};

export const buildDestinations = (
  rows: ItineraryRow[],
  matcher: Matcher<DestinationEntry>,
  freeMatcher: Matcher<DestinationEntry>,
) => {
  const destinations: Array<{ name: string; price: number; date: string; orderIndex: number }> = [];
  const provinceByDate = new Map<string, string>();
  const provinceCandidatesByDate = new Map<string, Set<string>>();
  let orderIndex = 0;
  for (const row of rows) {
    if (!row.date || isBlankOrZero(row.visit) || !looksLikeVisit(row.visit)) continue;
    for (const candidate of extractVisitCandidates(row.visit)) {
      const paidBest = matcher.best(candidate);
      const freeBest = freeMatcher.best(candidate);
      const isFree = freeBest && freeBest.percent >= AUTO_MATCH_PCT
        && (!paidBest || freeBest.percent >= paidBest.percent);
      if (isFree) continue;

      const matched = paidBest && paidBest.percent >= AUTO_MATCH_PCT ? paidBest.item : null;

      // Candidate không khớp DB → thử tách gộp (OCR mất dấu phân cách)
      const parts = matched ? [candidate] : decomposeCandidate(candidate, matcher, freeMatcher);
      for (const part of parts) {
        const pPaid = matcher.best(part);
        const pFree = freeMatcher.best(part);
        if (pFree && pFree.percent >= AUTO_MATCH_PCT
          && (!pPaid || pFree.percent >= pPaid.percent)) continue;

        const pMatched = pPaid && pPaid.percent >= AUTO_MATCH_PCT ? pPaid.item : null;
        if (pMatched?.province) {
          if (!provinceByDate.has(row.date)) {
            provinceByDate.set(row.date, pMatched.province);
          }
          if (!provinceCandidatesByDate.has(row.date)) {
            provinceCandidatesByDate.set(row.date, new Set());
          }
          provinceCandidatesByDate.get(row.date)!.add(pMatched.province);
        }
        destinations.push({
          name: pMatched ? pMatched.name : part,
          price: pMatched ? (pMatched.price ?? 0) : 0,
          date: row.date,
          orderIndex: orderIndex++,
        });
      }
    }
  }
  return { destinations, provinceByDate, provinceCandidatesByDate };
};

export const buildMeals = (rows: ItineraryRow[]) => {
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

// Công tác phí theo ngày: price luôn = 0 để user nhập tay khi review.
// Nếu 1 ngày có điểm tham quan thuộc nhiều tỉnh, gắn provinceCandidates
// để gợi ý user chọn tỉnh phù hợp.
export const buildAllowances = (
  rows: ItineraryRow[],
  provinceByDate: Map<string, string>,
  provinceCandidatesByDate?: Map<string, Set<string>>,
) => {
  const allowances: ItinerarySubcollections['allowances'] = [];
  let orderIndex = 0;
  for (const row of rows) {
    if (!row.date || isNonProgramDay(row.visit)) continue;
    const norm = normalize(row.visit);
    const isPickupDay = !norm.includes('no guide') && !looksLikeVisit(row.visit)
      && PICKUP_PHRASES.some((p) => norm.includes(p));
    if (isPickupDay) {
      allowances.push({ name: 'Đón or Tiễn sân bay 350k', price: 0, date: row.date, orderIndex: orderIndex++ });
      continue;
    }
    const province = provinceByDate.get(row.date) || 'Huế';
    const allowance: ItinerarySubcollections['allowances'][number] = {
      name: `Công tác phí - ${province}`,
      price: 0,
      date: row.date,
      orderIndex: orderIndex++,
    };
    const candidates = provinceCandidatesByDate?.get(row.date);
    if (candidates && candidates.size > 1) {
      allowance.provinceCandidates = Array.from(candidates);
    }
    allowances.push(allowance);
  }
  return allowances;
};

/**
 * Dựng đầy đủ sub-collection từ OCR. Không dùng trong luồng import hiện tại
 * (Info-only) — gọi hàm này nếu muốn bật lại việc lấy điểm/ăn/công tác phí.
 */
export const buildItinerarySubcollections = (
  analyzeResult: AnalyzeResult,
  destinations: DestinationEntry[],
  options: { year?: number | string } = {},
  freeDestinations: DestinationEntry[] = [],
): ItinerarySubcollections => {
  const year = Number(options.year) || new Date().getFullYear();
  const rows = buildItineraryRows(analyzeResult, year);
  const destinationMatcher = buildMatcher(destinations, true);
  const freeMatcher = buildMatcher(freeDestinations, true);
  const built = buildDestinations(rows, destinationMatcher, freeMatcher);

  return {
    destinations: built.destinations,
    expenses: [],
    meals: buildMeals(rows),
    allowances: buildAllowances(rows, built.provinceByDate, built.provinceCandidatesByDate),
  };
};
