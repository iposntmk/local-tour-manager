import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import type { Tour } from '@/types/tour';
import { enrichTourWithSummary } from '@/lib/tour-utils';
import { getTourWarningInfo, getAllowanceTotal } from '@/pages/tours/tour-table-config';
import { mapTour, mapTourShopping, mapLineReviewFields } from '../mappers';
import {
  mapTourDestinationLine,
  mapTourExpenseLine,
  mapTourMealLine,
} from './tour-line-mappers';

/**
 * Đồng bộ các cột tổng kết/cảnh báo trên bảng `tours`. Tách riêng khỏi tour-crud vì mọi
 * thao tác thêm/sửa/xóa dòng đều đi qua đây, và đây cũng là điểm nóng về số round-trip.
 */
export class TourSummaryModule {
  declare protected supabase: SupabaseClient<Database>;

  /**
   * Bản đọc tối giản chỉ để tính lại tổng kết: bỏ join quốc tịch/thanh toán, bỏ luôn truy vấn
   * chứng từ và hồ sơ người dùng (không ảnh hưởng tới con số tổng kết/cảnh báo). Nhờ vậy mỗi
   * lần thêm/sửa/xóa một dòng chỉ còn 1 request đọc thay vì 3 như `getTour()`.
   * Cố ý KHÔNG lọc dữ liệu mua sắm theo quyền: cột tổng kết phải phản ánh dữ liệu đầy đủ.
   */
  private async getTourForSummary(id: string): Promise<Tour | null> {
    const { data, error } = await this.supabase.from('tours').select(`
        *, tour_destinations(*), tour_expenses(*), tour_meals(*), tour_allowances(*),
        tour_shoppings(*, shopping_commission_payments(*))
      `).eq('id', id).single();
    if (error || !data) return null;
    const row: any = data;
    const tour = mapTour(row);
    tour.destinations = (row.tour_destinations || []).map(mapTourDestinationLine);
    tour.expenses = (row.tour_expenses || []).map(mapTourExpenseLine);
    tour.meals = (row.tour_meals || []).map(mapTourMealLine);
    tour.allowances = (row.tour_allowances || []).map((a: any) => ({
      date: a.date, name: a.name, price: Number(a.price) || 0, quantity: a.quantity || 1,
      categoryId: a.category_id ?? undefined, ...mapLineReviewFields(a),
    }));
    tour.shoppings = (row.tour_shoppings || []).map((s: any) => mapTourShopping(s));
    tour.detailsLoaded = true;
    return enrichTourWithSummary(tour);
  }

  async recalculateTourSummary(tourId: string): Promise<void> {
    const tour = await this.getTourForSummary(tourId);
    if (!tour) return;
    await this.persistTourSummary(tour);
  }

  /** Ghi tổng kết + cờ cảnh báo từ một tour ĐÃ đọc sẵn (tiết kiệm một lần đọc lại). */
  async persistTourSummary(tour: Tour): Promise<void> {
    const summary = tour.summary;
    const warningInfo = getTourWarningInfo(tour);
    await this.supabase.from('tours').update({
      total_tabs: summary.totalTabs, advance_payment: summary.advancePayment,
      total_after_advance: summary.totalAfterAdvance, company_tip: summary.companyTip,
      total_after_tip: summary.totalAfterTip, collections_for_company: summary.collectionsForCompany,
      total_after_collections: summary.totalAfterCollections, final_total: summary.finalTotal,
      has_zero_price: warningInfo.hasZeroPrice,
      has_duplicate_dest_names: warningInfo.hasDuplicateDestNames,
      missing_water_expense: warningInfo.missingWaterExpense,
      has_unpaid_commission: warningInfo.hasUnpaidCommission,
      allowance_total: getAllowanceTotal(tour),
    }).eq('id', tour.id);
  }
}
