import { useEffect, useMemo, useState, useRef } from 'react';
import Fuse from 'fuse.js';
import type { Tour } from '@/types/tour';
import type { Company, Guide, Nationality, TouristDestination, DetailedExpense, Shopping, Province } from '@/types/master';
import { store } from '@/lib/datastore';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { buildMatcher, AUTO_MATCH_PCT, type Matcher, type MatchCandidate } from '@/lib/import-match-utils';

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
  /** JSON nguồn trước khi map sang Tour (OCR: kết quả parser; JSON-paste: bản dán). */
  sourceJson?: unknown;
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
  const [destinations, setDestinations] = useState<TouristDestination[]>([]);
  const [expenses, setExpenses] = useState<DetailedExpense[]>([]);
  const [shoppings, setShoppings] = useState<Shopping[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [ctpAllowances, setCtpAllowances] = useState<DetailedExpense[]>([]);
  const [draft, setDraft] = useState<ReviewItem[]>(items);
  const [searchQuery, setSearchQuery] = useState('');

  const [openCompanyDialog, setOpenCompanyDialog] = useState(false);
  const [openNationalityDialog, setOpenNationalityDialog] = useState(false);
  const [openDestinationDialog, setOpenDestinationDialog] = useState(false);
  const [openExpenseDialog, setOpenExpenseDialog] = useState(false);
  const [openShoppingDialog, setOpenShoppingDialog] = useState(false);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const [initialEntityName, setInitialEntityName] = useState('');
  const [targetItemIndex, setTargetItemIndex] = useState<number | null>(null);

  const matcherRef = useRef<{
    destinations?: Matcher<TouristDestination>;
    expenses?: Matcher<DetailedExpense>;
    allowances?: Matcher<DetailedExpense>;
  }>({});

  useEffect(() => {
    const load = async () => {
      try {
        const [c, g, n, d, e, s, p] = await Promise.all([
          preloadedEntities?.companies ? Promise.resolve(preloadedEntities.companies) : store.listCompanies({}),
          preloadedEntities?.guides ? Promise.resolve(preloadedEntities.guides) : store.listGuideUsers({}),
          preloadedEntities?.nationalities ? Promise.resolve(preloadedEntities.nationalities) : store.listNationalities({}),
          store.listTouristDestinations({}),
          store.listDetailedExpenses({}),
          store.listShoppings({}),
          store.listProvinces({}),
        ]);
        const activeCompanies = c.filter(x => x.status === 'active');
        const activeGuides = g.filter(x => x.status === 'active');
        const activeNationalities = n.filter(x => x.status === 'active');
        const activeDestinations = d.filter(x => x.status === 'active');
        const activeExpenses = e.filter(x => x.status === 'active');
        const activeShoppings = s.filter(x => x.status === 'active');
        const activeProvinces = p.filter(x => x.status === 'active');

        setCompanies(activeCompanies); setGuides(activeGuides); setNationalities(activeNationalities);
        setDestinations(activeDestinations); setExpenses(activeExpenses); setShoppings(activeShoppings); setProvinces(activeProvinces);

        const ctp = activeExpenses.filter(exp => exp.categoryRef?.nameAtBooking === 'CTP');
        setCtpAllowances(ctp);

        matcherRef.current = {
          destinations: buildMatcher(activeDestinations, true),
          expenses: buildMatcher(activeExpenses),
          allowances: buildMatcher(ctp),
        };

        const cFuse = new Fuse(activeCompanies, { keys: ['name'], ...FUSE_OPTS });
        const gFuse = new Fuse(activeGuides, { keys: ['name'], ...FUSE_OPTS });
        const nFuse = new Fuse(activeNationalities, { keys: ['name', 'iso2'], ...FUSE_OPTS });

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

          // Only auto-apply a match when similarity clears AUTO_MATCH_PCT; weaker
          // candidates stay as suggestions for the user to pick in the review UI.
          const autoApply = <M extends { id: string; name: string; price?: number }>(
            matcher: Matcher<M> | undefined, name: string, fallbackPrice?: number,
          ) => {
            const top = matcher?.best(name);
            if (!top || top.percent < AUTO_MATCH_PCT) return null;
            const m = top.item;
            return { name: m.name, price: m.price ?? fallbackPrice, matchedId: m.id, matchedPrice: m.price };
          };

          if (tour.destinations?.length) {
            tour.destinations = tour.destinations.map(dest => {
              if (!dest.name) return dest;
              const m = autoApply(matcherRef.current.destinations, dest.name, dest.price);
              return m ? { ...dest, ...m } : dest;
            });
          }
          if (tour.expenses?.length) {
            tour.expenses = tour.expenses.map(exp => {
              if (!exp.name) return exp;
              const m = autoApply(matcherRef.current.expenses, exp.name, exp.price);
              return m ? { ...exp, ...m } : exp;
            });
          }
          if (tour.meals?.length) {
            tour.meals = tour.meals.map(meal => {
              if (!meal.name) return meal;
              const m = autoApply(matcherRef.current.expenses, meal.name, meal.price);
              return m ? { ...meal, ...m } : meal;
            });
          }
          if (tour.allowances?.length) {
            tour.allowances = tour.allowances.map(a => {
              if (!a.name) return a;
              const m = autoApply(matcherRef.current.allowances, a.name, a.price);
              return m ? { ...a, ...m } : a;
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

  // A row counts as "Matched" (green) only when a candidate clears AUTO_MATCH_PCT.
  const autoMatch = <M extends { name: string }>(matcher: Matcher<M> | undefined, name: string): M | null => {
    const top = matcher?.best(name);
    return top && top.percent >= AUTO_MATCH_PCT ? top.item : null;
  };
  const matchDestination = (name: string) => autoMatch(matcherRef.current.destinations, name);
  const matchExpense = (name: string) => autoMatch(matcherRef.current.expenses, name);
  const matchShopping = (name: string) => autoMatch(matcherRef.current.expenses, name);
  const matchAllowance = (name: string) => autoMatch(matcherRef.current.allowances, name);

  // Ranked suggestions (40–100%) for rows without an automatic match.
  const suggestDestination = (name: string): MatchCandidate<TouristDestination>[] =>
    matcherRef.current.destinations?.suggest(name) ?? [];
  const suggestExpense = (name: string): MatchCandidate<DetailedExpense>[] =>
    matcherRef.current.expenses?.suggest(name) ?? [];
  const suggestAllowance = (name: string): MatchCandidate<DetailedExpense>[] =>
    matcherRef.current.allowances?.suggest(name) ?? [];

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
    companies, guides, nationalities, destinations, expenses, shoppings, provinces, ctpAllowances,
    draft, searchQuery, setSearchQuery,
    validationWarnings, filteredTours, validateForImport,
    matchDestination, matchExpense, matchShopping, matchAllowance,
    suggestDestination, suggestExpense, suggestAllowance,
    updateDestination, updateExpense, updateMeal, updateAllowance,
    removeDestination, removeExpense, removeMeal, removeAllowance,
    updateTourField, updateEntityRef, removeTour,
    handleCreateCompany, handleCreateNationality,
    handleCreateDestination, handleCreateExpense, handleCreateShopping,
    openCompanyDialog, setOpenCompanyDialog,
    openNationalityDialog, setOpenNationalityDialog,
    openDestinationDialog, setOpenDestinationDialog,
    openExpenseDialog, setOpenExpenseDialog,
    openShoppingDialog, setOpenShoppingDialog,
    targetIndex, setTargetIndex,
    initialEntityName, setInitialEntityName,
    targetItemIndex, setTargetItemIndex,
  };
}
