export type EntityStatus = 'active' | 'inactive';

export interface Guide {
  id: string;
  name: string;
  phone: string;
  note: string;
  status: EntityStatus;
  searchKeywords: string[];
  createdAt: string;
  updatedAt: string;
}

export interface GuideInput {
  name: string;
  phone?: string;
  note?: string;
}

export interface Company {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  note: string;
  status: EntityStatus;
  searchKeywords: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CompanyInput {
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  note?: string;
}

export interface Nationality {
  id: string;
  name: string;
  iso2?: string;
  emoji?: string;
  status: EntityStatus;
  searchKeywords: string[];
  createdAt: string;
  updatedAt: string;
}

export interface NationalityInput {
  name: string;
  iso2?: string;
  emoji?: string;
}

export interface Province {
  id: string;
  name: string;
  status: EntityStatus;
  searchKeywords: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProvinceInput {
  name: string;
}

export interface TouristDestination {
  id: string;
  name: string;
  price: number;
  provinceRef: {
    id: string;
    nameAtBooking: string;
  };
  status: EntityStatus;
  searchKeywords: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TouristDestinationInput {
  name: string;
  price: number;
  provinceRef: {
    id: string;
    nameAtBooking: string;
  };
}

export interface Shopping {
  id: string;
  name: string;
  price: number;
  status: EntityStatus;
  searchKeywords: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ShoppingInput {
  name: string;
  price?: number;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  status: EntityStatus;
  searchKeywords: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseCategoryInput {
  name: string;
}

export interface DetailedExpense {
  id: string;
  name: string;
  price: number;
  categoryRef: {
    id: string;
    nameAtBooking: string;
  };
  status: EntityStatus;
  searchKeywords: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DetailedExpenseInput {
  name: string;
  price: number;
  categoryRef: {
    id: string;
    nameAtBooking: string;
  };
}
