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
import type { Tour, TourDestination, TourExpense, Meal, Allowance } from '@/types/tour';
import { generateSearchKeywords } from '@/lib/string-utils';

export class SupabaseStore implements DataStore {
  // Helper to convert DB row to app format
  private mapGuide(row: any): Guide {
    return {
      id: row.id,
      name: row.name,
      status: row.status,
      searchKeywords: row.search_keywords || [],
    };
  }

  private mapCompany(row: any): Company {
    return {
      id: row.id,
      name: row.name,
      status: row.status,
      searchKeywords: row.search_keywords || [],
    };
  }

  private mapNationality(row: any): Nationality {
    return {
      id: row.id,
      name: row.name,
      status: row.status,
      searchKeywords: row.search_keywords || [],
    };
  }

  private mapProvince(row: any): Province {
    return {
      id: row.id,
      name: row.name,
      status: row.status,
      searchKeywords: row.search_keywords || [],
    };
  }

  private mapTouristDestination(row: any): TouristDestination {
    return {
      id: row.id,
      name: row.name,
      provinceRef: row.province_id ? { id: row.province_id } : undefined,
      status: row.status,
      searchKeywords: row.search_keywords || [],
    };
  }

  private mapShopping(row: any): Shopping {
    return {
      id: row.id,
      name: row.name,
      status: row.status,
      searchKeywords: row.search_keywords || [],
    };
  }

  private mapExpenseCategory(row: any): ExpenseCategory {
    return {
      id: row.id,
      name: row.name,
      status: row.status,
      searchKeywords: row.search_keywords || [],
    };
  }

  private mapDetailedExpense(row: any): DetailedExpense {
    return {
      id: row.id,
      name: row.name,
      categoryRef: row.category_id ? { id: row.category_id } : undefined,
      status: row.status,
      searchKeywords: row.search_keywords || [],
    };
  }

  private mapTour(row: any): Tour {
    return {
      id: row.id,
      tourCode: row.tour_code,
      startDate: row.start_date,
      endDate: row.end_date,
      companyRef: row.company_id ? { id: row.company_id } : undefined,
      guideRef: row.guide_id ? { id: row.guide_id } : undefined,
      numberOfGuests: row.number_of_guests || 0,
      nationalityRef: row.nationality_id ? { id: row.nationality_id } : undefined,
      notes: row.notes || '',
      destinations: [],
      expenses: [],
      meals: [],
      allowances: [],
    };
  }

  // Guides
  async listGuides(query?: SearchQuery): Promise<Guide[]> {
    let queryBuilder = supabase.from('guides').select('*').order('name');
    
    if (query?.status) {
      queryBuilder = queryBuilder.eq('status', query.status);
    }
    
    if (query?.search) {
      queryBuilder = queryBuilder.ilike('name', `%${query.search}%`);
    }

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
    return this.createGuide({ ...original, name: `${original.name} (Copy)` });
  }

  async toggleGuideStatus(id: string): Promise<void> {
    const guide = await this.getGuide(id);
    if (!guide) throw new Error('Guide not found');
    await this.updateGuide(id, { status: guide.status === 'active' ? 'inactive' : 'active' });
  }

  // Companies
  async listCompanies(query?: SearchQuery): Promise<Company[]> {
    let queryBuilder = supabase.from('companies').select('*').order('name');
    
    if (query?.status) {
      queryBuilder = queryBuilder.eq('status', query.status);
    }
    
    if (query?.search) {
      queryBuilder = queryBuilder.ilike('name', `%${query.search}%`);
    }

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
    return this.createCompany({ ...original, name: `${original.name} (Copy)` });
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
      .insert({ name: nationality.name, status: nationality.status, search_keywords: searchKeywords })
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
    return this.createNationality({ ...original, name: `${original.name} (Copy)` });
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
      .insert({ name: province.name, status: province.status, search_keywords: searchKeywords })
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
    return this.createProvince({ ...original, name: `${original.name} (Copy)` });
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
        province_id: destination.provinceRef?.id || null,
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
    if (destination.status !== undefined) updates.status = destination.status;
    if (destination.provinceRef !== undefined) updates.province_id = destination.provinceRef?.id || null;
    
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
    return this.createTouristDestination({ ...original, name: `${original.name} (Copy)` });
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
      .insert({ name: shopping.name, status: shopping.status, search_keywords: searchKeywords })
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
    return this.createShopping({ ...original, name: `${original.name} (Copy)` });
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
      .insert({ name: category.name, status: category.status, search_keywords: searchKeywords })
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
    return this.createExpenseCategory({ ...original, name: `${original.name} (Copy)` });
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

    const { data, error } = await queryBuilder;
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
        category_id: expense.categoryRef?.id || null,
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
    if (expense.status !== undefined) updates.status = expense.status;
    if (expense.categoryRef !== undefined) updates.category_id = expense.categoryRef?.id || null;
    
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
    return this.createDetailedExpense({ ...original, name: `${original.name} (Copy)` });
  }

