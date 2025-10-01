import type { Guide, GuideInput, Company, CompanyInput, Nationality, NationalityInput } from './master';
import type { Tour, TourInput, TourQuery, Destination, Expense, Meal, Allowance } from './tour';

export interface SearchQuery {
  search?: string;
  status?: 'active' | 'inactive' | 'all';
  limit?: number;
  offset?: number;
}

export interface DataStore {
  // Guides
  listGuides(query?: SearchQuery): Promise<Guide[]>;
  getGuide(id: string): Promise<Guide | undefined>;
  createGuide(input: GuideInput): Promise<Guide>;
  updateGuide(id: string, patch: Partial<Guide>): Promise<void>;
  toggleGuideStatus(id: string): Promise<void>;
  
  // Companies
  listCompanies(query?: SearchQuery): Promise<Company[]>;
  getCompany(id: string): Promise<Company | undefined>;
  createCompany(input: CompanyInput): Promise<Company>;
  updateCompany(id: string, patch: Partial<Company>): Promise<void>;
  toggleCompanyStatus(id: string): Promise<void>;
  
  // Nationalities
  listNationalities(query?: SearchQuery): Promise<Nationality[]>;
  getNationality(id: string): Promise<Nationality | undefined>;
  createNationality(input: NationalityInput): Promise<Nationality>;
  updateNationality(id: string, patch: Partial<Nationality>): Promise<void>;
  toggleNationalityStatus(id: string): Promise<void>;
  
  // Tours
  listTours(query?: TourQuery): Promise<Tour[]>;
  getTour(id: string): Promise<Tour | undefined>;
  createTour(input: TourInput): Promise<Tour>;
  updateTour(id: string, patch: Partial<Tour>): Promise<void>;
  deleteTour(id: string): Promise<void>;
  
  // Tour subcollections
  addDestination(tourId: string, destination: Destination): Promise<void>;
  updateDestination(tourId: string, index: number, destination: Destination): Promise<void>;
  removeDestination(tourId: string, index: number): Promise<void>;
  
  addExpense(tourId: string, expense: Expense): Promise<void>;
  updateExpense(tourId: string, index: number, expense: Expense): Promise<void>;
  removeExpense(tourId: string, index: number): Promise<void>;
  
  addMeal(tourId: string, meal: Meal): Promise<void>;
  updateMeal(tourId: string, index: number, meal: Meal): Promise<void>;
  removeMeal(tourId: string, index: number): Promise<void>;
  
  addAllowance(tourId: string, allowance: Allowance): Promise<void>;
  updateAllowance(tourId: string, index: number, allowance: Allowance): Promise<void>;
  removeAllowance(tourId: string, index: number): Promise<void>;
  
  // Data management
  exportData(): Promise<any>;
  importData(data: any): Promise<void>;
  clearAllData(): Promise<void>;
}
