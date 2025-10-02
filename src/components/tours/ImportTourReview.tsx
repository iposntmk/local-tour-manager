import { useEffect, useMemo, useState } from 'react';
import Fuse from 'fuse.js';
import type { Tour, EntityRef } from '@/types/tour';
import type { Company, Guide, Nationality, TouristDestination, DetailedExpense, Shopping, Province } from '@/types/master';
import { store } from '@/lib/datastore';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDate } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CompanyDialog } from '@/components/companies/CompanyDialog';
import { GuideDialog } from '@/components/guides/GuideDialog';
import { NationalityDialog } from '@/components/nationalities/NationalityDialog';
import { DestinationDialog } from '@/components/destinations/DestinationDialog';
import { DetailedExpenseDialog } from '@/components/detailed-expenses/DetailedExpenseDialog';
import { ShoppingDialog } from '@/components/shopping/ShoppingDialog';

export interface ReviewItem {
  tour: Partial<Tour>;
  raw: { company: string; guide: string; nationality: string };
}

interface ImportTourReviewProps {
  items: ReviewItem[];
  onCancel: () => void;
  onConfirm: (tours: Partial<Tour>[]) => void;
  preloadedEntities?: {
    companies: Company[];
    guides: Guide[];
    nationalities: Nationality[];
  };
}

