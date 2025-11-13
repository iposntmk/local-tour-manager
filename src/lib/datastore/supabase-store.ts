import type { DataStore, SearchQuery } from '@/types/datastore';
import { getSupabaseClient } from './supabase-client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import type {
  Guide,
  Company,
  Nationality,
  Province,
  TouristDestination,
  Shopping,
  ExpenseCategory,
  DetailedExpense,
  GuideInput,
  CompanyInput,
  NationalityInput,
  ProvinceInput,
  TouristDestinationInput,
  ShoppingInput,
  ExpenseCategoryInput,
  DetailedExpenseInput,
  DiaryType,
  DiaryTypeInput,
  TourDiary,
  TourDiaryInput,
  Restaurant,
  RestaurantInput,
  ShopPlace,
  ShopPlaceInput,
  Hotel,
  HotelInput,
} from '@/types/master';
import type { UserProfile, UserProfileInput } from '@/types/user';
import { dbRowToUserProfile, userProfileToDbInsert, userProfileToDbUpdate } from '@/types/user';
import type {
  Tour,
  Destination,
  Expense,
  Meal,
  Allowance,
  Shopping as TourShopping,
  TourQuery,
  EntityRef,
  TourInput,
  TourSummary,
  TourListResult,
} from '@/types/tour';
import { generateSearchKeywords } from '@/lib/string-utils';
import { differenceInDays } from 'date-fns';
import { enrichTourWithSummary, enrichToursWithSummaries } from '@/lib/tour-utils';

type GuideRow = Database['public']['Tables']['guides']['Row'];
type GuideUpdate = Database['public']['Tables']['guides']['Update'];
type CompanyRow = Database['public']['Tables']['companies']['Row'];
type CompanyUpdate = Database['public']['Tables']['companies']['Update'];
type NationalityRow = Database['public']['Tables']['nationalities']['Row'];
type NationalityUpdate = Database['public']['Tables']['nationalities']['Update'];
type ProvinceRow = Database['public']['Tables']['provinces']['Row'];
type ProvinceUpdate = Database['public']['Tables']['provinces']['Update'];
type TouristDestinationRow = Database['public']['Tables']['tourist_destinations']['Row'];
type TouristDestinationUpdate = Database['public']['Tables']['tourist_destinations']['Update'];
type ShoppingRow = Database['public']['Tables']['shoppings']['Row'];
type ShoppingUpdate = Database['public']['Tables']['shoppings']['Update'];
type ExpenseCategoryRow = Database['public']['Tables']['expense_categories']['Row'];
type ExpenseCategoryUpdate = Database['public']['Tables']['expense_categories']['Update'];
type DetailedExpenseRow = Database['public']['Tables']['detailed_expenses']['Row'];
type DetailedExpenseUpdate = Database['public']['Tables']['detailed_expenses']['Update'];
type DiaryTypeRow = Database['public']['Tables']['diary_types']['Row'];
type DiaryTypeUpdate = Database['public']['Tables']['diary_types']['Update'];
type TourDiaryRow = Database['public']['Tables']['tour_diaries']['Row'];
type TourDiaryUpdate = Database['public']['Tables']['tour_diaries']['Update'];
type RestaurantRow = Database['public']['Tables']['restaurants']['Row'];
type RestaurantUpdate = Database['public']['Tables']['restaurants']['Update'];
type ShopPlaceRow = Database['public']['Tables']['shop_places']['Row'];
type ShopPlaceUpdate = Database['public']['Tables']['shop_places']['Update'];
type HotelRow = Database['public']['Tables']['hotels']['Row'];
type HotelUpdate = Database['public']['Tables']['hotels']['Update'];
type TourRow = Database['public']['Tables']['tours']['Row'];
type TourUpdateRow = Database['public']['Tables']['tours']['Update'];
type UserProfileRow = Database['public']['Tables']['user_profiles']['Row'];
type UserProfileUpdate = Database['public']['Tables']['user_profiles']['Update'];
type TourDestinationRow = Database['public']['Tables']['tour_destinations']['Row'];
type TourExpenseRow = Database['public']['Tables']['tour_expenses']['Row'];
type TourMealRow = Database['public']['Tables']['tour_meals']['Row'];
type TourAllowanceRow = Database['public']['Tables']['tour_allowances']['Row'];
type TourShoppingRow = Database['public']['Tables']['tour_shoppings']['Row'];

type TourRowWithDetails = TourRow & {
  tour_destinations?: TourDestinationRow[] | null;
  tour_expenses?: TourExpenseRow[] | null;
  tour_meals?: TourMealRow[] | null;
  tour_allowances?: TourAllowanceRow[] | null;
  tour_shoppings?: TourShoppingRow[] | null;
};

type TourRowWithAllowances = TourRow & {
  tour_allowances?: Array<Pick<TourAllowanceRow, 'price' | 'quantity'>> | null;
};

interface ExportSnapshot {
  guides: Guide[];
  companies: Company[];
  nationalities: Nationality[];
  provinces: Province[];
  touristDestinations: TouristDestination[];
  shoppings: Shopping[];
  expenseCategories: ExpenseCategory[];
  detailedExpenses: DetailedExpense[];
  tours: Tour[];
}

export class SupabaseStore implements DataStore {
  private readonly supabase: SupabaseClient<Database>;

  constructor() {
    this.supabase = getSupabaseClient();
  }

