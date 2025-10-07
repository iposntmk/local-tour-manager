export interface EntityRef {
  id: string;
  nameAtBooking: string;
}

export interface Destination {
  name: string;
  price: number;
  date: string;
  guests?: number;
  matchedId?: string;
  matchedPrice?: number;
}

export interface Expense {
  name: string;
  price: number;
  date: string;
  guests?: number; // Number of guests for this expense (defaults to total guests)
  matchedId?: string;
  matchedPrice?: number;
}

export interface Meal {
  name: string;
  price: number;
  date: string;
  guests?: number;
  matchedId?: string;
  matchedPrice?: number;
}

export interface Allowance {
  date: string;
  name: string;
  price: number;
  quantity?: number;
}

export interface Shopping {
  name: string;
  price: number;
  date: string;
  matchedId?: string;
  matchedPrice?: number;
}

export interface TourSummary {
  totalTabs: number;
  advancePayment?: number;
  totalAfterAdvance?: number;
  companyTip?: number;
  totalAfterTip?: number;
  collectionsForCompany?: number;
  totalAfterCollections?: number;
  finalTotal?: number;
}

export interface Tour {
  id: string;
  tourCode: string;
  companyRef: EntityRef;
  guideRef: EntityRef;
  clientNationalityRef: EntityRef;
  clientName: string;
  adults: number;
  children: number;
  totalGuests: number;
  driverName: string;
  clientPhone: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Subcollections stored as nested arrays
  destinations: Destination[];
  expenses: Expense[];
  meals: Meal[];
  allowances: Allowance[];
  shoppings: Shopping[];
  summary: TourSummary;
}

export interface TourInput {
  tourCode: string;
  companyRef: EntityRef;
  guideRef: EntityRef;
  clientNationalityRef: EntityRef;
  clientName: string;
  adults: number;
  children: number;
  driverName?: string;
  clientPhone?: string;
  startDate: string;
  endDate: string;
  notes?: string;
}

export interface TourQuery {
  tourCode?: string;
  // Optional granular search fields for better performance
  tourCodeLike?: string;
  dateLike?: string; // search substring for YYYY-MM-DD, e.g. "-10-05" for dd-mm
  dateLike2?: string; // optional alternate order fallback (e.g. "-05-10")
  dateRawLike?: string; // raw user input substring for contains matching
  companyNameLike?: string;
  clientName?: string;
  companyId?: string;
  guideId?: string;
  startDate?: string;
  endDate?: string;
  nationalityId?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'startDate' | 'endDate' | 'tourCode' | 'clientName' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface TourListResult {
  tours: Tour[];
  total: number;
}
