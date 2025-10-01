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