  async toggleDetailedExpenseStatus(id: string): Promise<void> {
    const expense = await this.getDetailedExpense(id);
    if (!expense) throw new Error('Detailed expense not found');
    await this.updateDetailedExpense(id, { status: expense.status === 'active' ? 'inactive' : 'active' });
  }

  // Tours
  async listTours(query?: SearchQuery): Promise<Tour[]> {
    let queryBuilder = supabase.from('tours').select('*').order('start_date', { ascending: false });
    
    if (query?.search) {
      queryBuilder = queryBuilder.or(`tour_code.ilike.%${query.search}%,notes.ilike.%${query.search}%`);
    }

    const { data, error } = await queryBuilder;
    if (error) throw error;
    
    const tours = await Promise.all(
      (data || []).map(async (row) => {
        const tour = this.mapTour(row);
        tour.destinations = await this.getTourDestinations(tour.id);
        tour.expenses = await this.getTourExpenses(tour.id);
        tour.meals = await this.getTourMeals(tour.id);
        tour.allowances = await this.getTourAllowances(tour.id);
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
    tour.destinations = await this.getTourDestinations(id);
    tour.expenses = await this.getTourExpenses(id);
    tour.meals = await this.getTourMeals(id);
    tour.allowances = await this.getTourAllowances(id);
    
    return tour;
  }

  async createTour(tour: Omit<Tour, 'id'>): Promise<Tour> {
    const { data, error } = await supabase
      .from('tours')
      .insert({
        tour_code: tour.tourCode,
        start_date: tour.startDate,
        end_date: tour.endDate,
        company_id: tour.companyRef?.id || null,
        guide_id: tour.guideRef?.id || null,
        number_of_guests: tour.numberOfGuests,
        nationality_id: tour.nationalityRef?.id || null,
        notes: tour.notes,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    const newTour = this.mapTour(data);
    
    // Add subcollections
    if (tour.destinations?.length) {
      for (const dest of tour.destinations) {
        await this.addTourDestination(newTour.id, dest);
      }
    }
    if (tour.expenses?.length) {
      for (const exp of tour.expenses) {
        await this.addTourExpense(newTour.id, exp);
      }
    }
    if (tour.meals?.length) {
      for (const meal of tour.meals) {
        await this.addTourMeal(newTour.id, meal);
      }
    }
    if (tour.allowances?.length) {
      for (const allowance of tour.allowances) {
        await this.addTourAllowance(newTour.id, allowance);
      }
    }
    
    return this.getTour(newTour.id) as Promise<Tour>;
  }

  async updateTour(id: string, tour: Partial<Tour>): Promise<void> {
    const updates: any = {};
    if (tour.tourCode !== undefined) updates.tour_code = tour.tourCode;
    if (tour.startDate !== undefined) updates.start_date = tour.startDate;
    if (tour.endDate !== undefined) updates.end_date = tour.endDate;
    if (tour.companyRef !== undefined) updates.company_id = tour.companyRef?.id || null;
    if (tour.guideRef !== undefined) updates.guide_id = tour.guideRef?.id || null;
    if (tour.numberOfGuests !== undefined) updates.number_of_guests = tour.numberOfGuests;
    if (tour.nationalityRef !== undefined) updates.nationality_id = tour.nationalityRef?.id || null;
    if (tour.notes !== undefined) updates.notes = tour.notes;
    
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
    return this.createTour({ ...original, tourCode: `${original.tourCode}-COPY` });
  }

  // Tour Destinations
  async getTourDestinations(tourId: string): Promise<TourDestination[]> {
    const { data, error } = await supabase.from('tour_destinations').select('*').eq('tour_id', tourId);
    if (error) throw error;
    return (data || []).map((row) => ({
      id: row.id,
      destinationRef: row.destination_id ? { id: row.destination_id } : undefined,
    }));
  }

  async addTourDestination(tourId: string, destination: Omit<TourDestination, 'id'>): Promise<TourDestination> {
    const { data, error } = await supabase
      .from('tour_destinations')
      .insert({
        tour_id: tourId,
        destination_id: destination.destinationRef?.id || null,
      })
      .select()
      .single();
    
    if (error) throw error;
    return {
      id: data.id,
      destinationRef: data.destination_id ? { id: data.destination_id } : undefined,
    };
  }

  async updateTourDestination(tourId: string, destinationId: string, destination: Partial<TourDestination>): Promise<void> {
    const updates: any = {};
    if (destination.destinationRef !== undefined) {
      updates.destination_id = destination.destinationRef?.id || null;
    }
    
    const { error } = await supabase.from('tour_destinations').update(updates).eq('id', destinationId).eq('tour_id', tourId);
    if (error) throw error;
  }

  async removeTourDestination(tourId: string, destinationId: string): Promise<void> {
    const { error } = await supabase.from('tour_destinations').delete().eq('id', destinationId).eq('tour_id', tourId);
    if (error) throw error;
  }

  // Tour Expenses
  async getTourExpenses(tourId: string): Promise<TourExpense[]> {
    const { data, error } = await supabase.from('tour_expenses').select('*').eq('tour_id', tourId);
    if (error) throw error;
    return (data || []).map((row) => ({
      id: row.id,
      expenseRef: row.expense_id ? { id: row.expense_id } : undefined,
      amount: Number(row.amount) || 0,
      notes: row.notes || '',
    }));
  }

  async addTourExpense(tourId: string, expense: Omit<TourExpense, 'id'>): Promise<TourExpense> {
    const { data, error } = await supabase
      .from('tour_expenses')
      .insert({
        tour_id: tourId,
        expense_id: expense.expenseRef?.id || null,
        amount: expense.amount,
        notes: expense.notes,
      })
      .select()
      .single();
    
    if (error) throw error;
    return {
      id: data.id,
      expenseRef: data.expense_id ? { id: data.expense_id } : undefined,
      amount: Number(data.amount) || 0,
      notes: data.notes || '',
    };
  }

  async updateTourExpense(tourId: string, expenseId: string, expense: Partial<TourExpense>): Promise<void> {
    const updates: any = {};
    if (expense.expenseRef !== undefined) updates.expense_id = expense.expenseRef?.id || null;
    if (expense.amount !== undefined) updates.amount = expense.amount;
    if (expense.notes !== undefined) updates.notes = expense.notes;
    
    const { error } = await supabase.from('tour_expenses').update(updates).eq('id', expenseId).eq('tour_id', tourId);
    if (error) throw error;
  }

  async removeTourExpense(tourId: string, expenseId: string): Promise<void> {
    const { error } = await supabase.from('tour_expenses').delete().eq('id', expenseId).eq('tour_id', tourId);
    if (error) throw error;
  }

  // Tour Meals
  async getTourMeals(tourId: string): Promise<Meal[]> {
    const { data, error } = await supabase.from('tour_meals').select('*').eq('tour_id', tourId).order('date');
    if (error) throw error;
    return (data || []).map((row) => ({
      id: row.id,
      date: row.date,
      mealType: row.meal_type,
      shoppingRef: row.shopping_id ? { id: row.shopping_id } : undefined,
      price: Number(row.price) || 0,
    }));
  }

  async addTourMeal(tourId: string, meal: Omit<Meal, 'id'>): Promise<Meal> {
    const { data, error } = await supabase
      .from('tour_meals')
      .insert({
        tour_id: tourId,
        date: meal.date,
        meal_type: meal.mealType,
        shopping_id: meal.shoppingRef?.id || null,
        price: meal.price,
      })
      .select()
      .single();
    
    if (error) throw error;
    return {
      id: data.id,
      date: data.date,
      mealType: data.meal_type,
      shoppingRef: data.shopping_id ? { id: data.shopping_id } : undefined,
      price: Number(data.price) || 0,
    };
  }

  async updateTourMeal(tourId: string, mealId: string, meal: Partial<Meal>): Promise<void> {
    const updates: any = {};
    if (meal.date !== undefined) updates.date = meal.date;
    if (meal.mealType !== undefined) updates.meal_type = meal.mealType;
    if (meal.shoppingRef !== undefined) updates.shopping_id = meal.shoppingRef?.id || null;
    if (meal.price !== undefined) updates.price = meal.price;
    
    const { error } = await supabase.from('tour_meals').update(updates).eq('id', mealId).eq('tour_id', tourId);
    if (error) throw error;
  }

  async removeTourMeal(tourId: string, mealId: string): Promise<void> {
    const { error } = await supabase.from('tour_meals').delete().eq('id', mealId).eq('tour_id', tourId);
    if (error) throw error;
  }

  // Tour Allowances
  async getTourAllowances(tourId: string): Promise<Allowance[]> {
    const { data, error } = await supabase.from('tour_allowances').select('*').eq('tour_id', tourId).order('date');
    if (error) throw error;
    return (data || []).map((row) => ({
      id: row.id,
      date: row.date,
      amount: Number(row.amount) || 0,
      notes: row.notes || '',
    }));
  }

  async addTourAllowance(tourId: string, allowance: Omit<Allowance, 'id'>): Promise<Allowance> {
    const { data, error } = await supabase
      .from('tour_allowances')
      .insert({
        tour_id: tourId,
        date: allowance.date,
        amount: allowance.amount,
        notes: allowance.notes,
      })
      .select()
      .single();
    
    if (error) throw error;
    return {
      id: data.id,
      date: data.date,
      amount: Number(data.amount) || 0,
      notes: data.notes || '',
    };
  }

  async updateTourAllowance(tourId: string, allowanceId: string, allowance: Partial<Allowance>): Promise<void> {
    const updates: any = {};
    if (allowance.date !== undefined) updates.date = allowance.date;
    if (allowance.amount !== undefined) updates.amount = allowance.amount;
    if (allowance.notes !== undefined) updates.notes = allowance.notes;
    
    const { error } = await supabase.from('tour_allowances').update(updates).eq('id', allowanceId).eq('tour_id', tourId);
    if (error) throw error;
  }

  async removeTourAllowance(tourId: string, allowanceId: string): Promise<void> {
    const { error } = await supabase.from('tour_allowances').delete().eq('id', allowanceId).eq('tour_id', tourId);
    if (error) throw error;
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
    // Import master data first
    if (data.guides) {
      for (const guide of data.guides) {
        await this.createGuide(guide);
      }
    }
    if (data.companies) {
      for (const company of data.companies) {
        await this.createCompany(company);
      }
    }
    if (data.nationalities) {
      for (const nationality of data.nationalities) {
        await this.createNationality(nationality);
      }
    }
    if (data.provinces) {
      for (const province of data.provinces) {
        await this.createProvince(province);
      }
    }
    if (data.touristDestinations) {
      for (const destination of data.touristDestinations) {
        await this.createTouristDestination(destination);
      }
    }
    if (data.shoppings) {
      for (const shopping of data.shoppings) {
        await this.createShopping(shopping);
      }
    }
    if (data.expenseCategories) {
      for (const category of data.expenseCategories) {
        await this.createExpenseCategory(category);
      }
    }
    if (data.detailedExpenses) {
      for (const expense of data.detailedExpenses) {
        await this.createDetailedExpense(expense);
      }
    }
    
    // Import tours last
    if (data.tours) {
      for (const tour of data.tours) {
        await this.createTour(tour);
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
