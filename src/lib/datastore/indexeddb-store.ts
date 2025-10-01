import type { DataStore, SearchQuery } from '@/types/datastore';
import type { Guide, GuideInput, Company, CompanyInput, Nationality, NationalityInput, Province, ProvinceInput, TouristDestination, TouristDestinationInput, Shopping, ShoppingInput, ExpenseCategory, ExpenseCategoryInput, DetailedExpense, DetailedExpenseInput } from '@/types/master';
import type { Tour, TourInput, TourQuery, Destination, Expense, Meal, Allowance } from '@/types/tour';
import { db } from './db';
import { generateSearchKeywords, normalizeForUnique } from '../string-utils';
import { daysBetween } from '../date-utils';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function nowISO(): string {
  return new Date().toISOString();
}

export class IndexedDbStore implements DataStore {
  // ===== GUIDES =====
  async listGuides(query?: SearchQuery): Promise<Guide[]> {
    let collection = db.guides.toCollection();
    
    if (query?.status && query.status !== 'all') {
      collection = db.guides.where('status').equals(query.status);
    }
    
    let guides = await collection.toArray();
    
    if (query?.search) {
      const searchLower = normalizeForUnique(query.search);
      guides = guides.filter(g => 
        g.searchKeywords.some(kw => kw.includes(searchLower)) ||
        normalizeForUnique(g.name).includes(searchLower)
      );
    }
    
    return guides.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getGuide(id: string): Promise<Guide | undefined> {
    return await db.guides.get(id);
  }

  async createGuide(input: GuideInput): Promise<Guide> {
    const normalized = normalizeForUnique(input.name);
    const existing = await db.guides.toArray();
    const duplicate = existing.find(g => normalizeForUnique(g.name) === normalized);
    
    if (duplicate) {
      throw new Error(`Guide "${input.name}" already exists`);
    }

    const guide: Guide = {
      id: generateId(),
      name: input.name.trim(),
      phone: input.phone?.trim() || '',
      note: input.note?.trim() || '',
      status: 'active',
      searchKeywords: generateSearchKeywords(input.name),
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };

    await db.guides.add(guide);
    return guide;
  }

  async updateGuide(id: string, patch: Partial<Guide>): Promise<void> {
    if (patch.name) {
      const normalized = normalizeForUnique(patch.name);
      const existing = await db.guides.toArray();
      const duplicate = existing.find(g => g.id !== id && normalizeForUnique(g.name) === normalized);
      
      if (duplicate) {
        throw new Error(`Guide "${patch.name}" already exists`);
      }
      
      patch.searchKeywords = generateSearchKeywords(patch.name);
    }
    
    await db.guides.update(id, { ...patch, updatedAt: nowISO() });
  }

  async toggleGuideStatus(id: string): Promise<void> {
    const guide = await db.guides.get(id);
    if (guide) {
      await db.guides.update(id, {
        status: guide.status === 'active' ? 'inactive' : 'active',
        updatedAt: nowISO(),
      });
    }
  }

  async duplicateGuide(id: string): Promise<Guide> {
    const original = await db.guides.get(id);
    if (!original) throw new Error('Guide not found');
    
    const duplicate: Guide = {
      ...original,
      id: generateId(),
      name: `${original.name} (Copy)`,
      searchKeywords: generateSearchKeywords(`${original.name} (Copy)`),
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    
    await db.guides.add(duplicate);
    return duplicate;
  }

  async deleteGuide(id: string): Promise<void> {
    await db.guides.delete(id);
  }

  // ===== COMPANIES =====
  async listCompanies(query?: SearchQuery): Promise<Company[]> {
    let collection = db.companies.toCollection();
    
    if (query?.status && query.status !== 'all') {
      collection = db.companies.where('status').equals(query.status);
    }
    
    let companies = await collection.toArray();
    
    if (query?.search) {
      const searchLower = normalizeForUnique(query.search);
      companies = companies.filter(c => 
        c.searchKeywords.some(kw => kw.includes(searchLower)) ||
        normalizeForUnique(c.name).includes(searchLower)
      );
    }
    
    return companies.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getCompany(id: string): Promise<Company | undefined> {
    return await db.companies.get(id);
  }

  async createCompany(input: CompanyInput): Promise<Company> {
    const normalized = normalizeForUnique(input.name);
    const existing = await db.companies.toArray();
    const duplicate = existing.find(c => normalizeForUnique(c.name) === normalized);
    
    if (duplicate) {
      throw new Error(`Company "${input.name}" already exists`);
    }

    const company: Company = {
      id: generateId(),
      name: input.name.trim(),
      contactName: input.contactName?.trim() || '',
      phone: input.phone?.trim() || '',
      email: input.email?.trim() || '',
      note: input.note?.trim() || '',
      status: 'active',
      searchKeywords: generateSearchKeywords(input.name),
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };

    await db.companies.add(company);
    return company;
  }

  async updateCompany(id: string, patch: Partial<Company>): Promise<void> {
    if (patch.name) {
      const normalized = normalizeForUnique(patch.name);
      const existing = await db.companies.toArray();
      const duplicate = existing.find(c => c.id !== id && normalizeForUnique(c.name) === normalized);
      
      if (duplicate) {
        throw new Error(`Company "${patch.name}" already exists`);
      }
      
      patch.searchKeywords = generateSearchKeywords(patch.name);
    }
    
    await db.companies.update(id, { ...patch, updatedAt: nowISO() });
  }

  async toggleCompanyStatus(id: string): Promise<void> {
    const company = await db.companies.get(id);
    if (company) {
      await db.companies.update(id, {
        status: company.status === 'active' ? 'inactive' : 'active',
        updatedAt: nowISO(),
      });
    }
  }

  async duplicateCompany(id: string): Promise<Company> {
    const original = await db.companies.get(id);
    if (!original) throw new Error('Company not found');
    
    const duplicate: Company = {
      ...original,
      id: generateId(),
      name: `${original.name} (Copy)`,
      searchKeywords: generateSearchKeywords(`${original.name} (Copy)`),
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    
    await db.companies.add(duplicate);
    return duplicate;
  }

  async deleteCompany(id: string): Promise<void> {
    await db.companies.delete(id);
  }

  // ===== NATIONALITIES =====
  async listNationalities(query?: SearchQuery): Promise<Nationality[]> {
    let collection = db.nationalities.toCollection();
    
    if (query?.status && query.status !== 'all') {
      collection = db.nationalities.where('status').equals(query.status);
    }
    
    let nationalities = await collection.toArray();
    
    if (query?.search) {
      const searchLower = normalizeForUnique(query.search);
      nationalities = nationalities.filter(n => 
        n.searchKeywords.some(kw => kw.includes(searchLower)) ||
        normalizeForUnique(n.name).includes(searchLower)
      );
    }
    
    return nationalities.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getNationality(id: string): Promise<Nationality | undefined> {
    return await db.nationalities.get(id);
  }

  async createNationality(input: NationalityInput): Promise<Nationality> {
    const normalized = normalizeForUnique(input.name);
    const existing = await db.nationalities.toArray();
    const duplicate = existing.find(n => normalizeForUnique(n.name) === normalized);
    
    if (duplicate) {
      throw new Error(`Nationality "${input.name}" already exists`);
    }

    const nationality: Nationality = {
      id: generateId(),
      name: input.name.trim(),
      iso2: input.iso2?.trim(),
      emoji: input.emoji?.trim(),
      status: 'active',
      searchKeywords: generateSearchKeywords(input.name),
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };

    await db.nationalities.add(nationality);
    return nationality;
  }

  async updateNationality(id: string, patch: Partial<Nationality>): Promise<void> {
    if (patch.name) {
      const normalized = normalizeForUnique(patch.name);
      const existing = await db.nationalities.toArray();
      const duplicate = existing.find(n => n.id !== id && normalizeForUnique(n.name) === normalized);
      
      if (duplicate) {
        throw new Error(`Nationality "${patch.name}" already exists`);
      }
      
      patch.searchKeywords = generateSearchKeywords(patch.name);
    }
    
    await db.nationalities.update(id, { ...patch, updatedAt: nowISO() });
  }

  async toggleNationalityStatus(id: string): Promise<void> {
    const nationality = await db.nationalities.get(id);
    if (nationality) {
      await db.nationalities.update(id, {
        status: nationality.status === 'active' ? 'inactive' : 'active',
        updatedAt: nowISO(),
      });
    }
  }

  async duplicateNationality(id: string): Promise<Nationality> {
    const original = await db.nationalities.get(id);
    if (!original) throw new Error('Nationality not found');
    
    const duplicate: Nationality = {
      ...original,
      id: generateId(),
      name: `${original.name} (Copy)`,
      searchKeywords: generateSearchKeywords(`${original.name} (Copy)`),
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    
    await db.nationalities.add(duplicate);
    return duplicate;
  }

  async deleteNationality(id: string): Promise<void> {
    await db.nationalities.delete(id);
  }

  // ===== PROVINCES =====
  async listProvinces(query?: SearchQuery): Promise<Province[]> {
    let collection = db.provinces.toCollection();
    
    if (query?.status && query.status !== 'all') {
      collection = db.provinces.where('status').equals(query.status);
    }
    
    let provinces = await collection.toArray();
    
    if (query?.search) {
      const searchLower = normalizeForUnique(query.search);
      provinces = provinces.filter(p => 
        p.searchKeywords.some(kw => kw.includes(searchLower)) ||
        normalizeForUnique(p.name).includes(searchLower)
      );
    }
    
    return provinces.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getProvince(id: string): Promise<Province | undefined> {
    return await db.provinces.get(id);
  }

  async createProvince(input: ProvinceInput): Promise<Province> {
    const normalized = normalizeForUnique(input.name);
    const existing = await db.provinces.toArray();
    const duplicate = existing.find(p => normalizeForUnique(p.name) === normalized);
    
    if (duplicate) {
      throw new Error(`Province "${input.name}" already exists`);
    }

    const province: Province = {
      id: generateId(),
      name: input.name.trim(),
      status: 'active',
      searchKeywords: generateSearchKeywords(input.name),
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };

    await db.provinces.add(province);
    return province;
  }

  async updateProvince(id: string, patch: Partial<Province>): Promise<void> {
    if (patch.name) {
      const normalized = normalizeForUnique(patch.name);
      const existing = await db.provinces.toArray();
      const duplicate = existing.find(p => p.id !== id && normalizeForUnique(p.name) === normalized);
      
      if (duplicate) {
        throw new Error(`Province "${patch.name}" already exists`);
      }
      
      patch.searchKeywords = generateSearchKeywords(patch.name);
    }
    
    await db.provinces.update(id, { ...patch, updatedAt: nowISO() });
  }

  async toggleProvinceStatus(id: string): Promise<void> {
    const province = await db.provinces.get(id);
    if (province) {
      await db.provinces.update(id, {
        status: province.status === 'active' ? 'inactive' : 'active',
        updatedAt: nowISO(),
      });
    }
  }

  async duplicateProvince(id: string): Promise<Province> {
    const original = await db.provinces.get(id);
    if (!original) throw new Error('Province not found');
    
    const duplicate: Province = {
      ...original,
      id: generateId(),
      name: `${original.name} (Copy)`,
      searchKeywords: generateSearchKeywords(`${original.name} (Copy)`),
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    
    await db.provinces.add(duplicate);
    return duplicate;
  }

  async deleteProvince(id: string): Promise<void> {
    await db.provinces.delete(id);
  }

  // ===== TOURIST DESTINATIONS =====
  async listTouristDestinations(query?: SearchQuery): Promise<TouristDestination[]> {
    let collection = db.touristDestinations.toCollection();
    
    if (query?.status && query.status !== 'all') {
      collection = db.touristDestinations.where('status').equals(query.status);
    }
    
    let destinations = await collection.toArray();
    
    if (query?.search) {
      const searchLower = normalizeForUnique(query.search);
      destinations = destinations.filter(d => 
        d.searchKeywords.some(kw => kw.includes(searchLower)) ||
        normalizeForUnique(d.name).includes(searchLower)
      );
    }
    
    return destinations.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getTouristDestination(id: string): Promise<TouristDestination | undefined> {
    return await db.touristDestinations.get(id);
  }

  async createTouristDestination(input: TouristDestinationInput): Promise<TouristDestination> {
    const normalized = normalizeForUnique(input.name);
    const existing = await db.touristDestinations.toArray();
    const duplicate = existing.find(d => normalizeForUnique(d.name) === normalized);
    
    if (duplicate) {
      throw new Error(`Destination "${input.name}" already exists`);
    }

    const destination: TouristDestination = {
      id: generateId(),
      name: input.name.trim(),
      price: input.price,
      provinceRef: input.provinceRef,
      status: 'active',
      searchKeywords: generateSearchKeywords(input.name),
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };

    await db.touristDestinations.add(destination);
    return destination;
  }

  async updateTouristDestination(id: string, patch: Partial<TouristDestination>): Promise<void> {
    if (patch.name) {
      const normalized = normalizeForUnique(patch.name);
      const existing = await db.touristDestinations.toArray();
      const duplicate = existing.find(d => d.id !== id && normalizeForUnique(d.name) === normalized);
      
      if (duplicate) {
        throw new Error(`Destination "${patch.name}" already exists`);
      }
      
      patch.searchKeywords = generateSearchKeywords(patch.name);
    }
    
    await db.touristDestinations.update(id, { ...patch, updatedAt: nowISO() });
  }

  async toggleTouristDestinationStatus(id: string): Promise<void> {
    const destination = await db.touristDestinations.get(id);
    if (destination) {
      await db.touristDestinations.update(id, {
        status: destination.status === 'active' ? 'inactive' : 'active',
        updatedAt: nowISO(),
      });
    }
  }

  async duplicateTouristDestination(id: string): Promise<TouristDestination> {
    const original = await db.touristDestinations.get(id);
    if (!original) throw new Error('Tourist destination not found');
    
    const duplicate: TouristDestination = {
      ...original,
      id: generateId(),
      name: `${original.name} (Copy)`,
      searchKeywords: generateSearchKeywords(`${original.name} (Copy)`),
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    
    await db.touristDestinations.add(duplicate);
    return duplicate;
  }

  async deleteTouristDestination(id: string): Promise<void> {
    await db.touristDestinations.delete(id);
  }

  // ===== SHOPPING =====
  async listShoppings(query?: SearchQuery): Promise<Shopping[]> {
    let collection = db.shoppings.toCollection();
    
    if (query?.status && query.status !== 'all') {
      collection = db.shoppings.where('status').equals(query.status);
    }
    
    let shoppings = await collection.toArray();
    
    if (query?.search) {
      const searchLower = normalizeForUnique(query.search);
      shoppings = shoppings.filter(s => 
        s.searchKeywords.some(kw => kw.includes(searchLower)) ||
        normalizeForUnique(s.name).includes(searchLower)
      );
    }
    
    return shoppings.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getShopping(id: string): Promise<Shopping | undefined> {
    return await db.shoppings.get(id);
  }

  async createShopping(input: ShoppingInput): Promise<Shopping> {
    const normalized = normalizeForUnique(input.name);
    const existing = await db.shoppings.toArray();
    const duplicate = existing.find(s => normalizeForUnique(s.name) === normalized);
    
    if (duplicate) {
      throw new Error(`Shopping "${input.name}" already exists`);
    }

    const shopping: Shopping = {
      id: generateId(),
      name: input.name.trim(),
      status: 'active',
      searchKeywords: generateSearchKeywords(input.name),
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };

    await db.shoppings.add(shopping);
    return shopping;
  }

  async updateShopping(id: string, patch: Partial<Shopping>): Promise<void> {
    if (patch.name) {
      const normalized = normalizeForUnique(patch.name);
      const existing = await db.shoppings.toArray();
      const duplicate = existing.find(s => s.id !== id && normalizeForUnique(s.name) === normalized);
      
      if (duplicate) {
        throw new Error(`Shopping "${patch.name}" already exists`);
      }
      
      patch.searchKeywords = generateSearchKeywords(patch.name);
    }
    
    await db.shoppings.update(id, { ...patch, updatedAt: nowISO() });
  }

  async toggleShoppingStatus(id: string): Promise<void> {
    const shopping = await db.shoppings.get(id);
    if (shopping) {
      await db.shoppings.update(id, {
        status: shopping.status === 'active' ? 'inactive' : 'active',
        updatedAt: nowISO(),
      });
    }
  }

  async duplicateShopping(id: string): Promise<Shopping> {
    const original = await db.shoppings.get(id);
    if (!original) throw new Error('Shopping not found');
    
    const duplicate: Shopping = {
      ...original,
      id: generateId(),
      name: `${original.name} (Copy)`,
      searchKeywords: generateSearchKeywords(`${original.name} (Copy)`),
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    
    await db.shoppings.add(duplicate);
    return duplicate;
  }

  async deleteShopping(id: string): Promise<void> {
    await db.shoppings.delete(id);
  }

  // ===== EXPENSE CATEGORIES =====
  async listExpenseCategories(query?: SearchQuery): Promise<ExpenseCategory[]> {
    let collection = db.expenseCategories.toCollection();
    
    if (query?.status && query.status !== 'all') {
      collection = db.expenseCategories.where('status').equals(query.status);
    }
    
    let categories = await collection.toArray();
    
    if (query?.search) {
      const searchLower = normalizeForUnique(query.search);
      categories = categories.filter(c => 
        c.searchKeywords.some(kw => kw.includes(searchLower)) ||
        normalizeForUnique(c.name).includes(searchLower)
      );
    }
    
    return categories.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getExpenseCategory(id: string): Promise<ExpenseCategory | undefined> {
    return await db.expenseCategories.get(id);
  }

  async createExpenseCategory(input: ExpenseCategoryInput): Promise<ExpenseCategory> {
    const normalized = normalizeForUnique(input.name);
    const existing = await db.expenseCategories.toArray();
    const duplicate = existing.find(c => normalizeForUnique(c.name) === normalized);
    
    if (duplicate) {
      throw new Error(`Expense Category "${input.name}" already exists`);
    }

    const category: ExpenseCategory = {
      id: generateId(),
      name: input.name.trim(),
      status: 'active',
      searchKeywords: generateSearchKeywords(input.name),
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };

    await db.expenseCategories.add(category);
    return category;
  }

  async updateExpenseCategory(id: string, patch: Partial<ExpenseCategory>): Promise<void> {
    if (patch.name) {
      const normalized = normalizeForUnique(patch.name);
      const existing = await db.expenseCategories.toArray();
      const duplicate = existing.find(c => c.id !== id && normalizeForUnique(c.name) === normalized);
      
      if (duplicate) {
        throw new Error(`Expense Category "${patch.name}" already exists`);
      }
      
      patch.searchKeywords = generateSearchKeywords(patch.name);
    }
    
    await db.expenseCategories.update(id, { ...patch, updatedAt: nowISO() });
  }

  async toggleExpenseCategoryStatus(id: string): Promise<void> {
    const category = await db.expenseCategories.get(id);
    if (category) {
      await db.expenseCategories.update(id, {
        status: category.status === 'active' ? 'inactive' : 'active',
        updatedAt: nowISO(),
      });
    }
  }

  async duplicateExpenseCategory(id: string): Promise<ExpenseCategory> {
    const original = await db.expenseCategories.get(id);
    if (!original) throw new Error('Expense category not found');
    
    const duplicate: ExpenseCategory = {
      ...original,
      id: generateId(),
      name: `${original.name} (Copy)`,
      searchKeywords: generateSearchKeywords(`${original.name} (Copy)`),
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    
    await db.expenseCategories.add(duplicate);
    return duplicate;
  }

  async deleteExpenseCategory(id: string): Promise<void> {
    await db.expenseCategories.delete(id);
  }

  // ===== DETAILED EXPENSES =====
  async listDetailedExpenses(query?: SearchQuery): Promise<DetailedExpense[]> {
    let collection = db.detailedExpenses.toCollection();
    
    if (query?.status && query.status !== 'all') {
      collection = db.detailedExpenses.where('status').equals(query.status);
    }
    
    let expenses = await collection.toArray();
    
    if (query?.search) {
      const searchLower = normalizeForUnique(query.search);
      expenses = expenses.filter(e => 
        e.searchKeywords.some(kw => kw.includes(searchLower)) ||
        normalizeForUnique(e.name).includes(searchLower)
      );
    }
    
    return expenses.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getDetailedExpense(id: string): Promise<DetailedExpense | undefined> {
    return await db.detailedExpenses.get(id);
  }

  async createDetailedExpense(input: DetailedExpenseInput): Promise<DetailedExpense> {
    const normalized = normalizeForUnique(input.name);
    const existing = await db.detailedExpenses.toArray();
    const duplicate = existing.find(e => normalizeForUnique(e.name) === normalized);
    
    if (duplicate) {
      throw new Error(`Detailed Expense "${input.name}" already exists`);
    }

    const expense: DetailedExpense = {
      id: generateId(),
      name: input.name.trim(),
      price: input.price,
      categoryRef: input.categoryRef,
      status: 'active',
      searchKeywords: generateSearchKeywords(input.name),
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };

    await db.detailedExpenses.add(expense);
    return expense;
  }

  async updateDetailedExpense(id: string, patch: Partial<DetailedExpense>): Promise<void> {
    if (patch.name) {
      const normalized = normalizeForUnique(patch.name);
      const existing = await db.detailedExpenses.toArray();
      const duplicate = existing.find(e => e.id !== id && normalizeForUnique(e.name) === normalized);
      
      if (duplicate) {
        throw new Error(`Detailed Expense "${patch.name}" already exists`);
      }
      
      patch.searchKeywords = generateSearchKeywords(patch.name);
    }
    
    await db.detailedExpenses.update(id, { ...patch, updatedAt: nowISO() });
  }

  async toggleDetailedExpenseStatus(id: string): Promise<void> {
    const expense = await db.detailedExpenses.get(id);
    if (expense) {
      await db.detailedExpenses.update(id, {
        status: expense.status === 'active' ? 'inactive' : 'active',
        updatedAt: nowISO(),
      });
    }
  }

  async duplicateDetailedExpense(id: string): Promise<DetailedExpense> {
    const original = await db.detailedExpenses.get(id);
    if (!original) throw new Error('Detailed expense not found');
    
    const duplicate: DetailedExpense = {
      ...original,
      id: generateId(),
      name: `${original.name} (Copy)`,
      searchKeywords: generateSearchKeywords(`${original.name} (Copy)`),
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    
    await db.detailedExpenses.add(duplicate);
    return duplicate;
  }

  async deleteDetailedExpense(id: string): Promise<void> {
    await db.detailedExpenses.delete(id);
  }

  // ===== TOURS =====
  async listTours(query?: TourQuery, _options?: { includeDetails?: boolean }): Promise<Tour[]> {
    let tours = await db.tours.toArray();
    
    if (query?.tourCode) {
      const searchLower = query.tourCode.toLowerCase();
      tours = tours.filter(t => t.tourCode.toLowerCase().includes(searchLower));
    }
    
    if (query?.clientName) {
      const searchLower = query.clientName.toLowerCase();
      tours = tours.filter(t => t.clientName.toLowerCase().includes(searchLower));
    }
    
    if (query?.companyId) {
      tours = tours.filter(t => t.companyRef.id === query.companyId);
    }
    
    if (query?.guideId) {
      tours = tours.filter(t => t.guideRef.id === query.guideId);
    }
    
    return tours.sort((a, b) => b.startDate.localeCompare(a.startDate));
  }

  async getTour(id: string): Promise<Tour | undefined> {
    return await db.tours.get(id);
  }

  async createTour(input: TourInput): Promise<Tour> {
    const totalDays = daysBetween(input.startDate, input.endDate);
    
    const tour: Tour = {
      id: generateId(),
      tourCode: input.tourCode.trim(),
      companyRef: input.companyRef,
      guideRef: input.guideRef,
      clientNationalityRef: input.clientNationalityRef,
      clientName: input.clientName.trim(),
      adults: input.adults,
      children: input.children,
      totalGuests: input.adults + input.children,
      driverName: input.driverName?.trim() || '',
      clientPhone: input.clientPhone?.trim() || '',
      startDate: input.startDate,
      endDate: input.endDate,
      totalDays,
      destinations: [],
      expenses: [],
      meals: [],
      allowances: [],
      summary: { totalTabs: 0 },
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };

    await db.tours.add(tour);
    return tour;
  }

  async updateTour(id: string, patch: Partial<Tour>): Promise<void> {
    if (patch.adults !== undefined || patch.children !== undefined) {
      const tour = await db.tours.get(id);
      if (tour) {
        const adults = patch.adults ?? tour.adults;
        const children = patch.children ?? tour.children;
        patch.totalGuests = adults + children;
      }
    }
    
    if (patch.startDate || patch.endDate) {
      const tour = await db.tours.get(id);
      if (tour) {
        const startDate = patch.startDate ?? tour.startDate;
        const endDate = patch.endDate ?? tour.endDate;
        patch.totalDays = daysBetween(startDate, endDate);
      }
    }
    
    await db.tours.update(id, { ...patch, updatedAt: nowISO() });
  }

  async deleteTour(id: string): Promise<void> {
    await db.tours.delete(id);
  }

  async duplicateTour(id: string): Promise<Tour> {
    const original = await db.tours.get(id);
    if (!original) throw new Error('Tour not found');
    
    const duplicate: Tour = {
      ...original,
      id: generateId(),
      tourCode: `${original.tourCode}-COPY`,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    
    await db.tours.add(duplicate);
    return duplicate;
  }

  // ===== TOUR SUBCOLLECTIONS =====
  async addDestination(tourId: string, destination: Destination): Promise<void> {
    const tour = await db.tours.get(tourId);
    if (tour) {
      tour.destinations.push(destination);
      await db.tours.update(tourId, { destinations: tour.destinations, updatedAt: nowISO() });
    }
  }

  async updateDestination(tourId: string, index: number, destination: Destination): Promise<void> {
    const tour = await db.tours.get(tourId);
    if (tour && tour.destinations[index]) {
      tour.destinations[index] = destination;
      await db.tours.update(tourId, { destinations: tour.destinations, updatedAt: nowISO() });
    }
  }

  async removeDestination(tourId: string, index: number): Promise<void> {
    const tour = await db.tours.get(tourId);
    if (tour) {
      tour.destinations.splice(index, 1);
      await db.tours.update(tourId, { destinations: tour.destinations, updatedAt: nowISO() });
    }
  }

  async addExpense(tourId: string, expense: Expense): Promise<void> {
    const tour = await db.tours.get(tourId);
    if (tour) {
      tour.expenses.push(expense);
      await db.tours.update(tourId, { expenses: tour.expenses, updatedAt: nowISO() });
    }
  }

  async updateExpense(tourId: string, index: number, expense: Expense): Promise<void> {
    const tour = await db.tours.get(tourId);
    if (tour && tour.expenses[index]) {
      tour.expenses[index] = expense;
      await db.tours.update(tourId, { expenses: tour.expenses, updatedAt: nowISO() });
    }
  }

  async removeExpense(tourId: string, index: number): Promise<void> {
    const tour = await db.tours.get(tourId);
    if (tour) {
      tour.expenses.splice(index, 1);
      await db.tours.update(tourId, { expenses: tour.expenses, updatedAt: nowISO() });
    }
  }

  async addMeal(tourId: string, meal: Meal): Promise<void> {
    const tour = await db.tours.get(tourId);
    if (tour) {
      tour.meals.push(meal);
      await db.tours.update(tourId, { meals: tour.meals, updatedAt: nowISO() });
    }
  }

  async updateMeal(tourId: string, index: number, meal: Meal): Promise<void> {
    const tour = await db.tours.get(tourId);
    if (tour && tour.meals[index]) {
      tour.meals[index] = meal;
      await db.tours.update(tourId, { meals: tour.meals, updatedAt: nowISO() });
    }
  }

  async removeMeal(tourId: string, index: number): Promise<void> {
    const tour = await db.tours.get(tourId);
    if (tour) {
      tour.meals.splice(index, 1);
      await db.tours.update(tourId, { meals: tour.meals, updatedAt: nowISO() });
    }
  }

  async addAllowance(tourId: string, allowance: Allowance): Promise<void> {
    const tour = await db.tours.get(tourId);
    if (tour) {
      tour.allowances.push(allowance);
      await db.tours.update(tourId, { allowances: tour.allowances, updatedAt: nowISO() });
    }
  }

  async updateAllowance(tourId: string, index: number, allowance: Allowance): Promise<void> {
    const tour = await db.tours.get(tourId);
    if (tour && tour.allowances[index]) {
      tour.allowances[index] = allowance;
      await db.tours.update(tourId, { allowances: tour.allowances, updatedAt: nowISO() });
    }
  }

  async removeAllowance(tourId: string, index: number): Promise<void> {
    const tour = await db.tours.get(tourId);
    if (tour) {
      tour.allowances.splice(index, 1);
      await db.tours.update(tourId, { allowances: tour.allowances, updatedAt: nowISO() });
    }
  }

  // ===== DATA MANAGEMENT =====
  async exportData(): Promise<any> {
    const [guides, companies, nationalities, provinces, touristDestinations, shoppings, expenseCategories, detailedExpenses, tours] = await Promise.all([
      db.guides.toArray(),
      db.companies.toArray(),
      db.nationalities.toArray(),
      db.provinces.toArray(),
      db.touristDestinations.toArray(),
      db.shoppings.toArray(),
      db.expenseCategories.toArray(),
      db.detailedExpenses.toArray(),
      db.tours.toArray(),
    ]);

    return { guides, companies, nationalities, provinces, touristDestinations, shoppings, expenseCategories, detailedExpenses, tours };
  }

  async importData(data: any): Promise<void> {
    if (data.guides) {
      await db.guides.bulkPut(data.guides);
    }
    if (data.companies) {
      await db.companies.bulkPut(data.companies);
    }
    if (data.nationalities) {
      await db.nationalities.bulkPut(data.nationalities);
    }
    if (data.provinces) {
      await db.provinces.bulkPut(data.provinces);
    }
    if (data.touristDestinations) {
      await db.touristDestinations.bulkPut(data.touristDestinations);
    }
    if (data.shoppings) {
      await db.shoppings.bulkPut(data.shoppings);
    }
    if (data.expenseCategories) {
      await db.expenseCategories.bulkPut(data.expenseCategories);
    }
    if (data.detailedExpenses) {
      await db.detailedExpenses.bulkPut(data.detailedExpenses);
    }
    if (data.tours) {
      await db.tours.bulkPut(data.tours);
    }
  }

  async clearAllData(): Promise<void> {
    await Promise.all([
      db.guides.clear(),
      db.companies.clear(),
      db.nationalities.clear(),
      db.provinces.clear(),
      db.touristDestinations.clear(),
      db.shoppings.clear(),
      db.expenseCategories.clear(),
      db.detailedExpenses.clear(),
      db.tours.clear(),
    ]);
  }
}
