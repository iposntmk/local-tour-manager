import { supabase } from '@/integrations/supabase/client';
import type { DataStore, SearchQuery } from '@/types/datastore';
import type {
  Guide,
  Company,
  Nationality,
  Province,
  TouristDestination,
  Shopping,
  ExpenseCategory,
  DetailedExpense,
} from '@/types/master';
import type { Tour, Destination, Expense, Meal, Allowance, TourQuery, EntityRef } from '@/types/tour';
import { generateSearchKeywords } from '@/lib/string-utils';
import { differenceInDays } from 'date-fns';

export class SupabaseStore implements DataStore {
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
      summary: { totalTabs: 0 },
    };
  }

  // Guides
  async listGuides(query?: SearchQuery): Promise<Guide[]> {
    let queryBuilder = supabase.from('guides').select('*').order('name');
    
    if (query?.status) queryBuilder = queryBuilder.eq('status', query.status);
    if (query?.search) queryBuilder = queryBuilder.ilike('name', `%${query.search}%`);

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return (data || []).map(this.mapGuide);
  }

  async getGuide(id: string): Promise<Guide | null> {
    const { data, error } = await supabase.from('guides').select('*').eq('id', id).single();
    if (error) return null;
    return data ? this.mapGuide(data) : null;
  }

  async createGuide(guide: Omit<Guide, 'id'>): Promise<Guide> {
    const searchKeywords = generateSearchKeywords(guide.name);
    const { data, error } = await supabase
      .from('guides')
      .insert({
        name: guide.name,
        phone: guide.phone || '',
        note: guide.note || '',
        status: guide.status,
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
      updates.name = guide.name;
      updates.search_keywords = generateSearchKeywords(guide.name);
    }
    if (guide.phone !== undefined) updates.phone = guide.phone;
    if (guide.note !== undefined) updates.note = guide.note;
    if (guide.status !== undefined) updates.status = guide.status;
    
    const { error } = await supabase.from('guides').update(updates).eq('id', id);
    if (error) throw error;
  }

  async deleteGuide(id: string): Promise<void> {
    const { error } = await supabase.from('guides').delete().eq('id', id);
    if (error) throw error;
  }

  async duplicateGuide(id: string): Promise<Guide> {
    const original = await this.getGuide(id);
    if (!original) throw new Error('Guide not found');
    const { id: _, createdAt, updatedAt, searchKeywords, ...rest } = original;
    return this.createGuide({ ...rest, name: `${original.name} (Copy)`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }

  async toggleGuideStatus(id: string): Promise<void> {
    const guide = await this.getGuide(id);
    if (!guide) throw new Error('Guide not found');
    await this.updateGuide(id, { status: guide.status === 'active' ? 'inactive' : 'active' });
  }

  // Companies
  async listCompanies(query?: SearchQuery): Promise<Company[]> {
    let queryBuilder = supabase.from('companies').select('*').order('name');
    
    if (query?.status) queryBuilder = queryBuilder.eq('status', query.status);
    if (query?.search) queryBuilder = queryBuilder.ilike('name', `%${query.search}%`);

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return (data || []).map(this.mapCompany);
  }

  async getCompany(id: string): Promise<Company | null> {
    const { data, error } = await supabase.from('companies').select('*').eq('id', id).single();
    if (error) return null;
    return data ? this.mapCompany(data) : null;
  }

  async createCompany(company: Omit<Company, 'id'>): Promise<Company> {
    const searchKeywords = generateSearchKeywords(company.name);
    const { data, error } = await supabase
      .from('companies')
      .insert({
        name: company.name,
        contact_name: company.contactName || '',
        phone: company.phone || '',
        email: company.email || '',
        note: company.note || '',
        status: company.status,
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
      updates.name = company.name;
      updates.search_keywords = generateSearchKeywords(company.name);
    }
    if (company.contactName !== undefined) updates.contact_name = company.contactName;
    if (company.phone !== undefined) updates.phone = company.phone;
    if (company.email !== undefined) updates.email = company.email;
    if (company.note !== undefined) updates.note = company.note;
    if (company.status !== undefined) updates.status = company.status;
    
    const { error } = await supabase.from('companies').update(updates).eq('id', id);
    if (error) throw error;
  }

  async deleteCompany(id: string): Promise<void> {
    const { error } = await supabase.from('companies').delete().eq('id', id);
    if (error) throw error;
  }

  async duplicateCompany(id: string): Promise<Company> {
    const original = await this.getCompany(id);
    if (!original) throw new Error('Company not found');
    const { id: _, createdAt, updatedAt, searchKeywords, ...rest } = original;
    return this.createCompany({ ...rest, name: `${original.name} (Copy)`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }

  async toggleCompanyStatus(id: string): Promise<void> {
    const company = await this.getCompany(id);
    if (!company) throw new Error('Company not found');
    await this.updateCompany(id, { status: company.status === 'active' ? 'inactive' : 'active' });
  }

  // Nationalities
  async listNationalities(query?: SearchQuery): Promise<Nationality[]> {
    let queryBuilder = supabase.from('nationalities').select('*').order('name');
    
    if (query?.status) queryBuilder = queryBuilder.eq('status', query.status);
    if (query?.search) queryBuilder = queryBuilder.ilike('name', `%${query.search}%`);

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return (data || []).map(this.mapNationality);
  }

  async getNationality(id: string): Promise<Nationality | null> {
    const { data, error } = await supabase.from('nationalities').select('*').eq('id', id).single();
    if (error) return null;
    return data ? this.mapNationality(data) : null;
  }

  async createNationality(nationality: Omit<Nationality, 'id'>): Promise<Nationality> {
    const searchKeywords = generateSearchKeywords(nationality.name);
    const { data, error } = await supabase
      .from('nationalities')
      .insert({
        name: nationality.name,
        iso2: nationality.iso2,
        emoji: nationality.emoji,
        status: nationality.status,
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
      updates.name = nationality.name;
      updates.search_keywords = generateSearchKeywords(nationality.name);
    }
    if (nationality.iso2 !== undefined) updates.iso2 = nationality.iso2;
    if (nationality.emoji !== undefined) updates.emoji = nationality.emoji;
    if (nationality.status !== undefined) updates.status = nationality.status;
    
    const { error } = await supabase.from('nationalities').update(updates).eq('id', id);
    if (error) throw error;
  }

  async deleteNationality(id: string): Promise<void> {
    const { error } = await supabase.from('nationalities').delete().eq('id', id);
    if (error) throw error;
  }

  async duplicateNationality(id: string): Promise<Nationality> {
    const original = await this.getNationality(id);
    if (!original) throw new Error('Nationality not found');
    const { id: _, createdAt, updatedAt, ...rest } = original;
    return this.createNationality({ ...rest, name: `${original.name} (Copy)` });
  }

  async toggleNationalityStatus(id: string): Promise<void> {
    const nationality = await this.getNationality(id);
    if (!nationality) throw new Error('Nationality not found');
    await this.updateNationality(id, { status: nationality.status === 'active' ? 'inactive' : 'active' });
  }

  // Provinces
  async listProvinces(query?: SearchQuery): Promise<Province[]> {
    let queryBuilder = supabase.from('provinces').select('*').order('name');
    
    if (query?.status) queryBuilder = queryBuilder.eq('status', query.status);
    if (query?.search) queryBuilder = queryBuilder.ilike('name', `%${query.search}%`);

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return (data || []).map(this.mapProvince);
  }

  async getProvince(id: string): Promise<Province | null> {
    const { data, error } = await supabase.from('provinces').select('*').eq('id', id).single();
    if (error) return null;
    return data ? this.mapProvince(data) : null;
  }

  async createProvince(province: Omit<Province, 'id'>): Promise<Province> {
    const searchKeywords = generateSearchKeywords(province.name);
    const { data, error } = await supabase
      .from('provinces')
      .insert({
        name: province.name,
        status: province.status,
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
      updates.name = province.name;
      updates.search_keywords = generateSearchKeywords(province.name);
    }
    if (province.status !== undefined) updates.status = province.status;
    
    const { error } = await supabase.from('provinces').update(updates).eq('id', id);
    if (error) throw error;
  }

  async deleteProvince(id: string): Promise<void> {
    const { error } = await supabase.from('provinces').delete().eq('id', id);
    if (error) throw error;
  }

  async duplicateProvince(id: string): Promise<Province> {
    const original = await this.getProvince(id);
    if (!original) throw new Error('Province not found');
    const { id: _, createdAt, updatedAt, ...rest } = original;
    return this.createProvince({ ...rest, name: `${original.name} (Copy)` });
  }

  async toggleProvinceStatus(id: string): Promise<void> {
    const province = await this.getProvince(id);
    if (!province) throw new Error('Province not found');
    await this.updateProvince(id, { status: province.status === 'active' ? 'inactive' : 'active' });
  }

  // Tourist Destinations
  async listTouristDestinations(query?: SearchQuery): Promise<TouristDestination[]> {
    let queryBuilder = supabase.from('tourist_destinations').select('*').order('name');
    
    if (query?.status) queryBuilder = queryBuilder.eq('status', query.status);
    if (query?.search) queryBuilder = queryBuilder.ilike('name', `%${query.search}%`);

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return (data || []).map(this.mapTouristDestination);
  }

  async getTouristDestination(id: string): Promise<TouristDestination | null> {
    const { data, error } = await supabase.from('tourist_destinations').select('*').eq('id', id).single();
    if (error) return null;
    return data ? this.mapTouristDestination(data) : null;
  }

  async createTouristDestination(destination: Omit<TouristDestination, 'id'>): Promise<TouristDestination> {
    const searchKeywords = generateSearchKeywords(destination.name);
    const { data, error } = await supabase
      .from('tourist_destinations')
      .insert({
        name: destination.name,
        price: destination.price,
        province_id: destination.provinceRef.id,
        province_name_at_booking: destination.provinceRef.nameAtBooking,
        status: destination.status,
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
      updates.name = destination.name;
      updates.search_keywords = generateSearchKeywords(destination.name);
    }
    if (destination.price !== undefined) updates.price = destination.price;
    if (destination.provinceRef !== undefined) {
      updates.province_id = destination.provinceRef.id;
      updates.province_name_at_booking = destination.provinceRef.nameAtBooking;
    }
    if (destination.status !== undefined) updates.status = destination.status;
    
    const { error } = await supabase.from('tourist_destinations').update(updates).eq('id', id);
    if (error) throw error;
  }

  async deleteTouristDestination(id: string): Promise<void> {
    const { error } = await supabase.from('tourist_destinations').delete().eq('id', id);
    if (error) throw error;
  }

  async duplicateTouristDestination(id: string): Promise<TouristDestination> {
    const original = await this.getTouristDestination(id);
    if (!original) throw new Error('Tourist destination not found');
    const { id: _, createdAt, updatedAt, ...rest } = original;
    return this.createTouristDestination({ ...rest, name: `${original.name} (Copy)` });
  }

  async toggleTouristDestinationStatus(id: string): Promise<void> {
    const destination = await this.getTouristDestination(id);
    if (!destination) throw new Error('Tourist destination not found');
    await this.updateTouristDestination(id, { status: destination.status === 'active' ? 'inactive' : 'active' });
  }

  // Shopping
  async listShoppings(query?: SearchQuery): Promise<Shopping[]> {
    let queryBuilder = supabase.from('shoppings').select('*').order('name');
    
    if (query?.status) queryBuilder = queryBuilder.eq('status', query.status);
    if (query?.search) queryBuilder = queryBuilder.ilike('name', `%${query.search}%`);

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return (data || []).map(this.mapShopping);
  }

  async getShopping(id: string): Promise<Shopping | null> {
    const { data, error } = await supabase.from('shoppings').select('*').eq('id', id).single();
    if (error) return null;
    return data ? this.mapShopping(data) : null;
  }

  async createShopping(shopping: Omit<Shopping, 'id'>): Promise<Shopping> {
    const searchKeywords = generateSearchKeywords(shopping.name);
    const { data, error } = await supabase
      .from('shoppings')
      .insert({
        name: shopping.name,
        status: shopping.status,
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
      updates.name = shopping.name;
      updates.search_keywords = generateSearchKeywords(shopping.name);
    }
    if (shopping.status !== undefined) updates.status = shopping.status;
    
    const { error } = await supabase.from('shoppings').update(updates).eq('id', id);
    if (error) throw error;
  }

  async deleteShopping(id: string): Promise<void> {
    const { error } = await supabase.from('shoppings').delete().eq('id', id);
    if (error) throw error;
  }

  async duplicateShopping(id: string): Promise<Shopping> {
    const original = await this.getShopping(id);
    if (!original) throw new Error('Shopping not found');
    const { id: _, createdAt, updatedAt, ...rest } = original;
    return this.createShopping({ ...rest, name: `${original.name} (Copy)` });
  }

  async toggleShoppingStatus(id: string): Promise<void> {
    const shopping = await this.getShopping(id);
    if (!shopping) throw new Error('Shopping not found');
    await this.updateShopping(id, { status: shopping.status === 'active' ? 'inactive' : 'active' });
  }

  // Expense Categories
  async listExpenseCategories(query?: SearchQuery): Promise<ExpenseCategory[]> {
    let queryBuilder = supabase.from('expense_categories').select('*').order('name');
    
    if (query?.status) queryBuilder = queryBuilder.eq('status', query.status);
    if (query?.search) queryBuilder = queryBuilder.ilike('name', `%${query.search}%`);

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return (data || []).map(this.mapExpenseCategory);
  }

  async getExpenseCategory(id: string): Promise<ExpenseCategory | null> {
    const { data, error } = await supabase.from('expense_categories').select('*').eq('id', id).single();
    if (error) return null;
    return data ? this.mapExpenseCategory(data) : null;
  }

  async createExpenseCategory(category: Omit<ExpenseCategory, 'id'>): Promise<ExpenseCategory> {
    const searchKeywords = generateSearchKeywords(category.name);
    const { data, error } = await supabase
      .from('expense_categories')
      .insert({
        name: category.name,
        status: category.status,
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
      updates.name = category.name;
      updates.search_keywords = generateSearchKeywords(category.name);
    }
    if (category.status !== undefined) updates.status = category.status;
    
    const { error } = await supabase.from('expense_categories').update(updates).eq('id', id);
    if (error) throw error;
  }

  async deleteExpenseCategory(id: string): Promise<void> {
    const { error } = await supabase.from('expense_categories').delete().eq('id', id);
    if (error) throw error;
  }

  async duplicateExpenseCategory(id: string): Promise<ExpenseCategory> {
    const original = await this.getExpenseCategory(id);
    if (!original) throw new Error('Expense category not found');
    const { id: _, createdAt, updatedAt, ...rest } = original;
    return this.createExpenseCategory({ ...rest, name: `${original.name} (Copy)` });
  }

  async toggleExpenseCategoryStatus(id: string): Promise<void> {
    const category = await this.getExpenseCategory(id);
    if (!category) throw new Error('Expense category not found');
    await this.updateExpenseCategory(id, { status: category.status === 'active' ? 'inactive' : 'active' });
  }

  // Detailed Expenses
  async listDetailedExpenses(query?: SearchQuery): Promise<DetailedExpense[]> {
    let queryBuilder = supabase.from('detailed_expenses').select('*').order('name');
    
    if (query?.status) queryBuilder = queryBuilder.eq('status', query.status);
    if (query?.search) queryBuilder = queryBuilder.ilike('name', `%${query.search}%`);

    const { data, error} = await queryBuilder;
    if (error) throw error;
    return (data || []).map(this.mapDetailedExpense);
  }

  async getDetailedExpense(id: string): Promise<DetailedExpense | null> {
    const { data, error } = await supabase.from('detailed_expenses').select('*').eq('id', id).single();
    if (error) return null;
    return data ? this.mapDetailedExpense(data) : null;
  }

  async createDetailedExpense(expense: Omit<DetailedExpense, 'id'>): Promise<DetailedExpense> {
    const searchKeywords = generateSearchKeywords(expense.name);
    const { data, error } = await supabase
      .from('detailed_expenses')
      .insert({
        name: expense.name,
        price: expense.price,
        category_id: expense.categoryRef.id,
        category_name_at_booking: expense.categoryRef.nameAtBooking,
        status: expense.status,
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
      updates.name = expense.name;
      updates.search_keywords = generateSearchKeywords(expense.name);
    }
    if (expense.price !== undefined) updates.price = expense.price;
    if (expense.categoryRef !== undefined) {
      updates.category_id = expense.categoryRef.id;
      updates.category_name_at_booking = expense.categoryRef.nameAtBooking;
    }
    if (expense.status !== undefined) updates.status = expense.status;
    
    const { error } = await supabase.from('detailed_expenses').update(updates).eq('id', id);
    if (error) throw error;
  }

  async deleteDetailedExpense(id: string): Promise<void> {
    const { error } = await supabase.from('detailed_expenses').delete().eq('id', id);
    if (error) throw error;
  }

  async duplicateDetailedExpense(id: string): Promise<DetailedExpense> {
    const original = await this.getDetailedExpense(id);
    if (!original) throw new Error('Detailed expense not found');
    const { id: _, createdAt, updatedAt, ...rest } = original;
    return this.createDetailedExpense({ ...rest, name: `${original.name} (Copy)` });
  }

  async toggleDetailedExpenseStatus(id: string): Promise<void> {
    const expense = await this.getDetailedExpense(id);
    if (!expense) throw new Error('Detailed expense not found');
    await this.updateDetailedExpense(id, { status: expense.status === 'active' ? 'inactive' : 'active' });
  }

  // Tours
  async listTours(query?: TourQuery): Promise<Tour[]> {
    let queryBuilder = supabase.from('tours').select('*').order('start_date', { ascending: false });
    
    if (query?.tourCode) queryBuilder = queryBuilder.ilike('tour_code', `%${query.tourCode}%`);
    if (query?.clientName) queryBuilder = queryBuilder.ilike('client_name', `%${query.clientName}%`);
    if (query?.companyId) queryBuilder = queryBuilder.eq('company_id', query.companyId);
    if (query?.guideId) queryBuilder = queryBuilder.eq('guide_id', query.guideId);
    if (query?.startDate) queryBuilder = queryBuilder.gte('start_date', query.startDate);
    if (query?.endDate) queryBuilder = queryBuilder.lte('end_date', query.endDate);

    const { data, error } = await queryBuilder;
    if (error) throw error;
    
    const tours = await Promise.all(
      (data || []).map(async (row) => {
        const tour = this.mapTour(row);
        tour.destinations = await this.getDestinations(tour.id);
        tour.expenses = await this.getExpenses(tour.id);
        tour.meals = await this.getMeals(tour.id);
        tour.allowances = await this.getAllowances(tour.id);
        return tour;
      })
    );
    
    return tours;
  }

  async getTour(id: string): Promise<Tour | null> {
    const { data, error } = await supabase.from('tours').select('*').eq('id', id).single();
    if (error) return null;
    if (!data) return null;
    
    const tour = this.mapTour(data);
    tour.destinations = await this.getDestinations(id);
    tour.expenses = await this.getExpenses(id);
    tour.meals = await this.getMeals(id);
    tour.allowances = await this.getAllowances(id);
    
    return tour;
  }

  async createTour(tour: Omit<Tour, 'id'>): Promise<Tour> {
    const { data, error } = await supabase
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
        total_guests: tour.totalGuests,
        driver_name: tour.driverName,
        client_phone: tour.clientPhone,
        start_date: tour.startDate,
        end_date: tour.endDate,
        total_days: tour.totalDays,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    const newTour = this.mapTour(data);
    
    // Add subcollections
    if (tour.destinations?.length) {
      for (const dest of tour.destinations) {
        await this.addDestination(newTour.id, dest);
      }
    }
    if (tour.expenses?.length) {
      for (const exp of tour.expenses) {
        await this.addExpense(newTour.id, exp);
      }
    }
    if (tour.meals?.length) {
      for (const meal of tour.meals) {
        await this.addMeal(newTour.id, meal);
      }
    }
    if (tour.allowances?.length) {
      for (const allowance of tour.allowances) {
        await this.addAllowance(newTour.id, allowance);
      }
    }
    
    return this.getTour(newTour.id) as Promise<Tour>;
  }

  async updateTour(id: string, tour: Partial<Tour>): Promise<void> {
    const updates: any = {};
    if (tour.tourCode !== undefined) updates.tour_code = tour.tourCode;
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
    
    const { error } = await supabase.from('tours').update(updates).eq('id', id);
    if (error) throw error;
  }

  async deleteTour(id: string): Promise<void> {
    const { error } = await supabase.from('tours').delete().eq('id', id);
    if (error) throw error;
  }

  async duplicateTour(id: string): Promise<Tour> {
    const original = await this.getTour(id);
    if (!original) throw new Error('Tour not found');
    const { id: _, createdAt, updatedAt, summary, ...rest } = original;
    return this.createTour({ ...rest, tourCode: `${original.tourCode}-COPY`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }

  // Tour Destinations
  async getDestinations(tourId: string): Promise<Destination[]> {
    const { data, error } = await supabase.from('tour_destinations').select('*').eq('tour_id', tourId).order('date');
    if (error) throw error;
    return (data || []).map((row) => ({
      name: row.name,
      price: Number(row.price) || 0,
      date: row.date,
    }));
  }

  async addDestination(tourId: string, destination: Destination): Promise<void> {
    const { error } = await supabase.from('tour_destinations').insert({
      tour_id: tourId,
      name: destination.name,
      price: destination.price,
      date: destination.date,
    });
    if (error) throw error;
  }

  async updateDestination(tourId: string, index: number, destination: Destination): Promise<void> {
    const destinations = await this.getDestinations(tourId);
    const { data: rows } = await supabase.from('tour_destinations').select('id').eq('tour_id', tourId).order('date');
    if (rows && rows[index]) {
      const { error } = await supabase.from('tour_destinations').update({
        name: destination.name,
        price: destination.price,
        date: destination.date,
      }).eq('id', rows[index].id);
      if (error) throw error;
    }
  }

  async removeDestination(tourId: string, index: number): Promise<void> {
    const { data: rows } = await supabase.from('tour_destinations').select('id').eq('tour_id', tourId).order('date');
    if (rows && rows[index]) {
      const { error } = await supabase.from('tour_destinations').delete().eq('id', rows[index].id);
      if (error) throw error;
    }
  }

  // Tour Expenses
  async getExpenses(tourId: string): Promise<Expense[]> {
    const { data, error } = await supabase.from('tour_expenses').select('*').eq('tour_id', tourId).order('date');
    if (error) throw error;
    return (data || []).map((row) => ({
      name: row.name,
      price: Number(row.price) || 0,
      date: row.date,
    }));
  }

  async addExpense(tourId: string, expense: Expense): Promise<void> {
    const { error } = await supabase.from('tour_expenses').insert({
      tour_id: tourId,
      name: expense.name,
      price: expense.price,
      date: expense.date,
    });
    if (error) throw error;
  }

  async updateExpense(tourId: string, index: number, expense: Expense): Promise<void> {
    const { data: rows } = await supabase.from('tour_expenses').select('id').eq('tour_id', tourId).order('date');
    if (rows && rows[index]) {
      const { error } = await supabase.from('tour_expenses').update({
        name: expense.name,
        price: expense.price,
        date: expense.date,
      }).eq('id', rows[index].id);
      if (error) throw error;
    }
  }

  async removeExpense(tourId: string, index: number): Promise<void> {
    const { data: rows } = await supabase.from('tour_expenses').select('id').eq('tour_id', tourId).order('date');
    if (rows && rows[index]) {
      const { error } = await supabase.from('tour_expenses').delete().eq('id', rows[index].id);
      if (error) throw error;
    }
  }

  // Tour Meals
  async getMeals(tourId: string): Promise<Meal[]> {
    const { data, error } = await supabase.from('tour_meals').select('*').eq('tour_id', tourId).order('date');
    if (error) throw error;
    return (data || []).map((row) => ({
      name: row.name,
      price: Number(row.price) || 0,
      date: row.date,
    }));
  }

  async addMeal(tourId: string, meal: Meal): Promise<void> {
    const { error } = await supabase.from('tour_meals').insert({
      tour_id: tourId,
      name: meal.name,
      price: meal.price,
      date: meal.date,
    });
    if (error) throw error;
  }

  async updateMeal(tourId: string, index: number, meal: Meal): Promise<void> {
    const { data: rows } = await supabase.from('tour_meals').select('id').eq('tour_id', tourId).order('date');
    if (rows && rows[index]) {
      const { error } = await supabase.from('tour_meals').update({
        name: meal.name,
        price: meal.price,
        date: meal.date,
      }).eq('id', rows[index].id);
      if (error) throw error;
    }
  }

  async removeMeal(tourId: string, index: number): Promise<void> {
    const { data: rows } = await supabase.from('tour_meals').select('id').eq('tour_id', tourId).order('date');
    if (rows && rows[index]) {
      const { error } = await supabase.from('tour_meals').delete().eq('id', rows[index].id);
      if (error) throw error;
    }
  }

  // Tour Allowances
  async getAllowances(tourId: string): Promise<Allowance[]> {
    const { data, error } = await supabase.from('tour_allowances').select('*').eq('tour_id', tourId).order('date');
    if (error) throw error;
    return (data || []).map((row) => ({
      date: row.date,
      province: row.province,
      amount: Number(row.amount) || 0,
    }));
  }

  async addAllowance(tourId: string, allowance: Allowance): Promise<void> {
    const { error } = await supabase.from('tour_allowances').insert({
      tour_id: tourId,
      date: allowance.date,
      province: allowance.province,
      amount: allowance.amount,
    });
    if (error) throw error;
  }

  async updateAllowance(tourId: string, index: number, allowance: Allowance): Promise<void> {
    const { data: rows } = await supabase.from('tour_allowances').select('id').eq('tour_id', tourId).order('date');
    if (rows && rows[index]) {
      const { error } = await supabase.from('tour_allowances').update({
        date: allowance.date,
        province: allowance.province,
        amount: allowance.amount,
      }).eq('id', rows[index].id);
      if (error) throw error;
    }
  }

  async removeAllowance(tourId: string, index: number): Promise<void> {
    const { data: rows } = await supabase.from('tour_allowances').select('id').eq('tour_id', tourId).order('date');
    if (rows && rows[index]) {
      const { error } = await supabase.from('tour_allowances').delete().eq('id', rows[index].id);
      if (error) throw error;
    }
  }

  // Data Import/Export
  async exportData(): Promise<any> {
    const [guides, companies, nationalities, provinces, destinations, shoppings, categories, expenses, tours] = await Promise.all([
      this.listGuides(),
      this.listCompanies(),
      this.listNationalities(),
      this.listProvinces(),
      this.listTouristDestinations(),
      this.listShoppings(),
      this.listExpenseCategories(),
      this.listDetailedExpenses(),
      this.listTours(),
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
      tours,
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
        const { id, createdAt, updatedAt, ...rest } = tour;
        await this.createTour(rest);
      }
    }
  }

  async clearAllData(): Promise<void> {
    await Promise.all([
      supabase.from('tours').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('detailed_expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('expense_categories').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('shoppings').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('tourist_destinations').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('provinces').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('nationalities').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('companies').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('guides').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
    ]);
  }
}
