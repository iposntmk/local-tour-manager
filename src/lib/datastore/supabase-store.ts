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
} from '@/types/master';
import type {
  Tour,
  Destination,
  Expense,
  Meal,
  Allowance,
  TourQuery,
  EntityRef,
  TourInput,
  TourSummary,
  TourListResult,
} from '@/types/tour';
import { generateSearchKeywords } from '@/lib/string-utils';
import { differenceInDays } from 'date-fns';

export class SupabaseStore implements DataStore {
  private readonly supabase: SupabaseClient<Database>;

  constructor() {
    this.supabase = getSupabaseClient();
  }

  // Helper to map database rows to app types
  private mapGuide(row: any): Guide {
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

  private mapCompany(row: any): Company {
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

  private mapNationality(row: any): Nationality {
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

  private mapProvince(row: any): Province {
    return {
      id: row.id,
      name: row.name,
      status: row.status,
      searchKeywords: row.search_keywords || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapTouristDestination(row: any): TouristDestination {
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

  private mapShopping(row: any): Shopping {
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

  private mapExpenseCategory(row: any): ExpenseCategory {
    return {
      id: row.id,
      name: row.name,
      status: row.status,
      searchKeywords: row.search_keywords || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapDetailedExpense(row: any): DetailedExpense {
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

  private mapTour(row: any): Tour {
    const totalGuests = (row.adults || 0) + (row.children || 0);
    const totalDays = differenceInDays(new Date(row.end_date), new Date(row.start_date)) + 1;
    
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
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      destinations: [],
      expenses: [],
      meals: [],
      allowances: [],
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
    const updates: any = {};
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
    const updates: any = {};
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
    const updates: any = {};
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
    const updates: any = {};
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
    const updates: any = {};
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
    const updates: any = {};
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
    const updates: any = {};
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
    const updates: any = {};
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
    const { error } = await this.supabase.from('detailed_expenses').delete().eq('id', id);
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
        tour_allowances(*)
      `
          : '*',
        { count: 'exact' }
      )
      .order('start_date', { ascending: false });

    if (includeDetails) {
      // Ensure nested arrays are consistently ordered by date
      queryBuilder = queryBuilder
        .order('date', { foreignTable: 'tour_destinations' })
        .order('date', { foreignTable: 'tour_expenses' })
        .order('date', { foreignTable: 'tour_meals' })
        .order('date', { foreignTable: 'tour_allowances' });
    }

    if (query?.tourCode) queryBuilder = queryBuilder.ilike('tour_code', `%${query.tourCode}%`);
    if (query?.clientName) queryBuilder = queryBuilder.ilike('client_name', `%${query.clientName}%`);
    if (query?.companyId) queryBuilder = queryBuilder.eq('company_id', query.companyId);
    if (query?.guideId) queryBuilder = queryBuilder.eq('guide_id', query.guideId);
    if (query?.startDate) queryBuilder = queryBuilder.gte('start_date', query.startDate);
    if (query?.endDate) queryBuilder = queryBuilder.lte('end_date', query.endDate);
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

    const tours = (data || []).map((row: any) => {
      const tour = this.mapTour(row);
      if (includeDetails) {
        tour.destinations = (row.tour_destinations || []).map((d: any) => ({
          name: d.name,
          price: Number(d.price) || 0,
          date: d.date,
        }));
        tour.expenses = (row.tour_expenses || []).map((e: any) => ({
          name: e.name,
          price: Number(e.price) || 0,
          date: e.date,
        }));
        tour.meals = (row.tour_meals || []).map((m: any) => ({
          name: m.name,
          price: Number(m.price) || 0,
          date: m.date,
        }));
        tour.allowances = (row.tour_allowances || []).map((a: any) => ({
          date: a.date,
          name: a.name,
          price: Number(a.price) || 0,
          quantity: a.quantity || 1,
        }));
      }
      return tour;
    });

    return {
      tours,
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
        tour_allowances(*)
      `)
      .eq('id', id)
      .order('date', { foreignTable: 'tour_destinations' })
      .order('date', { foreignTable: 'tour_expenses' })
      .order('date', { foreignTable: 'tour_meals' })
      .order('date', { foreignTable: 'tour_allowances' })
      .single();

    if (error) return null;
    if (!data) return null;

    const tour = this.mapTour(data as any);
    const row: any = data;
    tour.destinations = (row.tour_destinations || []).map((d: any) => ({
      name: d.name,
      price: Number(d.price) || 0,
      date: d.date,
    }));
    tour.expenses = (row.tour_expenses || []).map((e: any) => ({
      name: e.name,
      price: Number(e.price) || 0,
      date: e.date,
    }));
    tour.meals = (row.tour_meals || []).map((m: any) => ({
      name: m.name,
      price: Number(m.price) || 0,
      date: m.date,
    }));
    tour.allowances = (row.tour_allowances || []).map((a: any) => ({
      date: a.date,
      name: a.name,
      price: Number(a.price) || 0,
      quantity: a.quantity || 1,
    }));

    return tour;
  }

  async createTour(tour: TourInput & { destinations?: Destination[]; expenses?: Expense[]; meals?: Meal[]; allowances?: Allowance[]; summary?: TourSummary }): Promise<Tour> {
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
    const totalDays = differenceInDays(new Date(tour.endDate), new Date(tour.startDate)) + 1;

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

  // Tour Destinations
  async getDestinations(tourId: string): Promise<Destination[]> {
    const { data, error } = await this.supabase.from('tour_destinations').select('*').eq('tour_id', tourId).order('date');
    if (error) throw error;
    return (data || []).map((row) => ({
      name: row.name,
      price: Number(row.price) || 0,
      date: row.date,
    }));
  }

  async addDestination(tourId: string, destination: Destination): Promise<void> {
    const { error } = await this.supabase.from('tour_destinations').insert({
      tour_id: tourId,
      name: destination.name,
      price: destination.price,
      date: destination.date,
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
  }

  async updateDestination(tourId: string, index: number, destination: Destination): Promise<void> {
    const { data: rows } = await this.supabase.from('tour_destinations').select('id').eq('tour_id', tourId).order('date');
    if (rows && rows[index]) {
      const { error } = await this.supabase.from('tour_destinations').update({
        name: destination.name,
        price: destination.price,
        date: destination.date,
      }).eq('id', rows[index].id);
      if (error) throw error;
    }
  }

  async removeDestination(tourId: string, index: number): Promise<void> {
    const { data: rows } = await this.supabase.from('tour_destinations').select('id').eq('tour_id', tourId).order('date');
    if (rows && rows[index]) {
      const { error } = await this.supabase.from('tour_destinations').delete().eq('id', rows[index].id);
      if (error) throw error;
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
    }));
  }

  async addExpense(tourId: string, expense: Expense): Promise<void> {
    const { error } = await this.supabase.from('tour_expenses').insert({
      tour_id: tourId,
      name: expense.name,
      price: expense.price,
      date: expense.date,
    });
    if (error) throw error;
  }

  async updateExpense(tourId: string, index: number, expense: Expense): Promise<void> {
    const { data: rows } = await this.supabase.from('tour_expenses').select('id').eq('tour_id', tourId).order('date');
    if (rows && rows[index]) {
      const { error } = await this.supabase.from('tour_expenses').update({
        name: expense.name,
        price: expense.price,
        date: expense.date,
      }).eq('id', rows[index].id);
      if (error) throw error;
    }
  }

  async removeExpense(tourId: string, index: number): Promise<void> {
    const { data: rows } = await this.supabase.from('tour_expenses').select('id').eq('tour_id', tourId).order('date');
    if (rows && rows[index]) {
      const { error } = await this.supabase.from('tour_expenses').delete().eq('id', rows[index].id);
      if (error) throw error;
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
    }));
  }

  async addMeal(tourId: string, meal: Meal): Promise<void> {
    const { error } = await this.supabase.from('tour_meals').insert({
      tour_id: tourId,
      name: meal.name,
      price: meal.price,
      date: meal.date,
    });
    if (error) throw error;
  }

  async updateMeal(tourId: string, index: number, meal: Meal): Promise<void> {
    const { data: rows } = await this.supabase.from('tour_meals').select('id').eq('tour_id', tourId).order('date');
    if (rows && rows[index]) {
      const { error } = await this.supabase.from('tour_meals').update({
        name: meal.name,
        price: meal.price,
        date: meal.date,
      }).eq('id', rows[index].id);
      if (error) throw error;
    }
  }

  async removeMeal(tourId: string, index: number): Promise<void> {
    const { data: rows } = await this.supabase.from('tour_meals').select('id').eq('tour_id', tourId).order('date');
    if (rows && rows[index]) {
      const { error } = await this.supabase.from('tour_meals').delete().eq('id', rows[index].id);
      if (error) throw error;
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
    }
  }

  async removeAllowance(tourId: string, index: number): Promise<void> {
    const { data: rows } = await this.supabase.from('tour_allowances').select('id').eq('tour_id', tourId).order('date');
    if (rows && rows[index]) {
      const { error } = await this.supabase.from('tour_allowances').delete().eq('id', rows[index].id);
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
}
