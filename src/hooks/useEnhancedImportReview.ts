import { useEffect, useMemo, useState, useRef } from 'react';
import Fuse from 'fuse.js';
import type { Tour } from '@/types/tour';
import type { Company, Guide, Language, Nationality, TouristDestination, DetailedExpense, Shopping, Province } from '@/types/master';
import { store } from '@/lib/datastore';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ReviewItem {
  tour: Partial<Tour>;
  raw: {
    company: string;
    guide: string;
    nationality: string;
    destinations?: any[];
    expenses?: any[];
    meals?: any[];
    allowances?: any[];
    summary?: any;
  };
}

type EntityType = 'companyRef' | 'guideRef' | 'clientNationalityRef';

const FUSE_OPTS = { threshold: 0.5, includeScore: true, ignoreLocation: true } as const;

function fuseMatch<T>(fuse: Fuse<T> | undefined, name: string): T | null {
  if (!name?.trim() || !fuse) return null;
  const r = fuse.search(name);
  return r.length > 0 && r[0].score! < 0.5 ? r[0].item : null;
}

export function useEnhancedImportReview(
  items: ReviewItem[],
  preloadedEntities?: { companies: Company[]; guides: Guide[]; nationalities: Nationality[] },
) {
  const { isGuide, userProfile } = useAuth();
  const guideId = isGuide ? (userProfile?.id ?? undefined) : undefined;

  const [companies, setCompanies] = useState<Company[]>(preloadedEntities?.companies ?? []);
  const [guides, setGuides] = useState<Guide[]>(preloadedEntities?.guides ?? []);
  const [nationalities, setNationalities] = useState<Nationality[]>(preloadedEntities?.nationalities ?? []);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [destinations, setDestinations] = useState<TouristDestination[]>([]);
  const [expenses, setExpenses] = useState<DetailedExpense[]>([]);
  const [shoppings, setShoppings] = useState<Shopping[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [ctpAllowances, setCtpAllowances] = useState<DetailedExpense[]>([]);
  const [draft, setDraft] = useState<ReviewItem[]>(items);
  const [searchQuery, setSearchQuery] = useState('');

  const [openCompanyDialog, setOpenCompanyDialog] = useState(false);
  const [openGuideDialog, setOpenGuideDialog] = useState(false);
  const [openNationalityDialog, setOpenNationalityDialog] = useState(false);
  const [openDestinationDialog, setOpenDestinationDialog] = useState(false);
  const [openExpenseDialog, setOpenExpenseDialog] = useState(false);
  const [openShoppingDialog, setOpenShoppingDialog] = useState(false);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const [initialEntityName, setInitialEntityName] = useState('');
  const [targetItemIndex, setTargetItemIndex] = useState<number | null>(null);

  const fuseRef = useRef<{
    destinations?: Fuse<TouristDestination>;
    expenses?: Fuse<DetailedExpense>;
    allowances?: Fuse<DetailedExpense>;
  }>({});

  useEffect(() => {
    const load = async () => {
      try {
        const [c, g, n, l, d, e, s, p] = await Promise.all([
          preloadedEntities?.companies ? Promise.resolve(preloadedEntities.companies) : store.listCompanies({}),
          preloadedEntities?.guides ? Promise.resolve(preloadedEntities.guides) : store.listGuides({}),
          preloadedEntities?.nationalities ? Promise.resolve(preloadedEntities.nationalities) : store.listNationalities({}),
          store.listLanguages({ status: 'active' }),
          store.listTouristDestinations({}),
          store.listDetailedExpenses({}),
          store.listShoppings({}),
          store.listProvinces({}),
        ]);
        setCompanies(c); setGuides(g); setNationalities(n); setLanguages(l);
        setDestinations(d); setExpenses(e); setShoppings(s); setProvinces(p);

        const ctp = e.filter(exp => exp.categoryRef?.nameAtBooking === 'CTP');
        setCtpAllowances(ctp);

        fuseRef.current = {
          destinations: new Fuse(d, { keys: ['name'], ...FUSE_OPTS }),
          expenses: new Fuse(e, { keys: ['name'], ...FUSE_OPTS }),
          allowances: new Fuse(ctp, { keys: ['name'], ...FUSE_OPTS }),
        };

        const cFuse = new Fuse(c, { keys: ['name'], ...FUSE_OPTS });
        const gFuse = new Fuse(g, { keys: ['name'], ...FUSE_OPTS });
        const nFuse = new Fuse(n, { keys: ['name', 'iso2'], ...FUSE_OPTS });

        setDraft(items.map(item => {
          const tour = { ...item.tour };
          const raw = { ...item.raw };

          if (tour.destinations && !raw.destinations) raw.destinations = tour.destinations.map(x => ({ ...x }));
          if (tour.expenses && !raw.expenses) raw.expenses = tour.expenses.map(x => ({ ...x }));
          if (tour.meals && !raw.meals) raw.meals = tour.meals.map(x => ({ ...x }));
          if (tour.allowances && !raw.allowances) raw.allowances = tour.allowances.map(x => ({ ...x }));
          if (tour.summary && !raw.summary) raw.summary = { ...tour.summary };

          if (item.raw.company && !tour.companyRef?.id) {
            const m = fuseMatch(cFuse, item.raw.company);
            if (m) tour.companyRef = { id: m.id, nameAtBooking: m.name };
          }
          if (item.raw.guide && !tour.guideRef?.id) {
            const m = fuseMatch(gFuse, item.raw.guide);
            if (m) tour.guideRef = { id: m.id, nameAtBooking: m.name };
          }
          if (item.raw.nationality && !tour.clientNationalityRef?.id) {
            const seps = [',', '/', '-', '&', 'and'];
            let nat = item.raw.nationality;
            for (const sep of seps) { if (nat.includes(sep)) { nat = nat.split(sep)[0].trim(); break; } }
            const m = fuseMatch(nFuse, nat);
            if (m) tour.clientNationalityRef = { id: m.id, nameAtBooking: m.name };
          }

          if (tour.destinations?.length) {
            tour.destinations = tour.destinations.map(dest => {
              if (!dest.name) return dest;
              const m = fuseMatch(fuseRef.current.destinations, dest.name);
              return m ? { ...dest, name: m.name, price: m.price || dest.price, matchedId: m.id, matchedPrice: m.price } : dest;
            });
          }
          if (tour.expenses?.length) {
            tour.expenses = tour.expenses.map(exp => {
              if (!exp.name) return exp;
              const m = fuseMatch(fuseRef.current.expenses, exp.name);
              return m ? { ...exp, name: m.name, price: m.price, matchedId: m.id, matchedPrice: m.price } : exp;
            });
          }
          if (tour.meals?.length) {
            tour.meals = tour.meals.map(meal => {
              if (!meal.name) return meal;
              const m = fuseMatch(fuseRef.current.expenses, meal.name);
              return m ? { ...meal, name: m.name, price: m.price, matchedId: m.id, matchedPrice: m.price } : meal;
            });
          }
          if (tour.allowances?.length) {
            tour.allowances = tour.allowances.map(a => {
              if (!a.name) return a;
              const m = fuseMatch(fuseRef.current.allowances, a.name);
              return m ? { ...a, name: m.name, price: m.price, matchedId: m.id, matchedPrice: m.price } : a;
            });
          }

          return { ...item, tour, raw };
        }));
      } catch {
        toast.error('Failed to load master data');
      }
    };
    load();
  }, [items, preloadedEntities]); // eslint-disable-line react-hooks/exhaustive-deps

  const validationWarnings = useMemo(() => {
    const w: { [k: number]: string[] } = {};
    draft.forEach((item, i) => {
      const warnings: string[] = [];
      const { tour, raw } = item;
      if (!tour.tourCode) warnings.push('Tour code is missing');
      if (!tour.clientName) warnings.push('Client name is missing');
      if (!tour.startDate) warnings.push('Start date is missing');
      if (!tour.endDate) warnings.push('End date is missing');
      if (!tour.companyRef?.id) warnings.push(`Company not selected (raw: "${raw.company}")`);
      if (!tour.guideRef?.id) warnings.push(`Guide not selected (raw: "${raw.guide}")`);
      if (!tour.clientNationalityRef?.id) warnings.push(`Nationality not selected (raw: "${raw.nationality}")`);
      if (warnings.length) w[i] = warnings;
    });
    return w;
  }, [draft]);

  const filteredTours = useMemo(() => {
    let tours = draft;
    if (searchQuery.trim()) {
      const fuse = new Fuse(draft, {
        keys: ['tour.tourCode', 'tour.clientName', 'tour.companyRef.nameAtBooking', 'tour.guideRef.nameAtBooking', 'raw.company', 'raw.guide'],
        threshold: 0.5, includeScore: true,
      });
      tours = fuse.search(searchQuery).map(r => r.item);
    }
    return tours.sort((a, b) => {
      const ai = draft.findIndex(d => d === a), bi = draft.findIndex(d => d === b);
      const aw = (validationWarnings[ai]?.length ?? 0) > 0;
      const bw = (validationWarnings[bi]?.length ?? 0) > 0;
      if (aw && !bw) return -1;
      if (!aw && bw) return 1;
      return ai - bi;
    });
  }, [draft, searchQuery, validationWarnings]);

  const validateForImport = () => {
    const errors: string[] = [];
    draft.forEach((item, i) => {
      const name = item.tour.tourCode || `Tour ${i + 1}`;
      if (!item.tour.tourCode) errors.push(`${name}: Tour code is required`);
      if (!item.tour.clientName) errors.push(`${name}: Client name is required`);
      if (!item.tour.startDate) errors.push(`${name}: Start date is required`);
      if (!item.tour.endDate) errors.push(`${name}: End date is required`);
      if (!item.tour.companyRef?.id) errors.push(`${name}: Company is required`);
      if (!item.tour.guideRef?.id) errors.push(`${name}: Guide is required`);
      if (!item.tour.clientNationalityRef?.id) errors.push(`${name}: Nationality is required`);
    });
    return { valid: errors.length === 0, errors };
  };

  const matchDestination = (name: string) => fuseMatch(fuseRef.current.destinations, name);
  const matchExpense = (name: string) => fuseMatch(fuseRef.current.expenses, name);
  const matchShopping = (name: string) => fuseMatch(fuseRef.current.expenses, name);
  const matchAllowance = (name: string) => fuseMatch(fuseRef.current.allowances, name);

  const updateSubcollection = (tourIndex: number, key: keyof Tour, itemIndex: number, field: string, value: any) =>
    setDraft(prev => prev.map((item, i) => {
      if (i !== tourIndex) return item;
      const arr = [...((item.tour[key] as any[]) || [])];
      arr[itemIndex] = { ...arr[itemIndex], [field]: value };
      return { ...item, tour: { ...item.tour, [key]: arr } };
    }));

  const removeFromSubcollection = (tourIndex: number, key: keyof Tour, itemIndex: number) =>
    setDraft(prev => prev.map((item, i) => {
      if (i !== tourIndex) return item;
      const arr = [...((item.tour[key] as any[]) || [])];
      arr.splice(itemIndex, 1);
      return { ...item, tour: { ...item.tour, [key]: arr } };
    }));

  const updateDestination = (ti: number, di: number, f: string, v: any) => updateSubcollection(ti, 'destinations', di, f, v);
  const updateExpense = (ti: number, ei: number, f: string, v: any) => updateSubcollection(ti, 'expenses', ei, f, v);
  const updateMeal = (ti: number, mi: number, f: string, v: any) => updateSubcollection(ti, 'meals', mi, f, v);
  const updateAllowance = (ti: number, ai: number, f: string, v: any) => updateSubcollection(ti, 'allowances', ai, f, v);
  const removeDestination = (ti: number, di: number) => removeFromSubcollection(ti, 'destinations', di);
  const removeExpense = (ti: number, ei: number) => removeFromSubcollection(ti, 'expenses', ei);
  const removeMeal = (ti: number, mi: number) => removeFromSubcollection(ti, 'meals', mi);
  const removeAllowance = (ti: number, ai: number) => removeFromSubcollection(ti, 'allowances', ai);

  const updateTourField = (index: number, field: string, value: any) =>
    setDraft(prev => prev.map((item, i) => i === index ? { ...item, tour: { ...item.tour, [field]: value } } : item));

  const updateEntityRef = (index: number, entityType: EntityType, entity: { id: string; name: string }) =>
    setDraft(prev => prev.map((item, i) =>
      i === index ? { ...item, tour: { ...item.tour, [entityType]: { id: entity.id, nameAtBooking: entity.name } } } : item,
    ));

  const removeTour = (index: number) => setDraft(prev => prev.filter((_, i) => i !== index));

  const handleCreateCompany = async (data: any) => {
    try {
      const c = await store.createCompany(data);
      setCompanies(prev => [...prev, c]);
      toast.success('Company created successfully');
      setOpenCompanyDialog(false);
    } catch { toast.error('Failed to create company'); }
  };

  const handleCreateGuide = async (data: any) => {
    try {
      const g = await store.createGuide(data);
      setGuides(prev => [...prev, g]);
      toast.success('Guide created successfully');
      setOpenGuideDialog(false);
    } catch { toast.error('Failed to create guide'); }
  };

  const handleCreateNationality = async (data: any) => {
    try {
      const n = await store.createNationality(data);
      setNationalities(prev => [...prev, n]);
      toast.success('Nationality created successfully');
      setOpenNationalityDialog(false);
    } catch { toast.error('Failed to create nationality'); }
  };

  const handleCreateDestination = async (data: any) => {
    try {
      const d = await store.createTouristDestination(data);
      setDestinations(prev => [...prev, d]);
      toast.success('Destination created successfully');
      setOpenDestinationDialog(false);
    } catch { toast.error('Failed to create destination'); }
  };

  const handleCreateExpense = async (data: any) => {
    try {
      const exp = await store.createDetailedExpense({ ...data, guideId });
      setExpenses(prev => [...prev, exp]);
      toast.success('Expense created successfully');
      setOpenExpenseDialog(false);
    } catch { toast.error('Failed to create expense'); }
  };

  const handleCreateShopping = async (data: any) => {
    try {
      const s = await store.createShopping({ ...data, guideId });
      setShoppings(prev => [...prev, s]);
      toast.success('Shopping created successfully');
      setOpenShoppingDialog(false);
    } catch { toast.error('Failed to create shopping'); }
  };

  return {
    companies, guides, nationalities, languages, destinations, expenses, shoppings, provinces, ctpAllowances,
    draft, searchQuery, setSearchQuery,
    validationWarnings, filteredTours, validateForImport,
    matchDestination, matchExpense, matchShopping, matchAllowance,
    updateDestination, updateExpense, updateMeal, updateAllowance,
    removeDestination, removeExpense, removeMeal, removeAllowance,
    updateTourField, updateEntityRef, removeTour,
    handleCreateCompany, handleCreateGuide, handleCreateNationality,
    handleCreateDestination, handleCreateExpense, handleCreateShopping,
    openCompanyDialog, setOpenCompanyDialog,
    openGuideDialog, setOpenGuideDialog,
    openNationalityDialog, setOpenNationalityDialog,
    openDestinationDialog, setOpenDestinationDialog,
    openExpenseDialog, setOpenExpenseDialog,
    openShoppingDialog, setOpenShoppingDialog,
    targetIndex, setTargetIndex,
    initialEntityName, setInitialEntityName,
    targetItemIndex, setTargetItemIndex,
  };
}
