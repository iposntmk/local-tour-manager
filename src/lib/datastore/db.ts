import Dexie, { type Table } from 'dexie';
import type { Guide, Company, Nationality } from '@/types/master';
import type { Tour } from '@/types/tour';

export class TourManagerDB extends Dexie {
  guides!: Table<Guide, string>;
  companies!: Table<Company, string>;
  nationalities!: Table<Nationality, string>;
  tours!: Table<Tour, string>;

  constructor() {
    super('TourManagerDB');
    
    this.version(1).stores({
      guides: 'id, name, status, *searchKeywords',
      companies: 'id, name, status, *searchKeywords',
      nationalities: 'id, name, status, *searchKeywords',
      tours: 'id, tourCode, startDate, endDate, companyRef.id, guideRef.id'
    });
  }
}

export const db = new TourManagerDB();
