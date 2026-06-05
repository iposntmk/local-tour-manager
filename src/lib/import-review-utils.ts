import type { Tour } from '@/types/tour';
import type { ReviewItem } from '@/hooks/useEnhancedImportReview';

/**
 * Chuẩn hoá một tour draft thành payload import cuối cùng: bỏ các trường tạm
 * (matchedId / matchedPrice) và áp giá đã khớp (matchedPrice) cho các dòng con.
 * Dùng chung cho bước xác nhận import và tab xem JSON để hai nơi luôn nhất quán.
 */
export function buildFinalTour(draftTour: Partial<Tour>): Partial<Tour> {
  const tour = { ...draftTour };
  const applyPrice = (rows?: any[]) =>
    rows?.map(({ matchedId, matchedPrice, ...rest }: any) => ({
      ...rest,
      price: matchedPrice !== undefined ? matchedPrice : rest.price,
    }));

  if (tour.destinations) tour.destinations = applyPrice(tour.destinations) as Tour['destinations'];
  if (tour.expenses) tour.expenses = applyPrice(tour.expenses) as Tour['expenses'];
  if (tour.meals) tour.meals = applyPrice(tour.meals) as Tour['meals'];
  if (tour.allowances) tour.allowances = applyPrice(tour.allowances) as Tour['allowances'];
  return tour;
}

export function buildFinalTours(draft: ReviewItem[]): Partial<Tour>[] {
  return draft.map((d) => buildFinalTour(d.tour));
}
