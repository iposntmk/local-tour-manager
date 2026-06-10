import type {
  Guide,
  Language,
  Company,
  Nationality,
  Province,
  TouristDestination,
  DestinationFree,
  Shopping,
  ExpenseCategory,
  DetailedExpense,
  DiaryType,
  TourDiary,
  Restaurant,
  ShopPlace,
  Hotel,
  CommissionStatus,
} from '@/types/master';
import type { Tour, PaymentMethod, PaymentStatus } from '@/types/tour';
import { differenceInDays } from 'date-fns';
import type {
  GuideRow,
  GuideRowWithLanguages,
  LanguageRow,
  CompanyRow,
  NationalityRow,
  ProvinceRow,
  TouristDestinationRow,
  DestinationFreeRow,
  ShoppingRow,
  ExpenseCategoryRow,
  DetailedExpenseRow,
  DiaryTypeRow,
  TourDiaryRow,
  RestaurantRow,
  ShopPlaceRow,
  HotelRow,
  TourRow,
} from './store-types';

export { mapLineReviewFields } from './line-review-mapper';
export {
  mapTourPayment,
  mapCommissionPayment,
  getCommissionStatus,
  mapTourShopping,
} from './payment-mappers';

export function mapLanguage(row: LanguageRow): Language {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    nativeName: row.native_name || undefined,
    status: row.status,
    searchKeywords: row.search_keywords || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by ?? undefined,
    isShared: row.is_shared,
  };
}

export function mapGuide(row: GuideRowWithLanguages): Guide {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone || '',
    note: row.note || '',
    languages: row.languages || [],
    isDefault: row.is_default || false,
    status: row.status,
    searchKeywords: row.search_keywords || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: (row as { created_by?: string | null }).created_by ?? undefined,
    isShared: row.is_shared,
  };
}

export function mapCompany(row: CompanyRow): Company {
  return {
    id: row.id,
    name: row.name,
    contactName: row.contact_name || '',
    phone: row.phone || '',
    email: row.email || '',
    note: row.note || '',
    isDefault: row.is_default || false,
    status: row.status,
    searchKeywords: row.search_keywords || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: (row as { created_by?: string | null }).created_by ?? undefined,
    isShared: row.is_shared,
  };
}

export function mapNationality(row: NationalityRow): Nationality {
  return {
    id: row.id,
    name: row.name,
    iso2: row.iso2,
    emoji: row.emoji,
    status: row.status,
    searchKeywords: row.search_keywords || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: (row as { created_by?: string | null }).created_by ?? undefined,
    isShared: row.is_shared,
  };
}

export function mapProvince(row: ProvinceRow): Province {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    searchKeywords: row.search_keywords || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: (row as { created_by?: string | null }).created_by ?? undefined,
    isShared: row.is_shared,
  };
}

export function mapTouristDestination(row: TouristDestinationRow): TouristDestination {
  return {
    id: row.id,
    name: row.name,
    rawName: row.raw_name || undefined,
    price: Number(row.price) || 0,
    provinceRef: {
      id: row.province_id || '',
      nameAtBooking: row.province_name_at_booking || '',
    },
    status: row.status,
    searchKeywords: row.search_keywords || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: (row as { created_by?: string | null }).created_by ?? undefined,
    isShared: row.is_shared,
  };
}

export function mapDestinationFree(row: DestinationFreeRow): DestinationFree {
  return {
    id: row.id,
    name: row.name,
    rawName: row.raw_name || undefined,
    provinceRef: {
      id: row.province_id || '',
      nameAtBooking: row.province_name_at_booking || '',
    },
    status: row.status,
    searchKeywords: row.search_keywords || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: (row as { created_by?: string | null }).created_by ?? undefined,
    isShared: row.is_shared ?? undefined,
  };
}

export function mapShopping(row: ShoppingRow): Shopping {
  return {
    id: row.id,
    name: row.name,
    price: Number(row.price) || 0,
    status: row.status,
    searchKeywords: row.search_keywords || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: (row as { created_by?: string | null }).created_by ?? undefined,
    isShared: row.is_shared,
  };
}

export function mapExpenseCategory(row: ExpenseCategoryRow): ExpenseCategory {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    searchKeywords: row.search_keywords || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: (row as { created_by?: string | null }).created_by ?? undefined,
    isShared: row.is_shared,
  };
}

export function mapDetailedExpense(row: DetailedExpenseRow): DetailedExpense {
  return {
    id: row.id,
    name: row.name,
    price: Number(row.price) || 0,
    categoryRef: {
      id: row.category_id || '',
      nameAtBooking: row.category_name_at_booking || '',
    },
    status: row.status,
    searchKeywords: row.search_keywords || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: (row as { created_by?: string | null }).created_by ?? undefined,
    isShared: row.is_shared,
  };
}

