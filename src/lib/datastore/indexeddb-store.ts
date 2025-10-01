import type { DataStore, SearchQuery } from '@/types/datastore';
import type { Guide, GuideInput, Company, CompanyInput, Nationality, NationalityInput } from '@/types/master';
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

  // ===== TOURS =====
  async listTours(query?: TourQuery): Promise<Tour[]> {
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
    const [guides, companies, nationalities, tours] = await Promise.all([
      db.guides.toArray(),
      db.companies.toArray(),
      db.nationalities.toArray(),
      db.tours.toArray(),
    ]);

    return { guides, companies, nationalities, tours };
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
    if (data.tours) {
      await db.tours.bulkPut(data.tours);
    }
  }

  async clearAllData(): Promise<void> {
    await Promise.all([
      db.guides.clear(),
      db.companies.clear(),
      db.nationalities.clear(),
      db.tours.clear(),
    ]);
  }
}
