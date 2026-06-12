import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import type { Language, Guide, Company, Nationality, Province, TouristDestination, Shopping, ExpenseCategory, DetailedExpense } from '@/types/master';
import type { Tour, Destination, Expense, Meal, Allowance, Shopping as TourShopping, TourQuery, TourListResult } from '@/types/tour';
import type { SearchQuery } from '@/types/datastore';
import { MASTER_ADMIN_EMAIL } from '@/lib/auth-constants';

export class TourDataModule {
  declare protected supabase: SupabaseClient<Database>;

  // Master data list declares
  declare listGuideUsers: (query?: SearchQuery) => Promise<Guide[]>;
  declare listLanguages: () => Promise<Language[]>;
  declare listCompanies: () => Promise<Company[]>;
  declare listNationalities: () => Promise<Nationality[]>;
  declare listProvinces: () => Promise<Province[]>;
  declare listTouristDestinations: () => Promise<TouristDestination[]>;
  declare listShoppings: () => Promise<Shopping[]>;
  declare listExpenseCategories: () => Promise<ExpenseCategory[]>;
  declare listDetailedExpenses: () => Promise<DetailedExpense[]>;

  // Master data create declares
  declare createLanguage: (input: Omit<Language, 'id' | 'createdAt' | 'updatedAt' | 'searchKeywords'>) => Promise<Language>;
  declare createCompany: (input: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Company>;
  declare createNationality: (input: Omit<Nationality, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Nationality>;
  declare createProvince: (input: Omit<Province, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Province>;
  declare createTouristDestination: (input: Omit<TouristDestination, 'id' | 'createdAt' | 'updatedAt'>) => Promise<TouristDestination>;
  declare createShopping: (input: Omit<Shopping, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Shopping>;
  declare createExpenseCategory: (input: Omit<ExpenseCategory, 'id' | 'createdAt' | 'updatedAt'>) => Promise<ExpenseCategory>;
  declare createDetailedExpense: (input: Omit<DetailedExpense, 'id' | 'createdAt' | 'updatedAt'>) => Promise<DetailedExpense>;

  // Tour declares
  declare listTours: (query?: TourQuery, options?: { includeDetails?: boolean }) => Promise<TourListResult>;
  declare createTour: (tour: Omit<Tour, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Tour>;
  declare updateTour: (id: string, tour: Partial<Tour>) => Promise<void>;
  declare addDestination: (tourId: string, destination: Destination) => Promise<string | undefined>;
  declare addExpense: (tourId: string, expense: Expense) => Promise<string | undefined>;
  declare addMeal: (tourId: string, meal: Meal) => Promise<string | undefined>;
  declare addAllowance: (tourId: string, allowance: Allowance) => Promise<void>;

  async getToursGrandTotal(): Promise<{ count: number; grandTotal: number }> {
    const currentProfile = await this.getCurrentUserProfile();
    let queryBuilder = this.supabase.from('tours').select('final_total', { count: 'exact' });
    const isMasterAdmin = currentProfile?.email === MASTER_ADMIN_EMAIL;
    if (!isMasterAdmin && currentProfile?.settlementRole === 'guide') {
      queryBuilder = queryBuilder.eq('guide_id', currentProfile.id);
    }
    const { data, error, count } = await queryBuilder;

    if (error) throw error;

    const rows = data || [];
    const grandTotal = rows.reduce((sum, tour) => sum + (Number(tour.final_total) || 0), 0);
    return { count: typeof count === 'number' ? count : rows.length, grandTotal };
  }

  async exportData(): Promise<any> {
    const [guides, languages, companies, nationalities, provinces, destinations, shoppings, categories, expenses, tourResult] = await Promise.all([
      this.listGuideUsers(),
      this.listLanguages(),
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
      languages,
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
    if (data.languages) {
      for (const language of data.languages) {
        const { id, createdAt, updatedAt, createdBy, searchKeywords, ...rest } = language;
        await this.createLanguage(rest);
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

        if (destinations && destinations.length > 0) {
          await Promise.all(destinations.map((dest: Destination) => this.addDestination(createdTour.id, dest)));
        }
        if (expenses && expenses.length > 0) {
          await Promise.all(expenses.map((exp: Expense) => this.addExpense(createdTour.id, exp)));
        }
        if (meals && meals.length > 0) {
          await Promise.all(meals.map((meal: Meal) => this.addMeal(createdTour.id, meal)));
        }
        if (allowances && allowances.length > 0) {
          await Promise.all(allowances.map((allow: Allowance) => this.addAllowance(createdTour.id, allow)));
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
    ]);
  }
}
