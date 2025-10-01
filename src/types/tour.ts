export interface EntityRef {
  id: string;
  nameAtBooking: string;
}

export interface Destination {
  name: string;
  price: number;
  date: string;
}

export interface Expense {
  name: string;
  price: number;
  date: string;
}

export interface Meal {
  name: string;
  price: number;
  date: string;
}

export interface Allowance {
  date: string;
  province: string;
  amount: number;
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
}

export interface TourQuery {
  tourCode?: string;
  clientName?: string;
  companyId?: string;
  guideId?: string;
  startDate?: string;
  endDate?: string;
}
