import Fuse from 'fuse.js';
import type { Tour, EntityRef } from '@/types/tour';
import type { Company, Guide, Nationality } from '@/types/master';
import { store } from '@/lib/datastore';
import { toast } from 'sonner';

export type EntityLookups = {
  companiesByName: Map<string, Company>;
  guidesByName: Map<string, Guide>;
  nationalitiesByName: Map<string, Nationality>;
  nationalitiesByIso: Map<string, Nationality>;
};

export type EntityCaches = {
  companies: Company[];
  guides: Guide[];
  nationalities: Nationality[];
  lookups: EntityLookups;
};

export const normalizeEntityName = (value?: string | null): string => {
  if (!value) return '';
  const normalized = value.normalize('NFD').replace(/[̀-ͯ]/g, '');
  return normalized.trim().toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
};

export const buildEntityCaches = (companies: Company[], guides: Guide[], nationalities: Nationality[]): EntityCaches => {
  const companiesByName = new Map<string, Company>();
  companies.forEach(c => { const n = normalizeEntityName(c.name); if (n && !companiesByName.has(n)) companiesByName.set(n, c); });

  const guidesByName = new Map<string, Guide>();
  guides.forEach(g => { const n = normalizeEntityName(g.name); if (n && !guidesByName.has(n)) guidesByName.set(n, g); });

  const nationalitiesByName = new Map<string, Nationality>();
  const nationalitiesByIso = new Map<string, Nationality>();
  nationalities.forEach(nat => {
    const nn = normalizeEntityName(nat.name); if (nn && !nationalitiesByName.has(nn)) nationalitiesByName.set(nn, nat);
    const ni = normalizeEntityName(nat.iso2); if (ni && !nationalitiesByIso.has(ni)) nationalitiesByIso.set(ni, nat);
  });

  return { companies, guides, nationalities, lookups: { companiesByName, guidesByName, nationalitiesByName, nationalitiesByIso } };
};

export const loadEntityCachesFromStore = async (): Promise<EntityCaches> => {
  const [companies, guides, nationalities] = await Promise.all([
    store.listCompanies({}), store.listGuideUsers({}), store.listNationalities({}),
  ]);
  return buildEntityCaches(companies, guides, nationalities);
};

export const findEntityRef = (
  caches: EntityCaches,
  entityType: 'company' | 'guide' | 'nationality',
  name: string,
): EntityRef | null => {
  const normalized = normalizeEntityName(name);
  if (!normalized) return null;

  const { lookups } = caches;
  let match: Company | Guide | Nationality | undefined;
  if (entityType === 'company') match = lookups.companiesByName.get(normalized);
  else if (entityType === 'guide') match = lookups.guidesByName.get(normalized);
  else match = lookups.nationalitiesByName.get(normalized) || lookups.nationalitiesByIso.get(normalized);

  if (match) return { id: match.id, nameAtBooking: match.name };

  const entities: (Company | Guide | Nationality)[] = entityType === 'company' ? caches.companies : entityType === 'guide' ? caches.guides : caches.nationalities;
  const fuse = new Fuse(entities, { keys: entityType === 'nationality' ? ['name', 'iso2'] : ['name'], threshold: 0.3, ignoreLocation: true });
  const results = fuse.search(name);
  return results.length > 0 ? { id: results[0].item.id, nameAtBooking: results[0].item.name } : null;
};

export const transformImportedTour = (
  data: any,
  caches: EntityCaches,
): { tour: Partial<Tour>; raw: { company: string; guide: string; nationality: string } } => {
  const tourData = data.tour || data;
  const subcollections = data.subcollections || {};
  const companyName = tourData.company || 'Việt Á';
  const guideName = tourData.tourGuide || 'Cao Hữu Tu';
  const clientNameValue = tourData.clientName || 'Client Tú';
  const nationalityName = tourData.clientNationality?.trim() || 'Việt Nam';

  const tour: Partial<Tour> = {
    tourCode: tourData.tourCode || '',
    clientName: clientNameValue,
    adults: tourData.adults || 0,
    children: tourData.children || 0,
    totalGuests: tourData.totalGuests || 0,
    driverName: tourData.driverName || '',
    clientPhone: tourData.clientPhone || '',
    startDate: tourData.startDate || '',
    endDate: tourData.endDate || '',
    totalDays: tourData.totalDays || 0,
    companyRef: findEntityRef(caches, 'company', companyName) || { id: '', nameAtBooking: companyName },
    guideRef: findEntityRef(caches, 'guide', guideName) || { id: '', nameAtBooking: guideName },
    clientNationalityRef: findEntityRef(caches, 'nationality', nationalityName) || { id: '', nameAtBooking: nationalityName },
    destinations: subcollections.destinations || [],
    expenses: subcollections.expenses || [],
    meals: subcollections.meals || [],
    allowances: subcollections.allowances || [],
    summary: {
      totalTabs: subcollections.summary?.totalTabs || 0,
      advancePayment: subcollections.summary?.advancePayment || 0,
      totalAfterAdvance: subcollections.summary?.totalAfterAdvance || 0,
      companyTip: subcollections.summary?.companyTip || 0,
      totalAfterTip: subcollections.summary?.totalAfterTip || 0,
      collectionsForCompany: subcollections.summary?.collectionsForCompany || 0,
      totalAfterCollections: subcollections.summary?.totalAfterCollections || 0,
      finalTotal: subcollections.summary?.finalTotal || 0,
    },
  };

  return { tour, raw: { company: companyName, guide: guideName, nationality: nationalityName } };
};

export const validateTourData = (data: any): { valid: boolean; errors: string[] } => {
  const tours = Array.isArray(data) ? data : [data];
  const errors: string[] = [];
  tours.forEach((t, i) => {
    const td = t.tour || t;
    if (!td || typeof td !== 'object') errors.push(`Tour ${i + 1}: Invalid tour data structure`);
  });
  return { valid: errors.length === 0, errors };
};

const SAMPLE_JSON = [{
  tour: { tourCode: 'SAMPLE001', company: 'Việt Á', tourGuide: 'Cao Hữu Tu', clientName: 'Sample Client', clientNationality: 'Việt Nam', adults: 2, children: 1, totalGuests: 3, driverName: 'Sample Driver', clientPhone: '+84123456789', startDate: '2025-01-15', endDate: '2025-01-20', totalDays: 5 },
  subcollections: {
    destinations: [{ name: 'Hà Nội', price: 500000, province: 'Hà Nội', date: '2025-01-15', orderIndex: 0 }],
    expenses: [{ name: 'Hotel booking', price: 1000000, date: '2025-01-15', orderIndex: 0 }],
    meals: [{ name: 'Restaurant A - Lunch', price: 450000, date: '2025-01-15', orderIndex: 0 }],
    allowances: [{ province: 'Hà Nội', amount: 200000, date: '2025-01-15', orderIndex: 0 }],
    summary: { totalTabs: 0, advancePayment: 0, totalAfterAdvance: 0, companyTip: 0, totalAfterTip: 0, collectionsForCompany: 0, totalAfterCollections: 0, finalTotal: 0 },
  },
}];

export const downloadTourImportSample = () => {
  const blob = new Blob([JSON.stringify(SAMPLE_JSON, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'tour-import-sample.json';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success('Sample JSON file downloaded');
};
