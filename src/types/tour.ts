export interface EntityRef {
  id: string;
  nameAtBooking: string;
}

export interface Destination {
  name: string;
  price: number;
  date: string;
  matchedId?: string;
  matchedPrice?: number;
}

export interface Expense {
  name: string;
  price: number;
  date: string;
  matchedId?: string;
  matchedPrice?: number;
}

export interface Meal {
  name: string;
  price: number;
  date: string;
  matchedId?: string;
  matchedPrice?: number;
}

export interface Allowance {
  date: string;
  name: string;
  price: number;
  quantity?: number;
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
  clientName?: string;
  companyId?: string;
  guideId?: string;
  startDate?: string;
  endDate?: string;
  nationalityId?: string;
  limit?: number;
  offset?: number;
}

export interface TourListResult {
  tours: Tour[];
  total: number;
}