  // Helper to map database rows to app types
  private mapGuide(row: GuideRow): Guide {
    return {
      id: row.id,
      name: row.name,
      phone: row.phone || '',
      note: row.note || '',
      status: row.status,
      searchKeywords: row.search_keywords || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapCompany(row: CompanyRow): Company {
    return {
      id: row.id,
      name: row.name,
      contactName: row.contact_name || '',
      phone: row.phone || '',
      email: row.email || '',
      note: row.note || '',
      status: row.status,
      searchKeywords: row.search_keywords || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapNationality(row: NationalityRow): Nationality {
    return {
      id: row.id,
      name: row.name,
      iso2: row.iso2,
      emoji: row.emoji,
      status: row.status,
      searchKeywords: row.search_keywords || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapProvince(row: ProvinceRow): Province {
    return {
      id: row.id,
      name: row.name,
      status: row.status,
      searchKeywords: row.search_keywords || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapTouristDestination(row: TouristDestinationRow): TouristDestination {
    return {
      id: row.id,
      name: row.name,
      price: Number(row.price) || 0,
      provinceRef: {
        id: row.province_id || '',
        nameAtBooking: row.province_name_at_booking || '',
      },
      status: row.status,
      searchKeywords: row.search_keywords || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapShopping(row: ShoppingRow): Shopping {
    return {
      id: row.id,
      name: row.name,
      price: Number(row.price) || 0,
      status: row.status,
      searchKeywords: row.search_keywords || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapExpenseCategory(row: ExpenseCategoryRow): ExpenseCategory {
    return {
      id: row.id,
      name: row.name,
      status: row.status,
      searchKeywords: row.search_keywords || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapDetailedExpense(row: DetailedExpenseRow): DetailedExpense {
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
    };
  }

  private mapDiaryType(row: DiaryTypeRow): DiaryType {
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

  private mapTourDiary(row: TourDiaryRow): TourDiary {
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

  private mapRestaurant(row: RestaurantRow): Restaurant {
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

  private mapShopPlace(row: ShopPlaceRow): ShopPlace {
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

  private mapHotel(row: HotelRow): Hotel {
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

  private mapTour(row: TourRow): Tour {
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
      guideRef: {
        id: row.guide_id || '',
        nameAtBooking: row.guide_name_at_booking || '',
      },
      clientNationalityRef: {
        id: row.nationality_id || '',
        nameAtBooking: row.nationality_name_at_booking || '',
      },
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
      destinations: [],
      expenses: [],
      meals: [],
      allowances: [],
      shoppings: [],
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

  // Guides
  async listGuides(query?: SearchQuery): Promise<Guide[]> {
    let queryBuilder = this.supabase.from('guides').select('*').order('name');
    
    if (query?.status) queryBuilder = queryBuilder.eq('status', query.status);
    if (query?.search) queryBuilder = queryBuilder.ilike('name', `%${query.search}%`);

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return (data || []).map(this.mapGuide);
  }

  async getGuide(id: string): Promise<Guide | null> {
    const { data, error } = await this.supabase.from('guides').select('*').eq('id', id).single();
    if (error) return null;
    return data ? this.mapGuide(data) : null;
  }

  async createGuide(guide: GuideInput): Promise<Guide> {
    // Check for duplicate name
    const { data: existing } = await this.supabase
      .from('guides')
      .select('id')
      .ilike('name', guide.name)
      .maybeSingle();

    if (existing) {
      throw new Error('A guide with this name already exists');
    }

    const searchKeywords = generateSearchKeywords(guide.name);
    const { data, error } = await this.supabase
      .from('guides')
      .insert({
        name: guide.name,
        phone: guide.phone || '',
        note: guide.note || '',
        status: 'active',
        search_keywords: searchKeywords,
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapGuide(data);
  }

  async updateGuide(id: string, guide: Partial<Guide>): Promise<void> {
    const updates: GuideUpdate = {};
    if (guide.name !== undefined) {
      // Check for duplicate name (excluding current record)
      const { data: existing } = await this.supabase
        .from('guides')
        .select('id')
        .ilike('name', guide.name)
        .neq('id', id)
        .maybeSingle();

      if (existing) {
        throw new Error('A guide with this name already exists');
      }

      updates.name = guide.name;
      updates.search_keywords = generateSearchKeywords(guide.name);
    }
    if (guide.phone !== undefined) updates.phone = guide.phone;
    if (guide.note !== undefined) updates.note = guide.note;

    const { error } = await this.supabase.from('guides').update(updates).eq('id', id);
    if (error) throw error;
  }

  async deleteGuide(id: string): Promise<void> {
    const { error } = await this.supabase.from('guides').delete().eq('id', id);
    if (error) throw error;
  }

  async duplicateGuide(id: string): Promise<Guide> {
    const original = await this.getGuide(id);
    if (!original) throw new Error('Guide not found');
    return this.createGuide({
      name: `${original.name} (Copy)`,
      phone: original.phone,
      note: original.note,
    });
  }

  async deleteAllGuides(): Promise<void> {
    const { error } = await this.supabase.from('guides').delete().gte('created_at', '1970-01-01');
    if (error) throw error;
  }

  async bulkCreateGuides(inputs: GuideInput[]): Promise<Guide[]> {
    // Check for duplicates within the batch
    const names = inputs.map(input => input.name.toLowerCase());
    const duplicatesInBatch = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicatesInBatch.length > 0) {
      throw new Error('Duplicate names found in batch');
    }

    // Check for duplicates with existing records
    const { data: existing } = await this.supabase
      .from('guides')
      .select('name');

    if (existing) {
      const existingNames = existing.map(g => g.name.toLowerCase());
      const duplicates = inputs.filter(input =>
        existingNames.includes(input.name.toLowerCase())
      );
      if (duplicates.length > 0) {
        throw new Error(`The following guides already exist: ${duplicates.map(d => d.name).join(', ')}`);
      }
    }

    const records = inputs.map(input => ({
      name: input.name,
      phone: input.phone || '',
      note: input.note || '',
      status: 'active',
      search_keywords: generateSearchKeywords(input.name),
    }));

    const { data, error } = await this.supabase
      .from('guides')
      .insert(records)
      .select();

    if (error) throw error;
    return (data || []).map(this.mapGuide);
  }

  async toggleGuideStatus(id: string): Promise<void> {
    throw new Error('Status toggling is disabled');
  }
  
  async toggleCompanyStatus(id: string): Promise<void> {
    throw new Error('Status toggling is disabled');
  }
  
  async toggleNationalityStatus(id: string): Promise<void> {
    throw new Error('Status toggling is disabled');
  }
  
  async toggleProvinceStatus(id: string): Promise<void> {
    throw new Error('Status toggling is disabled');
  }
  
  async toggleTouristDestinationStatus(id: string): Promise<void> {
    throw new Error('Status toggling is disabled');
  }
  
  async toggleShoppingStatus(id: string): Promise<void> {
    throw new Error('Status toggling is disabled');
  }
  
  async toggleExpenseCategoryStatus(id: string): Promise<void> {
    throw new Error('Status toggling is disabled');
  }
  
  async toggleDetailedExpenseStatus(id: string): Promise<void> {
    throw new Error('Status toggling is disabled');
  }

  // Companies
  async listCompanies(query?: SearchQuery): Promise<Company[]> {
    let queryBuilder = this.supabase.from('companies').select('*').order('name');
    
    if (query?.search) queryBuilder = queryBuilder.ilike('name', `%${query.search}%`);

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return (data || []).map(this.mapCompany);
  }

  async getCompany(id: string): Promise<Company | null> {
    const { data, error } = await this.supabase.from('companies').select('*').eq('id', id).single();
    if (error) return null;
    return data ? this.mapCompany(data) : null;
  }

  async createCompany(company: CompanyInput): Promise<Company> {
    // Check for duplicate name
    const { data: existing } = await this.supabase
      .from('companies')
      .select('id')
      .ilike('name', company.name)
      .maybeSingle();

    if (existing) {
      throw new Error('A company with this name already exists');
    }

    const searchKeywords = generateSearchKeywords(company.name);
    const { data, error } = await this.supabase
      .from('companies')
      .insert({
        name: company.name,
        contact_name: company.contactName || '',
        phone: company.phone || '',
        email: company.email || '',
        note: company.note || '',
        status: 'active',
        search_keywords: searchKeywords,
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapCompany(data);
  }

  async updateCompany(id: string, company: Partial<Company>): Promise<void> {
    const updates: CompanyUpdate = {};
    if (company.name !== undefined) {
      // Check for duplicate name (excluding current record)
      const { data: existing } = await this.supabase
        .from('companies')
        .select('id')
        .ilike('name', company.name)
        .neq('id', id)
        .maybeSingle();

      if (existing) {
        throw new Error('A company with this name already exists');
      }

      updates.name = company.name;
      updates.search_keywords = generateSearchKeywords(company.name);
    }
    if (company.contactName !== undefined) updates.contact_name = company.contactName;
    if (company.phone !== undefined) updates.phone = company.phone;
    if (company.email !== undefined) updates.email = company.email;
    if (company.note !== undefined) updates.note = company.note;

    const { error } = await this.supabase.from('companies').update(updates).eq('id', id);
    if (error) throw error;
  }

  async deleteCompany(id: string): Promise<void> {
    const { error } = await this.supabase.from('companies').delete().eq('id', id);
    if (error) throw error;
  }

  async duplicateCompany(id: string): Promise<Company> {
    const original = await this.getCompany(id);
    if (!original) throw new Error('Company not found');
    return this.createCompany({
      name: `${original.name} (Copy)`,
      contactName: original.contactName,
      phone: original.phone,
      email: original.email,
      note: original.note,
    });
  }

  async deleteAllCompanies(): Promise<void> {
    const { error } = await this.supabase.from('companies').delete().gte('created_at', '1970-01-01');
    if (error) throw error;
  }

  async bulkCreateCompanies(inputs: CompanyInput[]): Promise<Company[]> {
    // Check for duplicates within the batch
    const names = inputs.map(input => input.name.toLowerCase());
    const duplicatesInBatch = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicatesInBatch.length > 0) {
      throw new Error('Duplicate names found in batch');
    }

    // Check for duplicates with existing records
    const { data: existing } = await this.supabase
      .from('companies')
      .select('name');

    if (existing) {
      const existingNames = existing.map(c => c.name.toLowerCase());
      const duplicates = inputs.filter(input =>
        existingNames.includes(input.name.toLowerCase())
      );
      if (duplicates.length > 0) {
        throw new Error(`The following companies already exist: ${duplicates.map(d => d.name).join(', ')}`);
      }
    }

    const records = inputs.map(input => ({
      name: input.name,
      contact_name: input.contactName || '',
      phone: input.phone || '',
      email: input.email || '',
      note: input.note || '',
      status: 'active',
      search_keywords: generateSearchKeywords(input.name),
    }));

    const { data, error } = await this.supabase
      .from('companies')
      .insert(records)
      .select();

    if (error) throw error;
    return (data || []).map(this.mapCompany);
  }

  // Nationalities
  async listNationalities(query?: SearchQuery): Promise<Nationality[]> {
    let queryBuilder = this.supabase.from('nationalities').select('*').order('name');
    
    if (query?.search) queryBuilder = queryBuilder.ilike('name', `%${query.search}%`);

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return (data || []).map(this.mapNationality);
  }

  async getNationality(id: string): Promise<Nationality | null> {
    const { data, error } = await this.supabase.from('nationalities').select('*').eq('id', id).single();
    if (error) return null;
    return data ? this.mapNationality(data) : null;
  }

  async createNationality(nationality: NationalityInput): Promise<Nationality> {
    // Check for duplicate name
    const { data: existing } = await this.supabase
      .from('nationalities')
      .select('id')
      .ilike('name', nationality.name)
      .maybeSingle();

    if (existing) {
      throw new Error('A nationality with this name already exists');
    }

    const searchKeywords = generateSearchKeywords(nationality.name);
    const { data, error } = await this.supabase
      .from('nationalities')
      .insert({
        name: nationality.name,
        iso2: nationality.iso2,
        emoji: nationality.emoji,
        status: 'active',
        search_keywords: searchKeywords,
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapNationality(data);
  }

  async updateNationality(id: string, nationality: Partial<Nationality>): Promise<void> {
    const updates: NationalityUpdate = {};
    if (nationality.name !== undefined) {
      // Check for duplicate name (excluding current record)
      const { data: existing } = await this.supabase
        .from('nationalities')
        .select('id')
        .ilike('name', nationality.name)
        .neq('id', id)
        .maybeSingle();

      if (existing) {
        throw new Error('A nationality with this name already exists');
      }

      updates.name = nationality.name;
      updates.search_keywords = generateSearchKeywords(nationality.name);
    }
    if (nationality.iso2 !== undefined) updates.iso2 = nationality.iso2;
    if (nationality.emoji !== undefined) updates.emoji = nationality.emoji;

    const { error } = await this.supabase.from('nationalities').update(updates).eq('id', id);
    if (error) throw error;
  }

  async deleteNationality(id: string): Promise<void> {
    const { error } = await this.supabase.from('nationalities').delete().eq('id', id);
    if (error) throw error;
  }

  async duplicateNationality(id: string): Promise<Nationality> {
    const original = await this.getNationality(id);
    if (!original) throw new Error('Nationality not found');
    return this.createNationality({
      name: `${original.name} (Copy)`,
      iso2: original.iso2,
      emoji: original.emoji,
    });
  }

  async deleteAllNationalities(): Promise<void> {
    const { error } = await this.supabase.from('nationalities').delete().gte('created_at', '1970-01-01');
    if (error) throw error;
  }

  async bulkCreateNationalities(inputs: NationalityInput[]): Promise<Nationality[]> {
    // Check for duplicates within the batch
    const names = inputs.map(input => input.name.toLowerCase());
    const duplicatesInBatch = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicatesInBatch.length > 0) {
      throw new Error('Duplicate names found in batch');
    }

    // Check for duplicates with existing records
    const { data: existing } = await this.supabase
      .from('nationalities')
      .select('name');

    if (existing) {
      const existingNames = existing.map(n => n.name.toLowerCase());
      const duplicates = inputs.filter(input =>
        existingNames.includes(input.name.toLowerCase())
      );
      if (duplicates.length > 0) {
        throw new Error(`The following nationalities already exist: ${duplicates.map(d => d.name).join(', ')}`);
      }
    }

    const records = inputs.map(input => ({
      name: input.name,
      iso2: input.iso2 || null,
      emoji: input.emoji || null,
      status: 'active',
      search_keywords: generateSearchKeywords(input.name),
    }));

    const { data, error } = await this.supabase
      .from('nationalities')
      .insert(records)
      .select();

    if (error) throw error;
    return (data || []).map(this.mapNationality);
  }

  // Provinces
  async listProvinces(query?: SearchQuery): Promise<Province[]> {
    let queryBuilder = this.supabase.from('provinces').select('*').order('name');
    
    if (query?.search) queryBuilder = queryBuilder.ilike('name', `%${query.search}%`);

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return (data || []).map(this.mapProvince);
  }

  async getProvince(id: string): Promise<Province | null> {
    const { data, error } = await this.supabase.from('provinces').select('*').eq('id', id).single();
    if (error) return null;
    return data ? this.mapProvince(data) : null;
  }

  async createProvince(province: ProvinceInput): Promise<Province> {
    // Check for duplicate name
    const { data: existing } = await this.supabase
      .from('provinces')
      .select('id')
      .ilike('name', province.name)
      .maybeSingle();

    if (existing) {
      throw new Error('A province with this name already exists');
    }

    const searchKeywords = generateSearchKeywords(province.name);
    const { data, error } = await this.supabase
      .from('provinces')
      .insert({
        name: province.name,
        status: 'active',
        search_keywords: searchKeywords,
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapProvince(data);
  }

  async updateProvince(id: string, province: Partial<Province>): Promise<void> {
    const updates: ProvinceUpdate = {};
    if (province.name !== undefined) {
      // Check for duplicate name (excluding current record)
      const { data: existing } = await this.supabase
        .from('provinces')
        .select('id')
        .ilike('name', province.name)
        .neq('id', id)
        .maybeSingle();

      if (existing) {
        throw new Error('A province with this name already exists');
      }

      updates.name = province.name;
      updates.search_keywords = generateSearchKeywords(province.name);
    }

    const { error } = await this.supabase.from('provinces').update(updates).eq('id', id);
    if (error) throw error;
  }

  async deleteProvince(id: string): Promise<void> {
    const { error } = await this.supabase.from('provinces').delete().eq('id', id);
    if (error) throw error;
  }

  async duplicateProvince(id: string): Promise<Province> {
    const original = await this.getProvince(id);
    if (!original) throw new Error('Province not found');
    return this.createProvince({
      name: `${original.name} (Copy)`,
    });
  }

  async deleteAllProvinces(): Promise<void> {
    const { error } = await this.supabase.from('provinces').delete().gte('created_at', '1970-01-01');
    if (error) throw error;
  }

  async bulkCreateProvinces(inputs: ProvinceInput[]): Promise<Province[]> {
    // Check for duplicates within the batch
    const names = inputs.map(input => input.name.toLowerCase());
    const duplicatesInBatch = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicatesInBatch.length > 0) {
      throw new Error('Duplicate names found in batch');
    }

    // Check for duplicates with existing records
    const { data: existing } = await this.supabase
      .from('provinces')
      .select('name');

    if (existing) {
      const existingNames = existing.map(p => p.name.toLowerCase());
      const duplicates = inputs.filter(input =>
        existingNames.includes(input.name.toLowerCase())
      );
      if (duplicates.length > 0) {
        throw new Error(`The following provinces already exist: ${duplicates.map(d => d.name).join(', ')}`);
      }
    }

    const records = inputs.map(input => ({
      name: input.name,
      status: 'active',
      search_keywords: generateSearchKeywords(input.name),
    }));

    const { data, error } = await this.supabase
      .from('provinces')
      .insert(records)
      .select();

    if (error) throw error;
    return (data || []).map(this.mapProvince);
  }

  // Tourist Destinations
  async listTouristDestinations(query?: SearchQuery): Promise<TouristDestination[]> {
    let queryBuilder = this.supabase.from('tourist_destinations').select('*').order('name');
    
    if (query?.search) queryBuilder = queryBuilder.ilike('name', `%${query.search}%`);

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return (data || []).map(this.mapTouristDestination);
  }

  async getTouristDestination(id: string): Promise<TouristDestination | null> {
    const { data, error } = await this.supabase.from('tourist_destinations').select('*').eq('id', id).single();
    if (error) return null;
    return data ? this.mapTouristDestination(data) : null;
  }

  async createTouristDestination(destination: TouristDestinationInput): Promise<TouristDestination> {
    // Check for duplicate name
    const { data: existing } = await this.supabase
      .from('tourist_destinations')
      .select('id')
      .ilike('name', destination.name)
      .maybeSingle();

    if (existing) {
      throw new Error('A tourist destination with this name already exists');
    }

    const searchKeywords = generateSearchKeywords(destination.name);
    const { data, error } = await this.supabase
      .from('tourist_destinations')
      .insert({
        name: destination.name,
        price: destination.price,
        province_id: destination.provinceRef.id,
        province_name_at_booking: destination.provinceRef.nameAtBooking,
        status: 'active',
        search_keywords: searchKeywords,
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapTouristDestination(data);
  }

  async updateTouristDestination(id: string, destination: Partial<TouristDestination>): Promise<void> {
    const updates: TouristDestinationUpdate = {};
    if (destination.name !== undefined) {
      // Check for duplicate name (excluding current record)
      const { data: existing } = await this.supabase
        .from('tourist_destinations')
        .select('id')
        .ilike('name', destination.name)
        .neq('id', id)
        .maybeSingle();

      if (existing) {
        throw new Error('A tourist destination with this name already exists');
      }

      updates.name = destination.name;
      updates.search_keywords = generateSearchKeywords(destination.name);
    }
    if (destination.price !== undefined) updates.price = destination.price;
    if (destination.provinceRef !== undefined) {
      updates.province_id = destination.provinceRef.id;
      updates.province_name_at_booking = destination.provinceRef.nameAtBooking;
    }
    if (destination.status !== undefined) updates.status = destination.status;

    const { error } = await this.supabase.from('tourist_destinations').update(updates).eq('id', id);
    if (error) throw error;
  }

  async deleteTouristDestination(id: string): Promise<void> {
    const { error } = await this.supabase.from('tourist_destinations').delete().eq('id', id);
    if (error) throw error;
  }

  async duplicateTouristDestination(id: string): Promise<TouristDestination> {
    const original = await this.getTouristDestination(id);
    if (!original) throw new Error('Tourist destination not found');
    return this.createTouristDestination({
      name: `${original.name} (Copy)`,
      price: original.price,
      provinceRef: original.provinceRef,
    });
  }

  async deleteAllTouristDestinations(): Promise<void> {
    const { error } = await this.supabase.from('tourist_destinations').delete().gte('created_at', '1970-01-01');
    if (error) throw error;
  }

  async bulkCreateTouristDestinations(inputs: TouristDestinationInput[]): Promise<TouristDestination[]> {
    // Check for duplicates within the batch
    const names = inputs.map(input => input.name.toLowerCase());
    const duplicatesInBatch = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicatesInBatch.length > 0) {
      throw new Error('Duplicate names found in batch');
    }

    // Check for duplicates with existing records
    const { data: existing } = await this.supabase
      .from('tourist_destinations')
      .select('name');

    if (existing) {
      const existingNames = existing.map(d => d.name.toLowerCase());
      const duplicates = inputs.filter(input =>
        existingNames.includes(input.name.toLowerCase())
      );
      if (duplicates.length > 0) {
        throw new Error(`The following tourist destinations already exist: ${duplicates.map(d => d.name).join(', ')}`);
      }
    }

    const records = inputs.map(input => ({
      name: input.name,
      price: input.price,
      province_id: input.provinceRef.id,
      province_name_at_booking: input.provinceRef.nameAtBooking,
      status: 'active',
      search_keywords: generateSearchKeywords(input.name),
    }));

    const { data, error } = await this.supabase
      .from('tourist_destinations')
      .insert(records)
      .select();

    if (error) throw error;
    return (data || []).map(this.mapTouristDestination);
  }

  // Shopping
  async listShoppings(query?: SearchQuery): Promise<Shopping[]> {
    let queryBuilder = this.supabase.from('shoppings').select('*').order('name');
    
    if (query?.search) queryBuilder = queryBuilder.ilike('name', `%${query.search}%`);

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return (data || []).map(this.mapShopping);
  }

  async getShopping(id: string): Promise<Shopping | null> {
    const { data, error } = await this.supabase.from('shoppings').select('*').eq('id', id).single();
    if (error) return null;
    return data ? this.mapShopping(data) : null;
  }

  async createShopping(shopping: ShoppingInput): Promise<Shopping> {
    // Check for duplicate name
    const { data: existing } = await this.supabase
      .from('shoppings')
      .select('id')
      .ilike('name', shopping.name)
      .maybeSingle();

    if (existing) {
      throw new Error('A shopping with this name already exists');
    }

    const searchKeywords = generateSearchKeywords(shopping.name);
    const { data, error } = await this.supabase
      .from('shoppings')
      .insert({
        name: shopping.name,
        status: 'active',
        search_keywords: searchKeywords,
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapShopping(data);
  }

  async updateShopping(id: string, shopping: Partial<Shopping>): Promise<void> {
    const updates: ShoppingUpdate = {};
    if (shopping.name !== undefined) {
      // Check for duplicate name (excluding current record)
      const { data: existing } = await this.supabase
        .from('shoppings')
        .select('id')
        .ilike('name', shopping.name)
        .neq('id', id)
        .maybeSingle();

      if (existing) {
        throw new Error('A shopping with this name already exists');
      }

      updates.name = shopping.name;
      updates.search_keywords = generateSearchKeywords(shopping.name);
    }

    const { error } = await this.supabase.from('shoppings').update(updates).eq('id', id);
    if (error) throw error;
  }

  async deleteShopping(id: string): Promise<void> {
    const { error } = await this.supabase.from('shoppings').delete().eq('id', id);
    if (error) throw error;
  }

  async duplicateShopping(id: string): Promise<Shopping> {
    const original = await this.getShopping(id);
    if (!original) throw new Error('Shopping not found');
    return this.createShopping({
      name: `${original.name} (Copy)`,
    });
  }

  async deleteAllShoppings(): Promise<void> {
    const { error } = await this.supabase.from('shoppings').delete().gte('created_at', '1970-01-01');
    if (error) throw error;
  }

  async bulkCreateShoppings(inputs: ShoppingInput[]): Promise<Shopping[]> {
    // Check for duplicates within the batch
    const names = inputs.map(input => input.name.toLowerCase());
    const duplicatesInBatch = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicatesInBatch.length > 0) {
      throw new Error('Duplicate names found in batch');
    }

    // Check for duplicates with existing records
    const { data: existing } = await this.supabase
      .from('shoppings')
      .select('name');

    if (existing) {
      const existingNames = existing.map(s => s.name.toLowerCase());
      const duplicates = inputs.filter(input =>
        existingNames.includes(input.name.toLowerCase())
      );
      if (duplicates.length > 0) {
        throw new Error(`The following shoppings already exist: ${duplicates.map(d => d.name).join(', ')}`);
      }
    }

    const records = inputs.map(input => ({
      name: input.name,
      status: 'active',
      search_keywords: generateSearchKeywords(input.name),
    }));

    const { data, error } = await this.supabase
      .from('shoppings')
      .insert(records)
      .select();

    if (error) throw error;
    return (data || []).map(this.mapShopping);
  }

  // Expense Categories
  async listExpenseCategories(query?: SearchQuery): Promise<ExpenseCategory[]> {
    let queryBuilder = this.supabase.from('expense_categories').select('*').order('name');
    
    if (query?.search) queryBuilder = queryBuilder.ilike('name', `%${query.search}%`);

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return (data || []).map(this.mapExpenseCategory);
  }

  async getExpenseCategory(id: string): Promise<ExpenseCategory | null> {
    const { data, error } = await this.supabase.from('expense_categories').select('*').eq('id', id).single();
    if (error) return null;
    return data ? this.mapExpenseCategory(data) : null;
  }

  async createExpenseCategory(category: ExpenseCategoryInput): Promise<ExpenseCategory> {
    // Check for duplicate name
    const { data: existing } = await this.supabase
      .from('expense_categories')
      .select('id')
      .ilike('name', category.name)
      .maybeSingle();

    if (existing) {
      throw new Error('An expense category with this name already exists');
    }

    const searchKeywords = generateSearchKeywords(category.name);
    const { data, error } = await this.supabase
      .from('expense_categories')
      .insert({
        name: category.name,
        status: 'active',
        search_keywords: searchKeywords,
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapExpenseCategory(data);
  }

  async updateExpenseCategory(id: string, category: Partial<ExpenseCategory>): Promise<void> {
    const updates: ExpenseCategoryUpdate = {};
    if (category.name !== undefined) {
      // Check for duplicate name (excluding current record)
      const { data: existing } = await this.supabase
        .from('expense_categories')
        .select('id')
        .ilike('name', category.name)
        .neq('id', id)
        .maybeSingle();

      if (existing) {
        throw new Error('An expense category with this name already exists');
      }

      updates.name = category.name;
      updates.search_keywords = generateSearchKeywords(category.name);
    }

    const { error } = await this.supabase.from('expense_categories').update(updates).eq('id', id);
    if (error) throw error;
  }

  async deleteExpenseCategory(id: string): Promise<void> {
    const { error } = await this.supabase.from('expense_categories').delete().eq('id', id);
    if (error) throw error;
  }

  async duplicateExpenseCategory(id: string): Promise<ExpenseCategory> {
    const original = await this.getExpenseCategory(id);
    if (!original) throw new Error('Expense category not found');
    return this.createExpenseCategory({
      name: `${original.name} (Copy)`,
    });
  }

  async deleteAllExpenseCategories(): Promise<void> {
    const { error } = await this.supabase.from('expense_categories').delete().gte('created_at', '1970-01-01');
    if (error) throw error;
  }

  async bulkCreateExpenseCategories(inputs: ExpenseCategoryInput[]): Promise<ExpenseCategory[]> {
    // Check for duplicates within the batch
    const names = inputs.map(input => input.name.toLowerCase());
    const duplicatesInBatch = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicatesInBatch.length > 0) {
      throw new Error('Duplicate names found in batch');
    }

    // Check for duplicates with existing records
    const { data: existing } = await this.supabase
      .from('expense_categories')
      .select('name');

    if (existing) {
      const existingNames = existing.map(c => c.name.toLowerCase());
      const duplicates = inputs.filter(input =>
        existingNames.includes(input.name.toLowerCase())
      );
      if (duplicates.length > 0) {
        throw new Error(`The following expense categories already exist: ${duplicates.map(d => d.name).join(', ')}`);
      }
    }

    const records = inputs.map(input => ({
      name: input.name,
      status: 'active',
      search_keywords: generateSearchKeywords(input.name),
    }));

    const { data, error } = await this.supabase
      .from('expense_categories')
      .insert(records)
      .select();

    if (error) throw error;
    return (data || []).map(this.mapExpenseCategory);
  }

  // Detailed Expenses
  async listDetailedExpenses(query?: SearchQuery): Promise<DetailedExpense[]> {
    let queryBuilder = this.supabase.from('detailed_expenses').select('*').order('name');
    
    if (query?.status) queryBuilder = queryBuilder.eq('status', query.status);
    if (query?.search) queryBuilder = queryBuilder.ilike('name', `%${query.search}%`);

    const { data, error} = await queryBuilder;
    if (error) throw error;
    return (data || []).map(this.mapDetailedExpense);
  }

  async getDetailedExpense(id: string): Promise<DetailedExpense | null> {
    const { data, error } = await this.supabase.from('detailed_expenses').select('*').eq('id', id).single();
    if (error) return null;
    return data ? this.mapDetailedExpense(data) : null;
  }

  async createDetailedExpense(expense: DetailedExpenseInput): Promise<DetailedExpense> {
    // Check for duplicate name
    const { data: existing } = await this.supabase
      .from('detailed_expenses')
      .select('id')
      .ilike('name', expense.name)
      .maybeSingle();

    if (existing) {
      throw new Error('A detailed expense with this name already exists');
    }

    const searchKeywords = generateSearchKeywords(expense.name);
    const { data, error } = await this.supabase
      .from('detailed_expenses')
      .insert({
        name: expense.name,
        price: expense.price,
        category_id: expense.categoryRef.id,
        category_name_at_booking: expense.categoryRef.nameAtBooking,
        status: 'active',
        search_keywords: searchKeywords,
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapDetailedExpense(data);
  }

  async updateDetailedExpense(id: string, expense: Partial<DetailedExpense>): Promise<void> {
    const updates: DetailedExpenseUpdate = {};
    if (expense.name !== undefined) {
      // Check for duplicate name (excluding current record)
      const { data: existing } = await this.supabase
        .from('detailed_expenses')
        .select('id')
        .ilike('name', expense.name)
        .neq('id', id)
        .maybeSingle();

      if (existing) {
        throw new Error('A detailed expense with this name already exists');
      }

      updates.name = expense.name;
      updates.search_keywords = generateSearchKeywords(expense.name);
    }
    if (expense.price !== undefined) updates.price = expense.price;
    if (expense.categoryRef !== undefined) {
      updates.category_id = expense.categoryRef.id;
      updates.category_name_at_booking = expense.categoryRef.nameAtBooking;
    }
    if (expense.status !== undefined) updates.status = expense.status;

    const { error } = await this.supabase.from('detailed_expenses').update(updates).eq('id', id);
    if (error) throw error;
  }

  async deleteDetailedExpense(id: string): Promise<void> {
    // Soft delete: set status to 'inactive' instead of hard delete
    const { error } = await this.supabase
      .from('detailed_expenses')
      .update({ status: 'inactive' })
      .eq('id', id);
    if (error) throw error;
  }

  async toggleDetailedExpenseStatus(id: string): Promise<void> {
    // Get current status
    const expense = await this.getDetailedExpense(id);
    if (!expense) throw new Error('Detailed expense not found');

    const newStatus = expense.status === 'active' ? 'inactive' : 'active';
    const { error } = await this.supabase
      .from('detailed_expenses')
      .update({ status: newStatus })
      .eq('id', id);
    if (error) throw error;
  }

  async duplicateDetailedExpense(id: string): Promise<DetailedExpense> {
    const original = await this.getDetailedExpense(id);
    if (!original) throw new Error('Detailed expense not found');
    return this.createDetailedExpense({
      name: `${original.name} (Copy)`,
      price: original.price,
      categoryRef: original.categoryRef,
    });
  }

  async deleteAllDetailedExpenses(): Promise<void> {
    const { error } = await this.supabase.from('detailed_expenses').delete().gte('created_at', '1970-01-01');
    if (error) throw error;
  }

  async bulkCreateDetailedExpenses(inputs: DetailedExpenseInput[]): Promise<DetailedExpense[]> {
    // Check for duplicates within the batch
    const names = inputs.map(input => input.name.toLowerCase());
    const duplicatesInBatch = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicatesInBatch.length > 0) {
      throw new Error('Duplicate names found in batch');
    }

    // Check for duplicates with existing records
    const { data: existing } = await this.supabase
      .from('detailed_expenses')
      .select('name');

    if (existing) {
      const existingNames = existing.map(e => e.name.toLowerCase());
      const duplicates = inputs.filter(input =>
        existingNames.includes(input.name.toLowerCase())
      );
      if (duplicates.length > 0) {
        throw new Error(`The following detailed expenses already exist: ${duplicates.map(d => d.name).join(', ')}`);
      }
    }

    const records = inputs.map(input => ({
      name: input.name,
      price: input.price,
      category_id: input.categoryRef.id,
      category_name_at_booking: input.categoryRef.nameAtBooking,
      status: 'active',
      search_keywords: generateSearchKeywords(input.name),
    }));

    const { data, error } = await this.supabase
      .from('detailed_expenses')
      .insert(records)
      .select();

    if (error) throw error;
    return (data || []).map(this.mapDetailedExpense);
  }

  // Diary Types
  async listDiaryTypes(query?: SearchQuery): Promise<DiaryType[]> {
    let queryBuilder = this.supabase.from('diary_types').select('*').order('name');
    
    if (query?.status && query.status !== 'all') queryBuilder = queryBuilder.eq('status', query.status);
    if (query?.search) queryBuilder = queryBuilder.ilike('name', `%${query.search}%`);

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return (data || []).map(this.mapDiaryType);
  }

  async getDiaryType(id: string): Promise<DiaryType | null> {
    const { data, error } = await this.supabase.from('diary_types').select('*').eq('id', id).maybeSingle();
    if (error) return null;
    return data ? this.mapDiaryType(data) : null;
  }

  async createDiaryType(input: DiaryTypeInput): Promise<DiaryType> {
    const { data: existing } = await this.supabase
      .from('diary_types')
      .select('id')
      .ilike('name', input.name)
      .maybeSingle();

    if (existing) {
      throw new Error('A diary type with this name already exists');
    }

    const searchKeywords = generateSearchKeywords(input.name);
    const { data, error } = await this.supabase
      .from('diary_types')
      .insert({
        name: input.name,
        data_type: input.dataType || 'text',
        status: 'active',
        search_keywords: searchKeywords,
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapDiaryType(data);
  }

  async updateDiaryType(id: string, patch: Partial<DiaryType>): Promise<void> {
    const updates: DiaryTypeUpdate = {};

    if (patch.name !== undefined) {
      const { data: existing } = await this.supabase
        .from('diary_types')
        .select('id')
        .ilike('name', patch.name)
        .neq('id', id)
        .maybeSingle();

      if (existing) {
        throw new Error('A diary type with this name already exists');
      }

      updates.name = patch.name;
      updates.search_keywords = generateSearchKeywords(patch.name);
    }
    if (patch.dataType !== undefined) updates.data_type = patch.dataType;
    if (patch.status !== undefined) updates.status = patch.status;

    const { error } = await this.supabase.from('diary_types').update(updates).eq('id', id);
    if (error) throw error;
  }

  async toggleDiaryTypeStatus(id: string): Promise<void> {
    const current = await this.getDiaryType(id);
    if (!current) throw new Error('Diary type not found');
    const newStatus = current.status === 'active' ? 'inactive' : 'active';
    await this.updateDiaryType(id, { status: newStatus });
  }

  async duplicateDiaryType(id: string): Promise<DiaryType> {
    const original = await this.getDiaryType(id);
    if (!original) throw new Error('Diary type not found');
    return this.createDiaryType({
      name: `${original.name} (Copy)`,
      dataType: original.dataType,
    });
  }

  async deleteDiaryType(id: string): Promise<void> {
    const { error } = await this.supabase.from('diary_types').delete().eq('id', id);
    if (error) throw error;
  }

  async deleteAllDiaryTypes(): Promise<void> {
    const { error } = await this.supabase.from('diary_types').delete().gte('created_at', '1970-01-01');
    if (error) throw error;
  }

  async bulkCreateDiaryTypes(inputs: DiaryTypeInput[]): Promise<DiaryType[]> {
    const names = inputs.map(input => input.name.toLowerCase());
    const duplicatesInBatch = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicatesInBatch.length > 0) {
      throw new Error('Duplicate names found in batch');
    }

    const { data: existing } = await this.supabase
      .from('diary_types')
      .select('name');

    if (existing) {
      const existingNames = existing.map(e => e.name.toLowerCase());
      const duplicates = inputs.filter(input =>
        existingNames.includes(input.name.toLowerCase())
      );
      if (duplicates.length > 0) {
        throw new Error(`The following diary types already exist: ${duplicates.map(d => d.name).join(', ')}`);
      }
    }

    const records = inputs.map(input => ({
      name: input.name,
      data_type: input.dataType || 'text',
      status: 'active',
      search_keywords: generateSearchKeywords(input.name),
    }));

    const { data, error } = await this.supabase
      .from('diary_types')
      .insert(records)
      .select();

    if (error) throw error;
    return (data || []).map(this.mapDiaryType);
  }

  // Tour Diaries
  async listTourDiaries(query?: SearchQuery): Promise<TourDiary[]> {
    let queryBuilder = this.supabase.from('tour_diaries').select('*').order('created_at', { ascending: false });
    
    if (query?.search) {
      queryBuilder = queryBuilder.or(`tour_code_at_booking.ilike.%${query.search}%,diary_type_name_at_booking.ilike.%${query.search}%`);
    }

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return (data || []).map(this.mapTourDiary);
  }

  async getTourDiary(id: string): Promise<TourDiary | null> {
    const { data, error } = await this.supabase.from('tour_diaries').select('*').eq('id', id).maybeSingle();
    if (error) return null;
    return data ? this.mapTourDiary(data) : null;
  }

  async createTourDiary(input: TourDiaryInput): Promise<TourDiary> {
    const { data, error } = await this.supabase
      .from('tour_diaries')
      .insert({
        tour_id: input.tourRef.id,
        tour_code_at_booking: input.tourRef.tourCodeAtBooking,
        diary_type_id: input.diaryTypeRef.id,
        diary_type_name_at_booking: input.diaryTypeRef.nameAtBooking,
        diary_type_data_type: input.diaryTypeRef.dataType,
        content_type: input.contentType,
        content_text: input.contentText || '',
        content_urls: input.contentUrls || [],
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapTourDiary(data);
  }

  async updateTourDiary(id: string, patch: Partial<TourDiary>): Promise<void> {
    const updates: any = {};
    
    if (patch.tourRef !== undefined) {
      updates.tour_id = patch.tourRef.id;
      updates.tour_code_at_booking = patch.tourRef.tourCodeAtBooking;
    }
    if (patch.diaryTypeRef !== undefined) {
      updates.diary_type_id = patch.diaryTypeRef.id;
      updates.diary_type_name_at_booking = patch.diaryTypeRef.nameAtBooking;
    }
    if (patch.contentType !== undefined) updates.content_type = patch.contentType;
    if (patch.contentText !== undefined) updates.content_text = patch.contentText;
    if (patch.contentUrls !== undefined) updates.content_urls = patch.contentUrls;

    const { error } = await this.supabase.from('tour_diaries').update(updates).eq('id', id);
    if (error) throw error;
  }

  async duplicateTourDiary(id: string): Promise<TourDiary> {
    const original = await this.getTourDiary(id);
    if (!original) throw new Error('Tour diary not found');
    return this.createTourDiary({
      tourRef: original.tourRef,
      diaryTypeRef: original.diaryTypeRef,
      contentType: original.contentType,
      contentText: original.contentText,
      contentUrls: original.contentUrls,
    });
  }

  async deleteTourDiary(id: string): Promise<void> {
    const { error } = await this.supabase.from('tour_diaries').delete().eq('id', id);
    if (error) throw error;
  }

  async deleteAllTourDiaries(): Promise<void> {
    const { error } = await this.supabase.from('tour_diaries').delete().gte('created_at', '1970-01-01');
    if (error) throw error;
  }

  async bulkCreateTourDiaries(inputs: TourDiaryInput[]): Promise<TourDiary[]> {
    const records = inputs.map(input => ({
      tour_id: input.tourRef.id,
      tour_code_at_booking: input.tourRef.tourCodeAtBooking,
      diary_type_id: input.diaryTypeRef.id,
      diary_type_name_at_booking: input.diaryTypeRef.nameAtBooking,
      content_type: input.contentType,
      content_text: input.contentText || '',
      content_urls: input.contentUrls || [],
    }));

    const { data, error } = await this.supabase
      .from('tour_diaries')
      .insert(records)
      .select();

    if (error) throw error;
    return (data || []).map(this.mapTourDiary);
  }

  // Restaurants
  async listRestaurants(query?: SearchQuery): Promise<Restaurant[]> {
    let queryBuilder = this.supabase.from('restaurants').select('*').order('name');

    if (query?.status) queryBuilder = queryBuilder.eq('status', query.status);
    if (query?.search) queryBuilder = queryBuilder.ilike('name', `%${query.search}%`);
    const { data, error } = await queryBuilder;
    if (error) throw error;
    return (data || []).map(this.mapRestaurant);
  }

  async getRestaurant(id: string): Promise<Restaurant | null> {
    const { data, error } = await this.supabase.from('restaurants').select('*').eq('id', id).single();
    if (error) return null;
    return data ? this.mapRestaurant(data) : null;
  }

  async createRestaurant(input: RestaurantInput): Promise<Restaurant> {
    // Check for duplicate name
    const { data: existing } = await this.supabase
      .from('restaurants')
      .select('id')
      .ilike('name', input.name)
      .maybeSingle();
    if (existing) {
      throw new Error('A restaurant with this name already exists');
    }
    const searchKeywords = generateSearchKeywords(input.name);
    const { data, error } = await this.supabase
      .from('restaurants')
      .insert({
        name: input.name,
        restaurant_type: input.restaurantType,
        phone: input.phone || '',
        address: input.address || '',
        province_id: input.provinceRef.id || null,
        province_name_at_booking: input.provinceRef.nameAtBooking || null,
        commission_for_guide: input.commissionForGuide ?? 0,
        note: input.note || '',
        status: 'active',
        search_keywords: searchKeywords,
      })
      .select()
      .single();
    if (error) throw error;
    return this.mapRestaurant(data);
  }

  async updateRestaurant(id: string, patch: Partial<Restaurant>): Promise<void> {
    const updates: RestaurantUpdate = {};
    if (patch.name !== undefined) {
      // Check for duplicate name (excluding current record)
      const { data: existing } = await this.supabase
        .from('restaurants')
        .select('id')
        .ilike('name', patch.name)
        .neq('id', id)
        .maybeSingle();
      if (existing) {
        throw new Error('A restaurant with this name already exists');
      }
      updates.name = patch.name;
      updates.search_keywords = generateSearchKeywords(patch.name);
    }
    if (patch.restaurantType !== undefined) updates.restaurant_type = patch.restaurantType;
    if (patch.phone !== undefined) updates.phone = patch.phone;
    if (patch.address !== undefined) updates.address = patch.address;
    if (patch.provinceRef !== undefined) {
      updates.province_id = patch.provinceRef.id || null;
      updates.province_name_at_booking = patch.provinceRef.nameAtBooking || null;
    }
    if (patch.commissionForGuide !== undefined) updates.commission_for_guide = patch.commissionForGuide;
    if (patch.note !== undefined) updates.note = patch.note;
    const { error } = await this.supabase.from('restaurants').update(updates).eq('id', id);
    if (error) throw error;
  }

  async toggleRestaurantStatus(id: string): Promise<void> {
    throw new Error('Status toggling is disabled');
  }

  async duplicateRestaurant(id: string): Promise<Restaurant> {
    const original = await this.getRestaurant(id);
    if (!original) throw new Error('Restaurant not found');
    return this.createRestaurant({
      name: `${original.name} (Copy)`,
      restaurantType: original.restaurantType,
      phone: original.phone,
      address: original.address,
      provinceRef: original.provinceRef,
      commissionForGuide: original.commissionForGuide,
      note: original.note,
    });
  }

  async deleteRestaurant(id: string): Promise<void> {
    const { error } = await this.supabase.from('restaurants').delete().eq('id', id);
    if (error) throw error;
  }

  async deleteAllRestaurants(): Promise<void> {
    const { error } = await this.supabase.from('restaurants').delete().gte('created_at', '1970-01-01');
    if (error) throw error;
  }

  async bulkCreateRestaurants(inputs: RestaurantInput[]): Promise<Restaurant[]> {
    // Check for duplicates within the batch
    const names = inputs.map(input => input.name.toLowerCase());
    const duplicatesInBatch = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicatesInBatch.length > 0) {
      throw new Error('Duplicate names found in batch');
    }
    // Check for duplicates with existing records
    const { data: existing } = await this.supabase
      .from('restaurants')
      .select('name');
    if (existing) {
      const existingNames = existing.map(r => r.name.toLowerCase());
      const duplicates = inputs.filter(input =>
        existingNames.includes(input.name.toLowerCase())
      );
      if (duplicates.length > 0) {
        throw new Error(`The following restaurants already exist: ${duplicates.map(d => d.name).join(', ')}`);
      }
    }
    const records = inputs.map(input => ({
      name: input.name,
      restaurant_type: input.restaurantType,
      phone: input.phone || '',
      address: input.address || '',
      commission_for_guide: input.commissionForGuide ?? 0,
      note: input.note || '',
      status: 'active',
      search_keywords: generateSearchKeywords(input.name),
    }));
    const { data, error } = await this.supabase
      .from('restaurants')
      .insert(records)
      .select();
    if (error) throw error;
    return (data || []).map(this.mapRestaurant);
  }

  // Shop Places
  async listShopPlaces(query?: SearchQuery): Promise<ShopPlace[]> {
    let queryBuilder = this.supabase.from('shop_places').select('*').order('name');

    if (query?.status) queryBuilder = queryBuilder.eq('status', query.status);
    if (query?.search) queryBuilder = queryBuilder.ilike('name', `%${query.search}%`);
    const { data, error } = await queryBuilder;
    if (error) throw error;
    return (data || []).map(this.mapShopPlace);
  }

  async getShopPlace(id: string): Promise<ShopPlace | null> {
    const { data, error } = await this.supabase.from('shop_places').select('*').eq('id', id).single();
    if (error) return null;
    return data ? this.mapShopPlace(data) : null;
  }

  async createShopPlace(input: ShopPlaceInput): Promise<ShopPlace> {
    // Check for duplicate name
    const { data: existing } = await this.supabase
      .from('shop_places')
      .select('id')
      .ilike('name', input.name)
      .maybeSingle();
    if (existing) {
      throw new Error('A shop place with this name already exists');
    }
    const searchKeywords = generateSearchKeywords(input.name);
    const { data, error } = await this.supabase
      .from('shop_places')
      .insert({
        name: input.name,
        shop_type: input.shopType,
        phone: input.phone || '',
        address: input.address || '',
        province_id: input.provinceRef.id || null,
        province_name_at_booking: input.provinceRef.nameAtBooking || null,
        commission_for_guide: input.commissionForGuide ?? 0,
        note: input.note || '',
        status: 'active',
        search_keywords: searchKeywords,
      })
      .select()
      .single();
    if (error) throw error;
    return this.mapShopPlace(data);
  }

  async updateShopPlace(id: string, patch: Partial<ShopPlace>): Promise<void> {
    const updates: ShopPlaceUpdate = {};
    if (patch.name !== undefined) {
      // Check for duplicate name (excluding current record)
      const { data: existing } = await this.supabase
        .from('shop_places')
        .select('id')
        .ilike('name', patch.name)
        .neq('id', id)
        .maybeSingle();
      if (existing) {
        throw new Error('A shop place with this name already exists');
      }
      updates.name = patch.name;
      updates.search_keywords = generateSearchKeywords(patch.name);
    }
    if (patch.shopType !== undefined) updates.shop_type = patch.shopType;
    if (patch.phone !== undefined) updates.phone = patch.phone;
    if (patch.address !== undefined) updates.address = patch.address;
    if (patch.provinceRef !== undefined) {
      updates.province_id = patch.provinceRef.id || null;
      updates.province_name_at_booking = patch.provinceRef.nameAtBooking || null;
    }
    if (patch.commissionForGuide !== undefined) updates.commission_for_guide = patch.commissionForGuide;
    if (patch.note !== undefined) updates.note = patch.note;
    const { error } = await this.supabase.from('shop_places').update(updates).eq('id', id);
    if (error) throw error;
  }

  async toggleShopPlaceStatus(id: string): Promise<void> {
    throw new Error('Status toggling is disabled');
  }

  async duplicateShopPlace(id: string): Promise<ShopPlace> {
    const original = await this.getShopPlace(id);
    if (!original) throw new Error('Shop place not found');
    return this.createShopPlace({
      name: `${original.name} (Copy)`,
      shopType: original.shopType,
      phone: original.phone,
      address: original.address,
      provinceRef: original.provinceRef,
      commissionForGuide: original.commissionForGuide,
      note: original.note,
    });
  }

  async deleteShopPlace(id: string): Promise<void> {
    const { error } = await this.supabase.from('shop_places').delete().eq('id', id);
    if (error) throw error;
  }

  async deleteAllShopPlaces(): Promise<void> {
    const { error } = await this.supabase.from('shop_places').delete().gte('created_at', '1970-01-01');
    if (error) throw error;
  }

  async bulkCreateShopPlaces(inputs: ShopPlaceInput[]): Promise<ShopPlace[]> {
    // Check for duplicates within the batch
    const names = inputs.map(input => input.name.toLowerCase());
    const duplicatesInBatch = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicatesInBatch.length > 0) {
      throw new Error('Duplicate names found in batch');
    }
    // Check for duplicates with existing records
    const { data: existing } = await this.supabase
      .from('shop_places')
      .select('name');
    if (existing) {
      const existingNames = existing.map(s => s.name.toLowerCase());
      const duplicates = inputs.filter(input =>
        existingNames.includes(input.name.toLowerCase())
      );
      if (duplicates.length > 0) {
        throw new Error(`The following shop places already exist: ${duplicates.map(d => d.name).join(', ')}`);
      }
    }
    const records = inputs.map(input => ({
      name: input.name,
      shop_type: input.shopType,
      phone: input.phone || '',
      address: input.address || '',
      commission_for_guide: input.commissionForGuide ?? 0,
      note: input.note || '',
      status: 'active',
      search_keywords: generateSearchKeywords(input.name),
    }));
    const { data, error } = await this.supabase
      .from('shop_places')
      .insert(records)
      .select();
    if (error) throw error;
    return (data || []).map(this.mapShopPlace);
  }

  // Hotels
  async listHotels(query?: SearchQuery): Promise<Hotel[]> {
    let queryBuilder = this.supabase.from('hotels').select('*').order('name');

    if (query?.status) queryBuilder = queryBuilder.eq('status', query.status);
    if (query?.search) queryBuilder = queryBuilder.ilike('name', `%${query.search}%`);
    const { data, error } = await queryBuilder;
    if (error) throw error;
    return (data || []).map(this.mapHotel);
  }

  async getHotel(id: string): Promise<Hotel | null> {
    const { data, error } = await this.supabase.from('hotels').select('*').eq('id', id).single();
    if (error) return null;
    return data ? this.mapHotel(data) : null;
  }

  async createHotel(input: HotelInput): Promise<Hotel> {
    // Check for duplicate name
    const { data: existing } = await this.supabase
      .from('hotels')
      .select('id')
      .ilike('name', input.name)
      .maybeSingle();
    if (existing) {
      throw new Error('A hotel with this name already exists');
    }
    const searchKeywords = generateSearchKeywords(input.name);
    const { data, error } = await this.supabase
      .from('hotels')
      .insert({
        name: input.name,
        owner_name: input.ownerName,
        owner_phone: input.ownerPhone,
        room_type: input.roomType,
        price_per_night: input.pricePerNight,
        address: input.address || '',
        province_id: input.provinceRef.id || null,
        province_name_at_booking: input.provinceRef.nameAtBooking || null,
        note: input.note || '',
        status: 'active',
        search_keywords: searchKeywords,
      })
      .select()
      .single();
    if (error) throw error;
    return this.mapHotel(data);
  }

  async updateHotel(id: string, patch: Partial<Hotel>): Promise<void> {
    const updates: HotelUpdate = {};
    if (patch.name !== undefined) {
      // Check for duplicate name (excluding current record)
      const { data: existing } = await this.supabase
        .from('hotels')
        .select('id')
        .ilike('name', patch.name)
        .neq('id', id)
        .maybeSingle();
      if (existing) {
        throw new Error('A hotel with this name already exists');
      }
      updates.name = patch.name;
      updates.search_keywords = generateSearchKeywords(patch.name);
    }
    if (patch.ownerName !== undefined) updates.owner_name = patch.ownerName;
    if (patch.ownerPhone !== undefined) updates.owner_phone = patch.ownerPhone;
    if (patch.roomType !== undefined) updates.room_type = patch.roomType;
    if (patch.pricePerNight !== undefined) updates.price_per_night = patch.pricePerNight;
    if (patch.address !== undefined) updates.address = patch.address;
    if (patch.provinceRef !== undefined) {
      updates.province_id = patch.provinceRef.id || null;
      updates.province_name_at_booking = patch.provinceRef.nameAtBooking || null;
    }
    if (patch.note !== undefined) updates.note = patch.note;
    const { error } = await this.supabase.from('hotels').update(updates).eq('id', id);
    if (error) throw error;
  }

  async toggleHotelStatus(id: string): Promise<void> {
    throw new Error('Status toggling is disabled');
  }

  async duplicateHotel(id: string): Promise<Hotel> {
    const original = await this.getHotel(id);
    if (!original) throw new Error('Hotel not found');
    return this.createHotel({
      name: `${original.name} (Copy)`,
      ownerName: original.ownerName,
      ownerPhone: original.ownerPhone,
      roomType: original.roomType,
      pricePerNight: original.pricePerNight,
      address: original.address,
      provinceRef: original.provinceRef,
      note: original.note,
    });
  }

  async deleteHotel(id: string): Promise<void> {
    const { error } = await this.supabase.from('hotels').delete().eq('id', id);
    if (error) throw error;
  }

  async deleteAllHotels(): Promise<void> {
    const { error } = await this.supabase.from('hotels').delete().gte('created_at', '1970-01-01');
    if (error) throw error;
  }

  async bulkCreateHotels(inputs: HotelInput[]): Promise<Hotel[]> {
    // Check for duplicates within the batch
    const names = inputs.map(input => input.name.toLowerCase());
    const duplicatesInBatch = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicatesInBatch.length > 0) {
      throw new Error('Duplicate names found in batch');
    }
    // Check for duplicates with existing records
    const { data: existing } = await this.supabase
      .from('hotels')
      .select('name');
    if (existing) {
      const existingNames = existing.map(h => h.name.toLowerCase());
      const duplicates = inputs.filter(input =>
        existingNames.includes(input.name.toLowerCase())
      );
      if (duplicates.length > 0) {
        throw new Error(`The following hotels already exist: ${duplicates.map(d => d.name).join(', ')}`);
      }
    }
    const records = inputs.map(input => ({
      name: input.name,
      owner_name: input.ownerName,
      owner_phone: input.ownerPhone,
      room_type: input.roomType,
      price_per_night: input.pricePerNight,
      address: input.address || '',
      note: input.note || '',
      status: 'active',
      search_keywords: generateSearchKeywords(input.name),
    }));
    const { data, error } = await this.supabase
      .from('hotels')
      .insert(records)
      .select();
    if (error) throw error;
    return (data || []).map(this.mapHotel);
  }

  // Tours
  async listTours(query?: TourQuery, options?: { includeDetails?: boolean }): Promise<TourListResult> {
    const includeDetails = options?.includeDetails ?? false;

    // Fetch tours with optional nested relations to avoid unnecessary payload
    let queryBuilder = this.supabase
      .from('tours')
      .select(
        includeDetails
          ? `
        *,
        tour_destinations(*),
        tour_expenses(*),
        tour_meals(*),
        tour_allowances(*),
        tour_shoppings(*)
      `
          : `*, tour_allowances(price, quantity)`,
        { count: 'exact' }
      );

    // Apply sorting based on query parameters
    const sortBy = query?.sortBy || 'startDate';
    const sortOrder = query?.sortOrder || 'desc';

    const sortColumnMap: Record<string, string> = {
      startDate: 'start_date',
      endDate: 'end_date',
      tourCode: 'tour_code',
      clientName: 'client_name',
      createdAt: 'created_at',
    };

    queryBuilder = queryBuilder.order(sortColumnMap[sortBy] || 'start_date', { ascending: sortOrder === 'asc' });

    if (includeDetails) {
      // Ensure nested arrays are consistently ordered by date
      queryBuilder = queryBuilder
        .order('date', { foreignTable: 'tour_destinations' })
        .order('date', { foreignTable: 'tour_expenses' })
        .order('date', { foreignTable: 'tour_meals' })
        .order('date', { foreignTable: 'tour_allowances' })
        .order('date', { foreignTable: 'tour_shoppings' });
    }

    // Granular search fields (prefer these for performance)
    if (query?.tourCodeLike) {
      const like = `%${query.tourCodeLike.trim()}%`;
      queryBuilder = queryBuilder.ilike('tour_code', like);
    } else if (query?.tourCode) {
      const like = `%${query.tourCode.trim()}%`;
      queryBuilder = queryBuilder.ilike('tour_code', like);
    }

    if (query?.companyNameLike) {
      const like = `%${query.companyNameLike.trim()}%`;
      queryBuilder = queryBuilder.ilike('company_name_at_booking', like);
    }

    if (query?.dateLike || query?.dateLike2 || query?.dateRawLike) {
      const like1 = query?.dateLike ? `%${query.dateLike.trim()}%` : undefined;
      const like2 = query?.dateLike2 ? `%${query.dateLike2.trim()}%` : undefined;
      const likeRaw = query?.dateRawLike ? `%${query.dateRawLike.trim()}%` : undefined;
      const parts: string[] = [];
      if (like1) parts.push(`start_date.ilike.${like1}`);
      if (like2) parts.push(`start_date.ilike.${like2}`);
      if (likeRaw) parts.push(`start_date.ilike.${likeRaw}`);
      if (parts.length === 1) {
        // Only one like — apply directly
        const single = like1 || like2 || likeRaw;
        queryBuilder = queryBuilder.ilike('start_date', single as string);
      } else if (parts.length > 1) {
        queryBuilder = queryBuilder.or(parts.join(','));
      }
    }
    if (query?.clientName) queryBuilder = queryBuilder.ilike('client_name', `%${query.clientName}%`);
    if (query?.companyId) queryBuilder = queryBuilder.eq('company_id', query.companyId);
    if (query?.guideId) queryBuilder = queryBuilder.eq('guide_id', query.guideId);
    if (query?.startDate) queryBuilder = queryBuilder.gte('end_date', query.startDate);
    if (query?.endDate) queryBuilder = queryBuilder.lte('start_date', query.endDate);
    if (query?.nationalityId) queryBuilder = queryBuilder.eq('nationality_id', query.nationalityId);

    const limit = typeof query?.limit === 'number' ? query.limit : undefined;
    const offset = typeof query?.offset === 'number' ? query.offset : undefined;

    if (typeof limit === 'number' && limit > 0) {
      if (typeof offset === 'number' && offset >= 0) {
        queryBuilder = queryBuilder.range(offset, offset + limit - 1);
      } else {
        queryBuilder = queryBuilder.limit(limit);
      }
    } else if (limit === 0) {
      queryBuilder = queryBuilder.limit(0);
    }

    const { data, error, count } = await queryBuilder;
    if (error) throw error;

    const tours = (data || []).map((row) => {
      const typedRow = row as TourRowWithDetails;
      const tour = this.mapTour(row);
      if (includeDetails) {
        tour.destinations = (typedRow.tour_destinations || []).map((d) => ({
          name: d.name,
          price: Number(d.price) || 0,
          date: d.date,
          guests: d.guests !== null && d.guests !== undefined ? Number(d.guests) : undefined,
        }));
        tour.expenses = (typedRow.tour_expenses || []).map((e) => ({
          name: e.name,
          price: Number(e.price) || 0,
          date: e.date,
          guests: e.guests !== null && e.guests !== undefined ? Number(e.guests) : undefined,
        }));
        tour.meals = (typedRow.tour_meals || []).map((m) => ({
          name: m.name,
          price: Number(m.price) || 0,
          date: m.date,
          guests: m.guests !== null && m.guests !== undefined ? Number(m.guests) : undefined,
        }));
        tour.allowances = (typedRow.tour_allowances || []).map((a) => ({
          date: a.date,
          name: a.name,
          price: Number(a.price) || 0,
          quantity: a.quantity || 1,
        }));
        tour.shoppings = (typedRow.tour_shoppings || []).map((s) => ({
          name: s.name,
          price: Number(s.price) || 0,
          date: s.date,
        }));
      } else {
        // When not including full details, still map allowances for total calculation
        tour.allowances = (typedRow.tour_allowances || []).map((a) => ({
          date: '',
          name: '',
          price: Number(a.price) || 0,
          quantity: a.quantity || 1,
        }));
      }
      return tour;
    });

    // Enrich tours with calculated summaries ONLY if includeDetails is true
    const enrichedTours = includeDetails ? enrichToursWithSummaries(tours) : tours;

    return {
      tours: enrichedTours,
      total: typeof count === 'number' ? count : tours.length,
    };
  }

  async getTour(id: string): Promise<Tour | null> {
    // Single query with nested relations for the tour detail
    const { data, error } = await this.supabase
      .from('tours')
      .select(`
        *,
        tour_destinations(*),
        tour_expenses(*),
        tour_meals(*),
        tour_allowances(*),
        tour_shoppings(*)
      `)
      .eq('id', id)
      .order('date', { foreignTable: 'tour_destinations' })
      .order('date', { foreignTable: 'tour_expenses' })
      .order('date', { foreignTable: 'tour_meals' })
      .order('date', { foreignTable: 'tour_allowances' })
      .order('date', { foreignTable: 'tour_shoppings' })
      .single();

    if (error) return null;
    if (!data) return null;

    const tour = this.mapTour(data as any);
    const row: any = data;
    tour.destinations = (row.tour_destinations || []).map((d: any) => ({
      name: d.name,
      price: Number(d.price) || 0,
      date: d.date,
      guests: d.guests !== null && d.guests !== undefined ? Number(d.guests) : undefined,
    }));
    tour.expenses = (row.tour_expenses || []).map((e: any) => ({
      name: e.name,
      price: Number(e.price) || 0,
      date: e.date,
      guests: e.guests !== null && e.guests !== undefined ? Number(e.guests) : undefined,
    }));
    tour.meals = (row.tour_meals || []).map((m: any) => ({
      name: m.name,
      price: Number(m.price) || 0,
      date: m.date,
      guests: m.guests !== null && m.guests !== undefined ? Number(m.guests) : undefined,
    }));
    tour.allowances = (row.tour_allowances || []).map((a: any) => ({
      date: a.date,
      name: a.name,
      price: Number(a.price) || 0,
      quantity: a.quantity || 1,
    }));
    tour.shoppings = (row.tour_shoppings || []).map((s: any) => ({
      name: s.name,
      price: Number(s.price) || 0,
      date: s.date,
    }));

    // Enrich tour with calculated summary
    return enrichTourWithSummary(tour);
  }

  async createTour(tour: TourInput & { destinations?: Destination[]; expenses?: Expense[]; meals?: Meal[]; allowances?: Allowance[]; shoppings?: TourShopping[]; summary?: TourSummary }): Promise<Tour> {
    // Check for duplicate tour code
    const { data: existing } = await this.supabase
      .from('tours')
      .select('id')
      .ilike('tour_code', tour.tourCode)
      .maybeSingle();

    if (existing) {
      throw new Error('A tour with this tour code already exists');
    }

    const totalGuests = (tour.adults || 0) + (tour.children || 0);
    // Total Days = (end date - start date) + 1 (inclusive, counting both start and end days)
    const totalDays = Math.max(1, differenceInDays(new Date(tour.endDate), new Date(tour.startDate)) + 1);

    const { data, error } = await this.supabase
      .from('tours')
      .insert({
        tour_code: tour.tourCode,
        company_id: tour.companyRef.id,
        company_name_at_booking: tour.companyRef.nameAtBooking,
        guide_id: tour.guideRef.id,
        guide_name_at_booking: tour.guideRef.nameAtBooking,
        nationality_id: tour.clientNationalityRef.id,
        nationality_name_at_booking: tour.clientNationalityRef.nameAtBooking,
        client_name: tour.clientName,
        adults: tour.adults,
        children: tour.children,
        total_guests: totalGuests,
        driver_name: tour.driverName || '',
        client_phone: tour.clientPhone || '',
        start_date: tour.startDate,
        end_date: tour.endDate,
        total_days: totalDays,
        notes: tour.notes || '',
        total_tabs: tour.summary?.totalTabs ?? 0,
        advance_payment: tour.summary?.advancePayment ?? 0,
        total_after_advance: tour.summary?.totalAfterAdvance ?? 0,
        company_tip: tour.summary?.companyTip ?? 0,
        total_after_tip: tour.summary?.totalAfterTip ?? 0,
        collections_for_company: tour.summary?.collectionsForCompany ?? 0,
        total_after_collections: tour.summary?.totalAfterCollections ?? 0,
        final_total: tour.summary?.finalTotal ?? 0,
      })
      .select()
      .single();


    if (error) {
      console.error('Supabase createTour error:', error);
      if (error.code === '23505') {
        throw new Error('A tour with this tour code already exists');
      } else if (error.code === '23503') {
        throw new Error('Invalid reference to company, guide, or nationality');
      } else if (error.code === '23502') {
        throw new Error('Required field is missing');
      } else if (error.code === '22001') {
        throw new Error('Data value too long');
      } else if (error.code === '22003') {
        throw new Error('Numeric value out of range');
      } else if (error.code === '22007') {
        throw new Error('Invalid date format');
      } else if (error.code === '42P01') {
        throw new Error('Database table not found');
      } else if (error.code === '42501') {
        throw new Error('Permission denied');
      } else {
        // Log detailed error information
        console.error('Supabase error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          operation: 'createTour',
          tourData: tour
        });
        throw new Error(`Database error: ${error.message} (Code: ${error.code})`);
      }
    }
    
    const createdTour = await this.getTour(data.id) as Tour;
    
    // Add subcollections if provided
    try {
      if (tour.destinations && tour.destinations.length > 0) {
        await Promise.all(tour.destinations.map(dest => this.addDestination(createdTour.id, dest)));
      }
      if (tour.expenses && tour.expenses.length > 0) {
        await Promise.all(tour.expenses.map(exp => this.addExpense(createdTour.id, exp)));
      }
      if (tour.meals && tour.meals.length > 0) {
        await Promise.all(tour.meals.map(meal => this.addMeal(createdTour.id, meal)));
      }
      if (tour.allowances && tour.allowances.length > 0) {
        await Promise.all(tour.allowances.map(allow => this.addAllowance(createdTour.id, allow)));
      }
      if (tour.shoppings && tour.shoppings.length > 0) {
        await Promise.all(tour.shoppings.map(shop => this.addTourShopping(createdTour.id, shop)));
      }
      if (tour.summary) {
        await this.updateTour(createdTour.id, { summary: tour.summary });
      }
    } catch (subcollectionError) {
      console.error('Error adding subcollections:', subcollectionError);
      // Don't fail the entire import if subcollections fail
      // The main tour was created successfully
    }
    
    return createdTour;
  }

  async updateTour(id: string, tour: Partial<Tour>): Promise<void> {
    const updates: any = {};
    if (tour.tourCode !== undefined) {
      // Check for duplicate tour code (excluding current record)
      const { data: existing } = await this.supabase
        .from('tours')
        .select('id')
        .ilike('tour_code', tour.tourCode)
        .neq('id', id)
        .maybeSingle();

      if (existing) {
        throw new Error('A tour with this tour code already exists');
      }

      updates.tour_code = tour.tourCode;
    }
    if (tour.companyRef !== undefined) {
      updates.company_id = tour.companyRef.id;
      updates.company_name_at_booking = tour.companyRef.nameAtBooking;
    }
    if (tour.guideRef !== undefined) {
      updates.guide_id = tour.guideRef.id;
      updates.guide_name_at_booking = tour.guideRef.nameAtBooking;
    }
    if (tour.clientNationalityRef !== undefined) {
      updates.nationality_id = tour.clientNationalityRef.id;
      updates.nationality_name_at_booking = tour.clientNationalityRef.nameAtBooking;
    }
    if (tour.clientName !== undefined) updates.client_name = tour.clientName;
    if (tour.adults !== undefined) updates.adults = tour.adults;
    if (tour.children !== undefined) updates.children = tour.children;
    if (tour.totalGuests !== undefined) updates.total_guests = tour.totalGuests;
    if (tour.driverName !== undefined) updates.driver_name = tour.driverName;
    if (tour.clientPhone !== undefined) updates.client_phone = tour.clientPhone;
    if (tour.startDate !== undefined) updates.start_date = tour.startDate;
    if (tour.endDate !== undefined) updates.end_date = tour.endDate;
    if (tour.totalDays !== undefined) updates.total_days = tour.totalDays;
    if (tour.notes !== undefined) updates.notes = tour.notes;
    if (tour.summary !== undefined) {
      updates.total_tabs = tour.summary.totalTabs ?? 0;
      updates.advance_payment = tour.summary.advancePayment ?? 0;
      updates.total_after_advance = tour.summary.totalAfterAdvance ?? 0;
      updates.company_tip = tour.summary.companyTip ?? 0;
      updates.total_after_tip = tour.summary.totalAfterTip ?? 0;
      updates.collections_for_company = tour.summary.collectionsForCompany ?? 0;
      updates.total_after_collections = tour.summary.totalAfterCollections ?? 0;
      updates.final_total = tour.summary.finalTotal ?? 0;
    }

    const { error } = await this.supabase.from('tours').update(updates).eq('id', id);
    if (error) throw error;
  }

  async deleteTour(id: string): Promise<void> {
    console.log('SupabaseStore: Deleting tour with ID:', id);
    const { error } = await this.supabase.from('tours').delete().eq('id', id);
    if (error) {
      console.error('SupabaseStore: Delete tour error:', error);
      throw error;
    }
    console.log('SupabaseStore: Tour deleted successfully');
  }

  async deleteAllTours(): Promise<void> {
    const { error } = await this.supabase.from('tours').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw error;
  }

  async duplicateTour(id: string): Promise<Tour> {
    const original = await this.getTour(id);
    if (!original) throw new Error('Tour not found');

    // Generate unique tour code
    let newTourCode = `${original.tourCode} (Copy)`;
    let counter = 1;

    while (true) {
      const { data: existing } = await this.supabase
        .from('tours')
        .select('id')
        .ilike('tour_code', newTourCode)
        .maybeSingle();

      if (!existing) break;

      counter++;
      newTourCode = `${original.tourCode} (Copy ${counter})`;
    }

    return this.createTour({
      tourCode: newTourCode,
      companyRef: original.companyRef,
      guideRef: original.guideRef,
      clientNationalityRef: original.clientNationalityRef,
      clientName: original.clientName,
      clientPhone: original.clientPhone,
      adults: original.adults,
      children: original.children,
      driverName: original.driverName,
      startDate: original.startDate,
      endDate: original.endDate,
    });
  }

  // Helper to recalculate and save tour summary
  private async recalculateTourSummary(tourId: string): Promise<void> {
    // Fetch the full tour with all details
    const tour = await this.getTour(tourId);
    if (!tour) return;

    // Calculate summary using the utility function (already enriched by getTour)
    const summary = tour.summary;

    // Save to database
    await this.supabase.from('tours').update({
      total_tabs: summary.totalTabs,
      advance_payment: summary.advancePayment,
      total_after_advance: summary.totalAfterAdvance,
      company_tip: summary.companyTip,
      total_after_tip: summary.totalAfterTip,
      collections_for_company: summary.collectionsForCompany,
      total_after_collections: summary.totalAfterCollections,
      final_total: summary.finalTotal,
    }).eq('id', tourId);
  }

  // Tour Destinations
  async getDestinations(tourId: string): Promise<Destination[]> {
    const { data, error } = await this.supabase.from('tour_destinations').select('*').eq('tour_id', tourId).order('date');
    if (error) throw error;
    return (data || []).map((row) => ({
      name: row.name,
      price: Number(row.price) || 0,
      date: row.date,
      guests: typeof row.guests === 'number' ? row.guests : undefined,
    }));
  }

  async addDestination(tourId: string, destination: Destination): Promise<void> {
    const { error } = await this.supabase.from('tour_destinations').insert({
      tour_id: tourId,
      name: destination.name,
      price: destination.price,
      date: destination.date,
      guests: destination.guests ?? null,
    });
    if (error) {
      console.error('Supabase addDestination error:', error);
      if (error.code === '23503') {
        throw new Error('Invalid tour reference');
      } else if (error.code === '23502') {
        throw new Error('Required destination field is missing');
      } else if (error.code === '22001') {
        throw new Error('Destination data too long');
      } else if (error.code === '22003') {
        throw new Error('Invalid destination price');
      } else if (error.code === '22007') {
        throw new Error('Invalid destination date format');
      } else {
        throw new Error(`Failed to add destination: ${error.message}`);
      }
    }
    // Recalculate and save summary
    await this.recalculateTourSummary(tourId);
  }

  async updateDestination(tourId: string, index: number, destination: Destination): Promise<void> {
    const { data: rows } = await this.supabase.from('tour_destinations').select('id').eq('tour_id', tourId).order('date');
    if (rows && rows[index]) {
      const { error } = await this.supabase.from('tour_destinations').update({
        name: destination.name,
        price: destination.price,
        date: destination.date,
        guests: destination.guests ?? null,
      }).eq('id', rows[index].id);
      if (error) throw error;
      // Recalculate and save summary
      await this.recalculateTourSummary(tourId);
    }
  }

  async removeDestination(tourId: string, index: number): Promise<void> {
    const { data: rows } = await this.supabase.from('tour_destinations').select('id').eq('tour_id', tourId).order('date');
    if (rows && rows[index]) {
      const { error } = await this.supabase.from('tour_destinations').delete().eq('id', rows[index].id);
      if (error) throw error;
      // Recalculate and save summary
      await this.recalculateTourSummary(tourId);
    }
  }

  // Tour Expenses
  async getExpenses(tourId: string): Promise<Expense[]> {
    const { data, error } = await this.supabase.from('tour_expenses').select('*').eq('tour_id', tourId).order('date');
    if (error) throw error;
    return (data || []).map((row) => ({
      name: row.name,
      price: Number(row.price) || 0,
      date: row.date,
      guests: row.guests !== null && row.guests !== undefined ? Number(row.guests) : undefined,
    }));
  }

  async addExpense(tourId: string, expense: Expense): Promise<void> {
    const { error } = await this.supabase.from('tour_expenses').insert({
      tour_id: tourId,
      name: expense.name,
      price: expense.price,
      date: expense.date,
      guests: expense.guests,
    });
    if (error) throw error;
    // Recalculate and save summary
    await this.recalculateTourSummary(tourId);
  }

  async updateExpense(tourId: string, index: number, expense: Expense): Promise<void> {
    const { data: rows } = await this.supabase.from('tour_expenses').select('id').eq('tour_id', tourId).order('date');
    if (rows && rows[index]) {
      console.log('Updating expense in DB - ID:', rows[index].id, 'Guests:', expense.guests);
      const updateData = {
        name: expense.name,
        price: expense.price,
        date: expense.date,
        guests: expense.guests,
      };
      console.log('Update data:', updateData);
      const { error } = await this.supabase.from('tour_expenses').update(updateData).eq('id', rows[index].id);
      if (error) {
        console.error('Error updating expense:', error);
        throw error;
      }
      console.log('Expense updated successfully in DB');
      // Recalculate and save summary
      await this.recalculateTourSummary(tourId);
    }
  }

  async removeExpense(tourId: string, index: number): Promise<void> {
    const { data: rows } = await this.supabase.from('tour_expenses').select('id').eq('tour_id', tourId).order('date');
    if (rows && rows[index]) {
      const { error } = await this.supabase.from('tour_expenses').delete().eq('id', rows[index].id);
      if (error) throw error;
      // Recalculate and save summary
      await this.recalculateTourSummary(tourId);
    }
  }

  // Tour Meals
  async getMeals(tourId: string): Promise<Meal[]> {
    const { data, error } = await this.supabase.from('tour_meals').select('*').eq('tour_id', tourId).order('date');
    if (error) throw error;
    return (data || []).map((row) => ({
      name: row.name,
      price: Number(row.price) || 0,
      date: row.date,
      guests: row.guests !== null && row.guests !== undefined ? Number(row.guests) : undefined,
    }));
  }

  async addMeal(tourId: string, meal: Meal): Promise<void> {
    const { error } = await this.supabase.from('tour_meals').insert({
      tour_id: tourId,
      name: meal.name,
      price: meal.price,
      date: meal.date,
      guests: meal.guests ?? null,
    });
    if (error) throw error;
    // Recalculate and save summary
    await this.recalculateTourSummary(tourId);
  }

  async updateMeal(tourId: string, index: number, meal: Meal): Promise<void> {
    const { data: rows } = await this.supabase.from('tour_meals').select('id').eq('tour_id', tourId).order('date');
    if (rows && rows[index]) {
      const { error } = await this.supabase.from('tour_meals').update({
        name: meal.name,
        price: meal.price,
        date: meal.date,
        guests: meal.guests ?? null,
      }).eq('id', rows[index].id);
      if (error) throw error;
      // Recalculate and save summary
      await this.recalculateTourSummary(tourId);
    }
  }

  async removeMeal(tourId: string, index: number): Promise<void> {
    const { data: rows } = await this.supabase.from('tour_meals').select('id').eq('tour_id', tourId).order('date');
    if (rows && rows[index]) {
      const { error } = await this.supabase.from('tour_meals').delete().eq('id', rows[index].id);
      if (error) throw error;
      // Recalculate and save summary
      await this.recalculateTourSummary(tourId);
    }
  }

  // Tour Allowances
  async getAllowances(tourId: string): Promise<Allowance[]> {
    const { data, error } = await this.supabase.from('tour_allowances').select('*').eq('tour_id', tourId).order('date');
    if (error) throw error;
    return (data || []).map((row) => ({
      date: row.date,
      name: row.name,
      price: Number(row.price) || 0,
      quantity: row.quantity || 1,
    }));
  }

  async addAllowance(tourId: string, allowance: Allowance): Promise<void> {
    const { error } = await this.supabase.from('tour_allowances').insert({
      tour_id: tourId,
      date: allowance.date,
      name: allowance.name,
      price: allowance.price,
      quantity: allowance.quantity || 1,
    });
    if (error) throw error;
    // Recalculate and save summary
    await this.recalculateTourSummary(tourId);
  }

  async updateAllowance(tourId: string, index: number, allowance: Allowance): Promise<void> {
    const { data: rows } = await this.supabase.from('tour_allowances').select('id').eq('tour_id', tourId).order('date');
    if (rows && rows[index]) {
      const { error } = await this.supabase.from('tour_allowances').update({
        date: allowance.date,
        name: allowance.name,
        price: allowance.price,
        quantity: allowance.quantity || 1,
      }).eq('id', rows[index].id);
      if (error) throw error;
      // Recalculate and save summary
      await this.recalculateTourSummary(tourId);
    }
  }

  async removeAllowance(tourId: string, index: number): Promise<void> {
    const { data: rows } = await this.supabase.from('tour_allowances').select('id').eq('tour_id', tourId).order('date');
    if (rows && rows[index]) {
      const { error } = await this.supabase.from('tour_allowances').delete().eq('id', rows[index].id);
      if (error) throw error;
      // Recalculate and save summary
      await this.recalculateTourSummary(tourId);
    }
  }

  // Tour Shoppings
  async getTourShoppings(tourId: string): Promise<TourShopping[]> {
    const { data, error } = await this.supabase
      .from('tour_shoppings')
      .select('*')
      .eq('tour_id', tourId)
      .order('date');
    if (error) throw error;
    return (data || []).map((row) => ({
      name: row.name,
      price: Number(row.price) || 0,
      date: row.date,
    }));
  }

  async addTourShopping(tourId: string, shopping: TourShopping): Promise<void> {
    const { error } = await this.supabase
      .from('tour_shoppings')
      .insert({
        tour_id: tourId,
        name: shopping.name,
        price: shopping.price,
        date: shopping.date,
      });
    if (error) throw error;
  }

  async updateTourShopping(tourId: string, index: number, shopping: TourShopping): Promise<void> {
    const { data: rows } = await this.supabase
      .from('tour_shoppings')
      .select('id')
      .eq('tour_id', tourId)
      .order('date');
    if (rows && rows[index]) {
      const { error } = await this.supabase
        .from('tour_shoppings')
        .update({
          name: shopping.name,
          price: shopping.price,
          date: shopping.date,
        })
        .eq('id', rows[index].id);
      if (error) throw error;
    }
  }

  async removeTourShopping(tourId: string, index: number): Promise<void> {
    const { data: rows } = await this.supabase
      .from('tour_shoppings')
      .select('id')
      .eq('tour_id', tourId)
      .order('date');
    if (rows && rows[index]) {
      const { error } = await this.supabase
        .from('tour_shoppings')
        .delete()
        .eq('id', rows[index].id);
      if (error) throw error;
    }
  }

  // Data Import/Export
  async exportData(): Promise<any> {
    const [guides, companies, nationalities, provinces, destinations, shoppings, categories, expenses, tourResult] = await Promise.all([
      this.listGuides(),
      this.listCompanies(),
      this.listNationalities(),
      this.listProvinces(),
      this.listTouristDestinations(),
      this.listShoppings(),
      this.listExpenseCategories(),
      this.listDetailedExpenses(),
      this.listTours(undefined, { includeDetails: true }),
    ]);

    return {
      guides,
      companies,
      nationalities,
      provinces,
      touristDestinations: destinations,
      shoppings,
      expenseCategories: categories,
      detailedExpenses: expenses,
      tours: tourResult.tours,
    };
  }

  async importData(data: any): Promise<void> {
    if (data.guides) {
      for (const guide of data.guides) {
        const { id, createdAt, updatedAt, ...rest } = guide;
        await this.createGuide(rest);
      }
    }
    if (data.companies) {
      for (const company of data.companies) {
        const { id, createdAt, updatedAt, ...rest } = company;
        await this.createCompany(rest);
      }
    }
    if (data.nationalities) {
      for (const nationality of data.nationalities) {
        const { id, createdAt, updatedAt, ...rest } = nationality;
        await this.createNationality(rest);
      }
    }
    if (data.provinces) {
      for (const province of data.provinces) {
        const { id, createdAt, updatedAt, ...rest } = province;
        await this.createProvince(rest);
      }
    }
    if (data.touristDestinations) {
      for (const destination of data.touristDestinations) {
        const { id, createdAt, updatedAt, ...rest } = destination;
        await this.createTouristDestination(rest);
      }
    }
    if (data.shoppings) {
      for (const shopping of data.shoppings) {
        const { id, createdAt, updatedAt, ...rest } = shopping;
        await this.createShopping(rest);
      }
    }
    if (data.expenseCategories) {
      for (const category of data.expenseCategories) {
        const { id, createdAt, updatedAt, ...rest } = category;
        await this.createExpenseCategory(rest);
      }
    }
    if (data.detailedExpenses) {
      for (const expense of data.detailedExpenses) {
        const { id, createdAt, updatedAt, ...rest } = expense;
        await this.createDetailedExpense(rest);
      }
    }
    if (data.tours) {
      for (const tour of data.tours) {
        const { id, createdAt, updatedAt, destinations, expenses, meals, allowances, summary, ...tourInput } = tour;
        const createdTour = await this.createTour(tourInput);
        
        // Add subcollections
        if (destinations && destinations.length > 0) {
          await Promise.all(destinations.map(dest => this.addDestination(createdTour.id, dest)));
        }
        if (expenses && expenses.length > 0) {
          await Promise.all(expenses.map(exp => this.addExpense(createdTour.id, exp)));
        }
        if (meals && meals.length > 0) {
          await Promise.all(meals.map(meal => this.addMeal(createdTour.id, meal)));
        }
        if (allowances && allowances.length > 0) {
          await Promise.all(allowances.map(allow => this.addAllowance(createdTour.id, allow)));
        }
        if (summary) {
          await this.updateTour(createdTour.id, { summary });
        }
      }
    }
  }

  async clearAllData(): Promise<void> {
    await Promise.all([
      this.supabase.from('tours').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      this.supabase.from('detailed_expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      this.supabase.from('expense_categories').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      this.supabase.from('shoppings').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      this.supabase.from('tourist_destinations').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      this.supabase.from('provinces').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      this.supabase.from('nationalities').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      this.supabase.from('companies').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      this.supabase.from('guides').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
    ]);
  }

  // ==================== User Profiles ====================

  async listUserProfiles(query?: SearchQuery): Promise<UserProfile[]> {
    let dbQuery = this.supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply status filter
    if (query?.status && query.status !== 'all') {
      dbQuery = dbQuery.eq('status', query.status);
    }

    // Apply search filter (email or full_name)
    if (query?.search) {
      dbQuery = dbQuery.or(`email.ilike.%${query.search}%,full_name.ilike.%${query.search}%`);
    }

    // Apply pagination
    if (query?.limit) {
      dbQuery = dbQuery.limit(query.limit);
    }
    if (query?.offset) {
      dbQuery = dbQuery.range(query.offset, query.offset + (query.limit || 50) - 1);
    }

    const { data, error } = await dbQuery;

    if (error) {
      console.error('Error listing user profiles:', error);
      throw new Error(`Failed to list user profiles: ${error.message}`);
    }

    return (data || []).map(dbRowToUserProfile);
  }

  async getUserProfile(id: string): Promise<UserProfile | undefined> {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return undefined;
      }
      console.error('Error getting user profile:', error);
      throw new Error(`Failed to get user profile: ${error.message}`);
    }

    return data ? dbRowToUserProfile(data) : undefined;
  }

  async getUserProfileByEmail(email: string): Promise<UserProfile | undefined> {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return undefined;
      }
      console.error('Error getting user profile by email:', error);
      throw new Error(`Failed to get user profile: ${error.message}`);
    }

    return data ? dbRowToUserProfile(data) : undefined;
  }

  async createUserProfile(
    userId: string,
    input: UserProfileInput,
    createdBy?: string
  ): Promise<UserProfile> {
    const insert = userProfileToDbInsert(userId, input, createdBy);

    const { data, error } = await this.supabase
      .from('user_profiles')
      .insert(insert)
      .select()
      .single();

    if (error) {
      console.error('Error creating user profile:', error);
      throw new Error(`Failed to create user profile: ${error.message}`);
    }

    return dbRowToUserProfile(data);
  }

  async updateUserProfile(id: string, patch: Partial<UserProfileInput>): Promise<void> {
    const update = userProfileToDbUpdate(patch);

    const { error } = await this.supabase
      .from('user_profiles')
      .update(update)
      .eq('id', id);

    if (error) {
      console.error('Error updating user profile:', error);
      throw new Error(`Failed to update user profile: ${error.message}`);
    }
  }

  async deleteUserProfile(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('user_profiles')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting user profile:', error);
      throw new Error(`Failed to delete user profile: ${error.message}`);
    }
  }

  async getCurrentUserProfile(): Promise<UserProfile | undefined> {
    const { data: { user } } = await this.supabase.auth.getUser();

    if (!user) {
      return undefined;
    }

    return this.getUserProfile(user.id);
  }
}
