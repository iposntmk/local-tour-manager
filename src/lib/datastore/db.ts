import Dexie, { type Table } from 'dexie';
import type { Guide, Company, Nationality, Province, TouristDestination, Shopping, ExpenseCategory, DetailedExpense } from '@/types/master';
import type { Tour } from '@/types/tour';

export class TourManagerDB extends Dexie {
  guides!: Table<Guide, string>;
  companies!: Table<Company, string>;
  nationalities!: Table<Nationality, string>;
  provinces!: Table<Province, string>;
  touristDestinations!: Table<TouristDestination, string>;
  shoppings!: Table<Shopping, string>;
  expenseCategories!: Table<ExpenseCategory, string>;
  detailedExpenses!: Table<DetailedExpense, string>;
  tours!: Table<Tour, string>;

  constructor() {
    super('TourManagerDB');
    
    this.version(2).stores({
      guides: 'id, name, status, *searchKeywords',
      companies: 'id, name, status, *searchKeywords',
      nationalities: 'id, name, status, *searchKeywords',
      provinces: 'id, name, status, *searchKeywords',
      touristDestinations: 'id, name, status, *searchKeywords, provinceRef.id',
      shoppings: 'id, name, status, *searchKeywords',
      expenseCategories: 'id, name, status, *searchKeywords',
      detailedExpenses: 'id, name, status, *searchKeywords, categoryRef.id',
      tours: 'id, tourCode, startDate, endDate, companyRef.id, guideRef.id'
    });
  }
}

export const db = new TourManagerDB();