export function mapDiaryType(row: DiaryTypeRow): DiaryType {
  return {
    id: row.id,
    name: row.name,
    dataType: row.data_type || 'text',
    status: row.status,
    searchKeywords: row.search_keywords || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTourDiary(row: TourDiaryRow): TourDiary {
  return {
    id: row.id,
    tourRef: {
      id: row.tour_id || '',
      tourCodeAtBooking: row.tour_code_at_booking || '',
    },
    diaryTypeRef: {
      id: row.diary_type_id || '',
      nameAtBooking: row.diary_type_name_at_booking || '',
      dataType: row.diary_type_data_type || 'text',
    },
    contentType: row.content_type,
    contentText: row.content_text || '',
    contentUrls: row.content_urls || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapRestaurant(row: RestaurantRow): Restaurant {
  return {
    id: row.id,
    name: row.name,
    restaurantType: row.restaurant_type,
    phone: row.phone || '',
    address: row.address || '',
    provinceRef: {
      id: row.province_id || '',
      nameAtBooking: row.province_name_at_booking || '',
    },
    commissionForGuide: row.commission_for_guide || 0,
    note: row.note || '',
    status: row.status,
    searchKeywords: row.search_keywords || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapShopPlace(row: ShopPlaceRow): ShopPlace {
  return {
    id: row.id,
    name: row.name,
    shopType: row.shop_type,
    phone: row.phone || '',
    address: row.address || '',
    provinceRef: {
      id: row.province_id || '',
      nameAtBooking: row.province_name_at_booking || '',
    },
    commissionForGuide: row.commission_for_guide || 0,
    note: row.note || '',
    status: row.status,
    searchKeywords: row.search_keywords || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapHotel(row: HotelRow): Hotel {
  return {
    id: row.id,
    name: row.name,
    ownerName: row.owner_name || '',
    ownerPhone: row.owner_phone || '',
    roomType: row.room_type,
    pricePerNight: row.price_per_night,
    address: row.address || '',
    provinceRef: {
      id: row.province_id || '',
      nameAtBooking: row.province_name_at_booking || '',
    },
    note: row.note || '',
    status: row.status,
    searchKeywords: row.search_keywords || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTour(row: TourRow): Tour {
  const totalGuests = (row.adults || 0) + (row.children || 0);
  // Read total_days from DB when available; fallback to inclusive diff (counting both start and end days)
  const computedInclusive = Math.max(1, differenceInDays(new Date(row.end_date), new Date(row.start_date)) + 1);
  const totalDays = typeof row.total_days === 'number' ? row.total_days : computedInclusive;

  return {
    id: row.id,
    tourCode: row.tour_code,
    companyRef: {
      id: row.company_id || '',
      nameAtBooking: row.company_name_at_booking || '',
    },
    landOperatorRef: row.land_operator_id
      ? {
          id: row.land_operator_id,
          nameAtBooking: row.land_operator_name_at_booking || '',
        }
      : undefined,
    guideRef: {
      id: row.guide_id || '',
      nameAtBooking: row.guide_name_at_booking || '',
    },
    clientNationalityRef: {
      id: row.nationality_id || '',
      nameAtBooking: row.nationality_name_at_booking || '',
    },
    clientNationalities: [],
    clientName: row.client_name || '',
    adults: row.adults || 0,
    children: row.children || 0,
    totalGuests,
    driverName: row.driver_name || '',
    clientPhone: row.client_phone || '',
    startDate: row.start_date,
    endDate: row.end_date,
    totalDays,
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdByUserId: row.created_by_user_id ?? undefined,
    settlementStatus: ((row as any).settlement_status as Tour['settlementStatus']) || 'draft',
    submittedAt: (row as any).submitted_at ?? undefined,
    approvedAt: (row as any).approved_at ?? undefined,
    approvedBy: (row as any).approved_by ?? undefined,
    lockedAt: (row as any).locked_at ?? undefined,
    submissionCount: Number((row as any).submission_count) || 0,
    paymentStatus: (((row as any).payment_status as PaymentStatus) || 'pending'),
    paymentTotal: Number((row as any).payment_total) || 0,
    lastPaidAt: (row as any).last_paid_at ?? undefined,
    lastPaymentMethod: ((row as any).last_payment_method as PaymentMethod | null) ?? undefined,
    destinations: [],
    expenses: [],
    meals: [],
    allowances: [],
    shoppings: [],
    waterExpenseDismissed: (row as any).water_warning_dismissed ?? false,
    hasZeroPrice: (row as any).has_zero_price ?? false,
    hasDuplicateDestNames: (row as any).has_duplicate_dest_names ?? false,
    missingWaterExpense: (row as any).missing_water_expense ?? false,
    hasUnpaidCommission: (row as any).has_unpaid_commission ?? false,
    allowanceTotal: Number((row as any).allowance_total) || 0,
    summary: {
      totalTabs: Number(row.total_tabs) || 0,
      advancePayment: Number(row.advance_payment) || 0,
      totalAfterAdvance: Number(row.total_after_advance) || 0,
      companyTip: Number(row.company_tip) || 0,
      totalAfterTip: Number(row.total_after_tip) || 0,
      collectionsForCompany: Number(row.collections_for_company) || 0,
      totalAfterCollections: Number(row.total_after_collections) || 0,
      finalTotal: Number(row.final_total) || 0,
    },
  };
}