export function ImportTourReview({ items, onCancel, onConfirm, preloadedEntities }: ImportTourReviewProps) {
  const [companies, setCompanies] = useState<Company[]>(preloadedEntities?.companies ?? []);
  const [guides, setGuides] = useState<Guide[]>(preloadedEntities?.guides ?? []);
  const [nationalities, setNationalities] = useState<Nationality[]>(preloadedEntities?.nationalities ?? []);
  const [destinations, setDestinations] = useState<TouristDestination[]>([]);
  const [expenses, setExpenses] = useState<DetailedExpense[]>([]);
  const [shoppings, setShoppings] = useState<Shopping[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [draft, setDraft] = useState<ReviewItem[]>(items);

  const [openCompanyDialog, setOpenCompanyDialog] = useState(false);
  const [openGuideDialog, setOpenGuideDialog] = useState(false);
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
          preloadedEntities?.guides ? Promise.resolve(preloadedEntities.guides) : store.listGuides({}),
          preloadedEntities?.nationalities ? Promise.resolve(preloadedEntities.nationalities) : store.listNationalities({}),
          store.listTouristDestinations({}),
          store.listDetailedExpenses({}),
          store.listShoppings({}),
          store.listProvinces({}),
        ]);
        setCompanies(c);
        setGuides(g);
        setNationalities(n);
        setDestinations(d);
        setExpenses(e);
        setShoppings(s);
        setProvinces(p);

        // Auto-match using fuzzy search with higher threshold for better accuracy
        const updatedDraft = items.map(item => {
          const tour = { ...item.tour };
          
          // Fuzzy match company
          if (item.raw.company && !tour.companyRef?.id) {
            const companyFuse = new Fuse(c, { 
              keys: ['name'], 
              threshold: 0.4,
              includeScore: true,
              ignoreLocation: true,
            });
            const companyMatch = companyFuse.search(item.raw.company);
            if (companyMatch.length > 0 && companyMatch[0].score && companyMatch[0].score < 0.4) {
              const matched = companyMatch[0].item;
              tour.companyRef = { id: matched.id, nameAtBooking: matched.name };
            }
          }

          // Fuzzy match guide
          if (item.raw.guide && !tour.guideRef?.id) {
            const guideFuse = new Fuse(g, { 
              keys: ['name'], 
              threshold: 0.4,
              includeScore: true,
              ignoreLocation: true,
            });
            const guideMatch = guideFuse.search(item.raw.guide);
            if (guideMatch.length > 0 && guideMatch[0].score && guideMatch[0].score < 0.4) {
              const matched = guideMatch[0].item;
              tour.guideRef = { id: matched.id, nameAtBooking: matched.name };
            }
          }

          // Fuzzy match nationality
          if (item.raw.nationality && !tour.clientNationalityRef?.id) {
            const nationalityFuse = new Fuse(n, { 
              keys: ['name', 'iso2'], 
              threshold: 0.3,
              includeScore: true,
              ignoreLocation: true,
            });
            const nationalityMatch = nationalityFuse.search(item.raw.nationality);
            if (nationalityMatch.length > 0 && nationalityMatch[0].score && nationalityMatch[0].score < 0.3) {
              const matched = nationalityMatch[0].item;
              tour.clientNationalityRef = { id: matched.id, nameAtBooking: matched.name };
            }
          }

          // Fuzzy match destinations
          if (tour.destinations && tour.destinations.length > 0) {
            tour.destinations = tour.destinations.map(dest => {
              if (!dest.name) return dest;
              const destFuse = new Fuse(d, {
                keys: ['name'],
                threshold: 0.4,
                includeScore: true,
                ignoreLocation: true,
              });
              const destMatch = destFuse.search(dest.name);
              if (destMatch.length > 0 && destMatch[0].score && destMatch[0].score < 0.4) {
                const matched = destMatch[0].item;
                return { ...dest, matchedId: matched.id, matchedPrice: matched.price };
              }
              return dest;
            });
          }

          // Fuzzy match expenses
          if (tour.expenses && tour.expenses.length > 0) {
            tour.expenses = tour.expenses.map(exp => {
              if (!exp.name) return exp;
              const expFuse = new Fuse(e, {
                keys: ['name'],
                threshold: 0.4,
                includeScore: true,
                ignoreLocation: true,
              });
              const expMatch = expFuse.search(exp.name);
              if (expMatch.length > 0 && expMatch[0].score && expMatch[0].score < 0.4) {
                const matched = expMatch[0].item;
                return { ...exp, matchedId: matched.id, matchedPrice: matched.price };
              }
              return exp;
            });
          }

          // Fuzzy match meals (shopping)
          if (tour.meals && tour.meals.length > 0) {
            tour.meals = tour.meals.map(meal => {
              if (!meal.name) return meal;
              const mealFuse = new Fuse(s, {
                keys: ['name'],
                threshold: 0.4,
                includeScore: true,
                ignoreLocation: true,
              });
              const mealMatch = mealFuse.search(meal.name);
              if (mealMatch.length > 0 && mealMatch[0].score && mealMatch[0].score < 0.4) {
                const matched = mealMatch[0].item;
                return { ...meal, matchedId: matched.id };
              }
              return meal;
            });
          }

          // Fuzzy match allowances (provinces)
          if (tour.allowances && tour.allowances.length > 0) {
            tour.allowances = tour.allowances.map(allow => {
              if (!allow.province) return allow;
              const provFuse = new Fuse(p, {
                keys: ['name'],
                threshold: 0.4,
                includeScore: true,
                ignoreLocation: true,
              });
              const provMatch = provFuse.search(allow.province);
              if (provMatch.length > 0 && provMatch[0].score && provMatch[0].score < 0.4) {
                const matched = provMatch[0].item;
                return { ...allow, matchedProvinceId: matched.id, province: matched.name };
              }
              return allow;
            });
          }

          return { ...item, tour };
        });
        setDraft(updatedDraft);
      } catch (e) {
        toast.error('Failed to load master data');
      }
    };
    load();
  }, [items, preloadedEntities]);

  const allValid = useMemo(() =>
    draft.every(d => d.tour.companyRef?.id && d.tour.guideRef?.id && d.tour.clientNationalityRef?.id),
  [draft]);

  const setRef = (idx: number, key: 'companyRef' | 'guideRef' | 'clientNationalityRef', ref: EntityRef) => {
    setDraft(prev => prev.map((it, i) => i === idx ? { ...it, tour: { ...it.tour, [key]: ref } } : it));
  };

  const openAddDialog = (type: 'company' | 'guide' | 'nationality', idx: number) => {
    setTargetIndex(idx);
    if (type === 'company') setOpenCompanyDialog(true);
    if (type === 'guide') setOpenGuideDialog(true);
    if (type === 'nationality') setOpenNationalityDialog(true);
  };

  const handleCreateCompany = async (data: { name: string; contactName?: string; phone?: string; email?: string; note?: string }) => {
    try {
      const created = await store.createCompany({
        name: data.name,
        contactName: data.contactName || '',
        phone: data.phone || '',
        email: data.email || '',
        note: data.note || '',
      });
      setCompanies(prev => [created, ...prev]);
      if (targetIndex !== null) {
        setRef(targetIndex, 'companyRef', { id: created.id, nameAtBooking: created.name });
      }
      toast.success('Company created');
    } catch (e) {
      toast.error('Failed to create company');
      throw e;
    }
  };

  const handleCreateGuide = async (data: { name: string; phone?: string; note?: string }) => {
    try {
      const created = await store.createGuide({
        name: data.name,
        phone: data.phone || '',
        note: data.note || '',
      });
      setGuides(prev => [created, ...prev]);
      if (targetIndex !== null) {
        setRef(targetIndex, 'guideRef', { id: created.id, nameAtBooking: created.name });
      }
      toast.success('Guide created');
    } catch (e) {
      toast.error('Failed to create guide');
      throw e;
    }
  };

  const handleCreateNationality = async (data: { name: string; iso2?: string; emoji?: string }) => {
    try {
      const created = await store.createNationality({
        name: data.name,
        iso2: data.iso2 || '',
        emoji: data.emoji || '',
      });
      setNationalities(prev => [created, ...prev]);
      if (targetIndex !== null) {
        setRef(targetIndex, 'clientNationalityRef', { id: created.id, nameAtBooking: created.name });
      }
      toast.success('Nationality created');
    } catch (e) {
      toast.error('Failed to create nationality');
      throw e;
    }
  };

  const handleCreateDestination = async (data: { name: string; price: number; provinceRef: { id: string; nameAtBooking: string } }) => {
    try {
      const created = await store.createTouristDestination(data);
      setDestinations(prev => [created, ...prev]);
      if (targetIndex !== null && targetItemIndex !== null) {
        const tour = draft[targetIndex].tour;
        if (tour.destinations) {
          const updatedDest = { ...tour.destinations[targetItemIndex], matchedId: created.id, matchedPrice: created.price };
          const updatedDestinations = [...tour.destinations];
          updatedDestinations[targetItemIndex] = updatedDest;
          setDraft(prev => prev.map((it, i) => 
            i === targetIndex ? { ...it, tour: { ...it.tour, destinations: updatedDestinations } } : it
          ));
        }
      }
      setOpenDestinationDialog(false);
      toast.success('Destination created');
    } catch (e) {
      toast.error('Failed to create destination');
      throw e;
    }
  };

  const handleCreateExpense = async (data: { name: string; price: number; categoryRef: { id: string; nameAtBooking: string } }) => {
    try {
      const created = await store.createDetailedExpense(data);
      setExpenses(prev => [created, ...prev]);
      if (targetIndex !== null && targetItemIndex !== null) {
        const tour = draft[targetIndex].tour;
        if (tour.expenses) {
          const updatedExp = { ...tour.expenses[targetItemIndex], matchedId: created.id, matchedPrice: created.price };
          const updatedExpenses = [...tour.expenses];
          updatedExpenses[targetItemIndex] = updatedExp;
          setDraft(prev => prev.map((it, i) => 
            i === targetIndex ? { ...it, tour: { ...it.tour, expenses: updatedExpenses } } : it
          ));
        }
      }
      setOpenExpenseDialog(false);
      toast.success('Expense created');
    } catch (e) {
      toast.error('Failed to create expense');
      throw e;
    }
  };

  const handleCreateShopping = async (data: { name: string }) => {
    try {
      const created = await store.createShopping(data);
      setShoppings(prev => [created, ...prev]);
      if (targetIndex !== null && targetItemIndex !== null) {
        const tour = draft[targetIndex].tour;
        if (tour.meals) {
          const updatedMeal = { ...tour.meals[targetItemIndex], matchedId: created.id };
          const updatedMeals = [...tour.meals];
          updatedMeals[targetItemIndex] = updatedMeal;
          setDraft(prev => prev.map((it, i) => 
            i === targetIndex ? { ...it, tour: { ...it.tour, meals: updatedMeals } } : it
          ));
        }
      }
      setOpenShoppingDialog(false);
      toast.success('Shopping item created');
    } catch (e) {
      toast.error('Failed to create shopping item');
      throw e;
    }
  };

  return (
    <div className="space-y-4">

      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
        {draft.map((item, idx) => (
          <Card key={idx} className="p-4">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-base font-medium">{item.tour.tourCode}</div>
                <div className="text-xs text-muted-foreground">{item.tour.startDate} → {item.tour.endDate}</div>
              </div>
              <Separator />

              <Tabs defaultValue="info" className="w-full">
                <TabsList className="grid w-full grid-cols-5 h-auto gap-1 bg-muted/50 rounded-md p-1">
                  <TabsTrigger value="info" className="text-xs sm:text-sm whitespace-nowrap px-1 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">Info</TabsTrigger>
                  <TabsTrigger value="destinations" className="text-xs sm:text-sm flex flex-col items-center gap-0.5 px-1 py-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <span className="leading-none">Dest.</span>
                    <Badge variant="secondary" className="text-[10px] h-4 min-w-[16px] px-1 leading-none flex items-center justify-center">{item.tour.destinations?.length || 0}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="expenses" className="text-xs sm:text-sm flex flex-col items-center gap-0.5 px-1 py-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <span className="leading-none">Exp.</span>
                    <Badge variant="secondary" className="text-[10px] h-4 min-w-[16px] px-1 leading-none flex items-center justify-center">{item.tour.expenses?.length || 0}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="meals" className="text-xs sm:text-sm flex flex-col items-center gap-0.5 px-1 py-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <span className="leading-none">Meals</span>
                    <Badge variant="secondary" className="text-[10px] h-4 min-w-[16px] px-1 leading-none flex items-center justify-center">{item.tour.meals?.length || 0}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="allowances" className="text-xs sm:text-sm flex flex-col items-center gap-0.5 px-1 py-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <span className="leading-none">Allow.</span>
                    <Badge variant="secondary" className="text-[10px] h-4 min-w-[16px] px-1 leading-none flex items-center justify-center">{item.tour.allowances?.length || 0}</Badge>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label>Company</Label>
                      <div className="flex gap-2">
                        <Select
                          value={item.tour.companyRef?.id || ''}
                          onValueChange={(val) => {
                            const selected = companies.find(c => c.id === val);
                            if (selected) setRef(idx, 'companyRef', { id: selected.id, nameAtBooking: selected.name });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={item.raw.company ? `Find: ${item.raw.company}` : 'Select company'} />
                          </SelectTrigger>
                          <SelectContent className="z-50 bg-popover">
                            {companies.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button variant="outline" onClick={() => openAddDialog('company', idx)}>Add</Button>
                      </div>
                      {!item.tour.companyRef?.id && <p className="text-xs text-destructive">Required</p>}
                    </div>

                    <div className="space-y-1">
                      <Label>Guide</Label>
                      <div className="flex gap-2">
                        <Select
                          value={item.tour.guideRef?.id || ''}
                          onValueChange={(val) => {
                            const selected = guides.find(g => g.id === val);
                            if (selected) setRef(idx, 'guideRef', { id: selected.id, nameAtBooking: selected.name });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={item.raw.guide ? `Find: ${item.raw.guide}` : 'Select guide'} />
                          </SelectTrigger>
                          <SelectContent className="z-50 bg-popover">
                            {guides.map(g => (
                              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button variant="outline" onClick={() => openAddDialog('guide', idx)}>Add</Button>
                      </div>
                      {!item.tour.guideRef?.id && <p className="text-xs text-destructive">Required</p>}
                    </div>

                    <div className="space-y-1">
                      <Label>Client Nationality</Label>
                      <div className="flex gap-2">
                        <Select
                          value={item.tour.clientNationalityRef?.id || ''}
                          onValueChange={(val) => {
                            const selected = nationalities.find(n => n.id === val);
                            if (selected) setRef(idx, 'clientNationalityRef', { id: selected.id, nameAtBooking: selected.name });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={item.raw.nationality ? `Find: ${item.raw.nationality}` : 'Select nationality'} />
                          </SelectTrigger>
                          <SelectContent className="z-50 bg-popover">
                            {nationalities.map(n => (
                              <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button variant="outline" onClick={() => openAddDialog('nationality', idx)}>Add</Button>
                      </div>
                      {!item.tour.clientNationalityRef?.id && <p className="text-xs text-destructive">Required</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-muted-foreground pt-2">
                    <div>Guests: {item.tour.totalGuests}</div>
                    <div>Client: {item.tour.clientName || '-'}</div>
                    <div>Driver: {item.tour.driverName || '-'}</div>
                    <div>Days: {item.tour.totalDays || 0}</div>
                  </div>
                </TabsContent>

                <TabsContent value="destinations" className="mt-4">
                  {item.tour.destinations && item.tour.destinations.length > 0 ? (
                    <div className="rounded-lg border divide-y">
                      {item.tour.destinations.map((dest, destIdx) => (
                        <div key={destIdx} className="p-3 space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1">
                              <div className="font-medium text-sm">{dest.name}</div>
                              <div className="text-xs text-muted-foreground">{dest.date} • {dest.price.toLocaleString()} ₫</div>
                            </div>
                            {(dest as any).matchedId && (
                              <Badge variant="secondary" className="text-xs">Matched</Badge>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Select
                              value={(dest as any).matchedId || ''}
                              onValueChange={(val) => {
                                const selected = destinations.find(d => d.id === val);
                                if (selected) {
                                  const updatedDest = { ...dest, matchedId: selected.id, matchedPrice: selected.price };
                                  const updatedDestinations = [...(item.tour.destinations || [])];
                                  updatedDestinations[destIdx] = updatedDest;
                                  setDraft(prev => prev.map((it, i) => 
                                    i === idx ? { ...it, tour: { ...it.tour, destinations: updatedDestinations } } : it
                                  ));
                                }
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Match to master destination" />
                              </SelectTrigger>
                              <SelectContent className="z-50 bg-popover">
                                {destinations.map(d => (
                                  <SelectItem key={d.id} value={d.id} className="text-xs">
                                    {d.name} - {d.price.toLocaleString()} ₫
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 text-xs whitespace-nowrap"
                              onClick={() => {
                                setTargetIndex(idx);
                                setTargetItemIndex(destIdx);
                                setOpenDestinationDialog(true);
                              }}
                            >
                              Add New
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">No destinations</div>
                  )}
                </TabsContent>

                <TabsContent value="expenses" className="mt-4">
                  {item.tour.expenses && item.tour.expenses.length > 0 ? (
                    <div className="rounded-lg border divide-y">
                      {item.tour.expenses.map((exp, expIdx) => (
                        <div key={expIdx} className="p-3 space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1">
                              <div className="font-medium text-sm">{exp.name}</div>
                              <div className="text-xs text-muted-foreground">{exp.date} • {exp.price.toLocaleString()} ₫</div>
                            </div>
                            {(exp as any).matchedId && (
                              <Badge variant="secondary" className="text-xs">Matched</Badge>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Select
                              value={(exp as any).matchedId || ''}
                              onValueChange={(val) => {
                                const selected = expenses.find(e => e.id === val);
                                if (selected) {
                                  const updatedExp = { ...exp, matchedId: selected.id, matchedPrice: selected.price };
                                  const updatedExpenses = [...(item.tour.expenses || [])];
                                  updatedExpenses[expIdx] = updatedExp;
                                  setDraft(prev => prev.map((it, i) => 
                                    i === idx ? { ...it, tour: { ...it.tour, expenses: updatedExpenses } } : it
                                  ));
                                }
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Match to master expense" />
                              </SelectTrigger>
                              <SelectContent className="z-50 bg-popover">
                                {expenses.map(e => (
                                  <SelectItem key={e.id} value={e.id} className="text-xs">
                                    {e.name} - {e.price.toLocaleString()} ₫
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 text-xs whitespace-nowrap"
                              onClick={() => {
                                setTargetIndex(idx);
                                setTargetItemIndex(expIdx);
                                setOpenExpenseDialog(true);
                              }}
                            >
                              Add New
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">No expenses</div>
                  )}
                </TabsContent>

                <TabsContent value="meals" className="mt-4">
                  {item.tour.meals && item.tour.meals.length > 0 ? (
                    <div className="rounded-lg border divide-y">
                      {item.tour.meals.map((meal, mealIdx) => (
                        <div key={mealIdx} className="p-3 space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1">
                              <div className="font-medium text-sm">{meal.name}</div>
                              <div className="text-xs text-muted-foreground">{meal.date} • {meal.price.toLocaleString()} ₫</div>
                            </div>
                            {(meal as any).matchedId && (
                              <Badge variant="secondary" className="text-xs">Matched</Badge>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Select
                              value={(meal as any).matchedId || ''}
                              onValueChange={(val) => {
                                const selected = shoppings.find(s => s.id === val);
                                if (selected) {
                                  const updatedMeal = { ...meal, matchedId: selected.id };
                                  const updatedMeals = [...(item.tour.meals || [])];
                                  updatedMeals[mealIdx] = updatedMeal;
                                  setDraft(prev => prev.map((it, i) => 
                                    i === idx ? { ...it, tour: { ...it.tour, meals: updatedMeals } } : it
                                  ));
                                }
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Match to shopping item" />
                              </SelectTrigger>
                              <SelectContent className="z-50 bg-popover">
                                {shoppings.map(s => (
                                  <SelectItem key={s.id} value={s.id} className="text-xs">
                                    {s.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 text-xs whitespace-nowrap"
                              onClick={() => {
                                setTargetIndex(idx);
                                setTargetItemIndex(mealIdx);
                                setOpenShoppingDialog(true);
                              }}
                            >
                              Add New
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">No meals</div>
                  )}
                </TabsContent>

                <TabsContent value="allowances" className="mt-4">
                  {item.tour.allowances && item.tour.allowances.length > 0 ? (
                    <div className="rounded-lg border divide-y">
                      {item.tour.allowances.map((allow, allowIdx) => (
                        <div key={allowIdx} className="p-3 space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1">
                              <div className="font-medium text-sm">{allow.province}</div>
                              <div className="text-xs text-muted-foreground">{allow.date} • {allow.amount.toLocaleString()} ₫</div>
                            </div>
                            {(allow as any).matchedProvinceId && (
                              <Badge variant="secondary" className="text-xs">Matched</Badge>
                            )}
                          </div>
                          <Select
                            value={(allow as any).matchedProvinceId || ''}
                            onValueChange={(val) => {
                              const selected = provinces.find(p => p.id === val);
                              if (selected) {
                                const updatedAllow = { ...allow, matchedProvinceId: selected.id, province: selected.name };
                                const updatedAllowances = [...(item.tour.allowances || [])];
                                updatedAllowances[allowIdx] = updatedAllow;
                                setDraft(prev => prev.map((it, i) => 
                                  i === idx ? { ...it, tour: { ...it.tour, allowances: updatedAllowances } } : it
                                ));
                              }
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Match to province" />
                            </SelectTrigger>
                            <SelectContent className="z-50 bg-popover">
                              {provinces.map(p => (
                                <SelectItem key={p.id} value={p.id} className="text-xs">
                                  {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">No allowances</div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </Card>
        ))}
      </div>

      <div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 py-3 border-t mt-2 flex justify-between px-1">
        <Button variant="outline" onClick={onCancel}>Back</Button>
        <Button 
          onClick={() => {
            // Apply matched master data prices before importing
            const finalTours = draft.map(d => {
              const tour = { ...d.tour };
              
              // Apply matched destination prices
              if (tour.destinations) {
                tour.destinations = tour.destinations.map(dest => {
                  if ((dest as any).matchedPrice !== undefined) {
                    return { ...dest, price: (dest as any).matchedPrice };
                  }
                  return dest;
                });
              }
              
              // Apply matched expense prices
              if (tour.expenses) {
                tour.expenses = tour.expenses.map(exp => {
                  if ((exp as any).matchedPrice !== undefined) {
                    return { ...exp, price: (exp as any).matchedPrice };
                  }
                  return exp;
                });
              }
              
              return tour;
            });
            
            onConfirm(finalTours);
          }} 
          disabled={!allValid}
        >
          Import {draft.length} tour(s)
        </Button>
      </div>

      {/* Create dialogs */}
      <CompanyDialog open={openCompanyDialog} onOpenChange={setOpenCompanyDialog} onSubmit={handleCreateCompany} />
      <GuideDialog open={openGuideDialog} onOpenChange={setOpenGuideDialog} onSubmit={handleCreateGuide} />
      <NationalityDialog open={openNationalityDialog} onOpenChange={setOpenNationalityDialog} onSubmit={handleCreateNationality} />
      <DestinationDialog open={openDestinationDialog} onOpenChange={setOpenDestinationDialog} onSubmit={handleCreateDestination} />
      <DetailedExpenseDialog open={openExpenseDialog} onOpenChange={setOpenExpenseDialog} onSubmit={handleCreateExpense} />
      <ShoppingDialog open={openShoppingDialog} onOpenChange={setOpenShoppingDialog} onSubmit={handleCreateShopping} />
    </div>
  );
}
