import { useEffect, useMemo, useState } from 'react';
import Fuse from 'fuse.js';
import type { Tour, EntityRef } from '@/types/tour';
import type { Company, Guide, Nationality, TouristDestination, DetailedExpense, Shopping, Province } from '@/types/master';
import { store } from '@/lib/datastore';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ReviewItem {
  tour: Partial<Tour>;
  raw: { company: string; guide: string; nationality: string };
}

const fuseSearch = <T,>(data: T[], keys: string[], query: string, threshold = 0.4): T | null => {
  const fuse = new Fuse(data, { keys, threshold, includeScore: true, ignoreLocation: true });
  const results = fuse.search(query);
  return results.length > 0 && results[0].score! < threshold ? results[0].item : null;
};

export function useImportTourReview(
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
  const [draft, setDraft] = useState<ReviewItem[]>(items);

  const [openCompanyDialog, setOpenCompanyDialog] = useState(false);
  const [openNationalityDialog, setOpenNationalityDialog] = useState(false);
  const [openDestinationDialog, setOpenDestinationDialog] = useState(false);
  const [openExpenseDialog, setOpenExpenseDialog] = useState(false);
  const [openShoppingDialog, setOpenShoppingDialog] = useState(false);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const [targetItemIndex, setTargetItemIndex] = useState<number | null>(null);

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
        setCompanies(c); setGuides(g); setNationalities(n);
        setDestinations(d); setExpenses(e); setShoppings(s); setProvinces(p);

        setDraft(items.map(item => {
          const tour = { ...item.tour };

          if (item.raw.company && !tour.companyRef?.id) {
            const m = fuseSearch(c, ['name'], item.raw.company);
            if (m) tour.companyRef = { id: m.id, nameAtBooking: m.name };
          }
          if (item.raw.guide && !tour.guideRef?.id) {
            const m = fuseSearch(g, ['name'], item.raw.guide);
            if (m) tour.guideRef = { id: m.id, nameAtBooking: m.name };
          }
          if (item.raw.nationality && !tour.clientNationalityRef?.id) {
            const m = fuseSearch(n, ['name', 'iso2'], item.raw.nationality, 0.3);
            if (m) tour.clientNationalityRef = { id: m.id, nameAtBooking: m.name };
          }

          if (tour.destinations?.length) {
            tour.destinations = tour.destinations.map(dest => {
              if (!dest.name) return dest;
              const m = fuseSearch(d, ['name'], dest.name);
              return m ? { ...dest, matchedId: m.id, matchedPrice: m.price } : dest;
            });
          }
          if (tour.expenses?.length) {
            tour.expenses = tour.expenses.map(exp => {
              if (!exp.name) return exp;
              const m = fuseSearch(e, ['name'], exp.name);
              return m ? { ...exp, matchedId: m.id, matchedPrice: m.price } : exp;
            });
          }
          if (tour.meals?.length) {
            tour.meals = tour.meals.map(meal => {
              if (!meal.name) return meal;
              const m = fuseSearch(s, ['name'], meal.name);
              return m ? { ...meal, matchedId: m.id } : meal;
            });
          }
          if (tour.allowances?.length) {
            tour.allowances = tour.allowances.map(allow => {
              if (!allow.name) return allow;
              const m = fuseSearch(p, ['name'], allow.name);
              return m ? { ...allow, matchedProvinceId: m.id, province: m.name } : allow;
            });
          }

          return { ...item, tour };
        }));
      } catch {
        toast.error('Failed to load master data');
      }
    };
    load();
  }, [items, preloadedEntities]); // eslint-disable-line react-hooks/exhaustive-deps

  const allValid = useMemo(() =>
    draft.every(d => d.tour.companyRef?.id && d.tour.guideRef?.id && d.tour.clientNationalityRef?.id),
  [draft]);

  const setRef = (idx: number, key: 'companyRef' | 'guideRef' | 'clientNationalityRef', ref: EntityRef) =>
    setDraft(prev => prev.map((it, i) => i === idx ? { ...it, tour: { ...it.tour, [key]: ref } } : it));

  const openAddDialog = (type: 'company' | 'nationality', idx: number) => {
    setTargetIndex(idx);
    if (type === 'company') setOpenCompanyDialog(true);
    if (type === 'nationality') setOpenNationalityDialog(true);
  };

  const patchSubcollectionItem = (tourIdx: number, key: keyof Tour, itemIdx: number, patch: object) =>
    setDraft(prev => prev.map((it, i) => {
      if (i !== tourIdx) return it;
      const arr = [...((it.tour[key] as any[]) || [])];
      arr[itemIdx] = { ...arr[itemIdx], ...patch };
      return { ...it, tour: { ...it.tour, [key]: arr } };
    }));

  const updateDestinationMatch = (tourIdx: number, destIdx: number, selected: TouristDestination) =>
    patchSubcollectionItem(tourIdx, 'destinations', destIdx, { matchedId: selected.id, matchedPrice: selected.price });

  const updateExpenseMatch = (tourIdx: number, expIdx: number, selected: DetailedExpense) =>
    patchSubcollectionItem(tourIdx, 'expenses', expIdx, { matchedId: selected.id, matchedPrice: selected.price });

  const updateMealMatch = (tourIdx: number, mealIdx: number, selected: Shopping) =>
    patchSubcollectionItem(tourIdx, 'meals', mealIdx, { matchedId: selected.id });

  const updateAllowanceMatch = (tourIdx: number, allowIdx: number, selected: Province) =>
    patchSubcollectionItem(tourIdx, 'allowances', allowIdx, { matchedProvinceId: selected.id, province: selected.name });

  const handleCreateCompany = async (data: { name: string; contactName?: string; phone?: string; email?: string; note?: string }) => {
    try {
      const created = await store.createCompany({ name: data.name, contactName: data.contactName || '', phone: data.phone || '', email: data.email || '', note: data.note || '' });
      setCompanies(prev => [created, ...prev]);
      if (targetIndex !== null) setRef(targetIndex, 'companyRef', { id: created.id, nameAtBooking: created.name });
      toast.success('Company created');
    } catch { toast.error('Failed to create company'); throw new Error(); }
  };

  const handleCreateNationality = async (data: { name: string; iso2?: string; emoji?: string }) => {
    try {
      const created = await store.createNationality({ name: data.name, iso2: data.iso2 || '', emoji: data.emoji || '' });
      setNationalities(prev => [created, ...prev]);
      if (targetIndex !== null) setRef(targetIndex, 'clientNationalityRef', { id: created.id, nameAtBooking: created.name });
      toast.success('Nationality created');
    } catch { toast.error('Failed to create nationality'); throw new Error(); }
  };

  const handleCreateDestination = async (data: any) => {
    try {
      const created = await store.createTouristDestination(data);
      setDestinations(prev => [created, ...prev]);
      if (targetIndex !== null && targetItemIndex !== null) {
        updateDestinationMatch(targetIndex, targetItemIndex, created);
      }
      setOpenDestinationDialog(false);
      toast.success('Destination created');
    } catch { toast.error('Failed to create destination'); throw new Error(); }
  };

  const handleCreateExpense = async (data: any) => {
    try {
      const created = await store.createDetailedExpense({ ...data, guideId });
      setExpenses(prev => [created, ...prev]);
      if (targetIndex !== null && targetItemIndex !== null) {
        updateExpenseMatch(targetIndex, targetItemIndex, created);
      }
      setOpenExpenseDialog(false);
      toast.success('Expense created');
    } catch { toast.error('Failed to create expense'); throw new Error(); }
  };

  const handleCreateShopping = async (data: any) => {
    try {
      const created = await store.createShopping({ ...data, guideId });
      setShoppings(prev => [created, ...prev]);
      if (targetIndex !== null && targetItemIndex !== null) {
        updateMealMatch(targetIndex, targetItemIndex, created);
      }
      setOpenShoppingDialog(false);
      toast.success('Shopping item created');
    } catch { toast.error('Failed to create shopping item'); throw new Error(); }
  };

  return {
    companies, guides, nationalities, destinations, expenses, shoppings, provinces,
    draft, allValid,
    setRef, openAddDialog,
    updateDestinationMatch, updateExpenseMatch, updateMealMatch, updateAllowanceMatch,
    handleCreateCompany, handleCreateNationality,
    handleCreateDestination, handleCreateExpense, handleCreateShopping,
    openCompanyDialog, setOpenCompanyDialog,
    openNationalityDialog, setOpenNationalityDialog,
    openDestinationDialog, setOpenDestinationDialog,
    openExpenseDialog, setOpenExpenseDialog,
    openShoppingDialog, setOpenShoppingDialog,
    targetIndex, setTargetIndex,
    targetItemIndex, setTargetItemIndex,
  };
}
