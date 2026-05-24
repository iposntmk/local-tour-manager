import type { Database } from '@/integrations/supabase/types';
import type { Language } from '@/types/master';

export type GuideRow = Database['public']['Tables']['guides']['Row'];
export type GuideUpdate = Database['public']['Tables']['guides']['Update'];
export type LanguageRow = Database['public']['Tables']['languages']['Row'];
export type LanguageUpdate = Database['public']['Tables']['languages']['Update'];
export type CompanyRow = Database['public']['Tables']['companies']['Row'];
export type CompanyUpdate = Database['public']['Tables']['companies']['Update'];
export type NationalityRow = Database['public']['Tables']['nationalities']['Row'];
export type NationalityUpdate = Database['public']['Tables']['nationalities']['Update'];
export type ProvinceRow = Database['public']['Tables']['provinces']['Row'];
export type ProvinceUpdate = Database['public']['Tables']['provinces']['Update'];
export type TouristDestinationRow = Database['public']['Tables']['tourist_destinations']['Row'];
export type TouristDestinationUpdate = Database['public']['Tables']['tourist_destinations']['Update'];
export type ShoppingRow = Database['public']['Tables']['shoppings']['Row'];
export type ShoppingUpdate = Database['public']['Tables']['shoppings']['Update'];
export type ExpenseCategoryRow = Database['public']['Tables']['expense_categories']['Row'];
export type ExpenseCategoryUpdate = Database['public']['Tables']['expense_categories']['Update'];
export type DetailedExpenseRow = Database['public']['Tables']['detailed_expenses']['Row'];
export type DetailedExpenseUpdate = Database['public']['Tables']['detailed_expenses']['Update'];
export type DiaryTypeRow = Database['public']['Tables']['diary_types']['Row'];
export type DiaryTypeUpdate = Database['public']['Tables']['diary_types']['Update'];
export type TourDiaryRow = Database['public']['Tables']['tour_diaries']['Row'];
export type TourDiaryUpdate = Database['public']['Tables']['tour_diaries']['Update'];
export type RestaurantRow = Database['public']['Tables']['restaurants']['Row'];
export type RestaurantUpdate = Database['public']['Tables']['restaurants']['Update'];
export type ShopPlaceRow = Database['public']['Tables']['shop_places']['Row'];
export type ShopPlaceUpdate = Database['public']['Tables']['shop_places']['Update'];
export type HotelRow = Database['public']['Tables']['hotels']['Row'];
export type HotelUpdate = Database['public']['Tables']['hotels']['Update'];
export type TourRow = Database['public']['Tables']['tours']['Row'];
export type TourUpdateRow = Database['public']['Tables']['tours']['Update'];
export type UserProfileRow = Database['public']['Tables']['user_profiles']['Row'];
export type UserProfileUpdate = Database['public']['Tables']['user_profiles']['Update'];
export type TourDestinationRow = Database['public']['Tables']['tour_destinations']['Row'];
export type TourExpenseRow = Database['public']['Tables']['tour_expenses']['Row'];
export type TourMealRow = Database['public']['Tables']['tour_meals']['Row'];
export type TourAllowanceRow = Database['public']['Tables']['tour_allowances']['Row'];
export type TourShoppingRow = Database['public']['Tables']['tour_shoppings']['Row'];
export type TourNationalityRow = Database['public']['Tables']['tour_nationalities']['Row'];
export type TourPaymentRow = Database['public']['Tables']['tour_payments']['Row'];
export type TourPaymentInsert = Database['public']['Tables']['tour_payments']['Insert'];
export type TourPaymentUpdateRow = Database['public']['Tables']['tour_payments']['Update'];
export type CommissionPaymentRow = Database['public']['Tables']['shopping_commission_payments']['Row'];
export type CommissionPaymentInsert = Database['public']['Tables']['shopping_commission_payments']['Insert'];

export type GuideRowWithLanguages = GuideRow & {
  languages?: Language[];
};

export type TourRowWithDetails = TourRow & {
  tour_destinations?: TourDestinationRow[] | null;
  tour_expenses?: TourExpenseRow[] | null;
  tour_meals?: TourMealRow[] | null;
  tour_allowances?: TourAllowanceRow[] | null;
  tour_shoppings?: TourShoppingRow[] | null;
  tour_nationalities?: TourNationalityRow[] | null;
  tour_payments?: TourPaymentRow[] | null;
};

export type TourRowWithAllowances = TourRow & {
  tour_allowances?: Array<Pick<TourAllowanceRow, 'price' | 'quantity'>> | null;
};

export interface ExportSnapshot {
  guides: import('@/types/master').Guide[];
  languages: import('@/types/master').Language[];
  companies: import('@/types/master').Company[];
  nationalities: import('@/types/master').Nationality[];
  provinces: import('@/types/master').Province[];
  touristDestinations: import('@/types/master').TouristDestination[];
  shoppings: import('@/types/master').Shopping[];
  expenseCategories: import('@/types/master').ExpenseCategory[];
  detailedExpenses: import('@/types/master').DetailedExpense[];
  tours: import('@/types/tour').Tour[];
}
