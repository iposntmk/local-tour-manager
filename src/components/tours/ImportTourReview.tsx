import { useEffect, useMemo, useState } from 'react';
import Fuse from 'fuse.js';
import type { Tour, EntityRef } from '@/types/tour';
import type { Company, Guide, Nationality } from '@/types/master';
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
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CompanyDialog } from '@/components/companies/CompanyDialog';
import { GuideDialog } from '@/components/guides/GuideDialog';
import { NationalityDialog } from '@/components/nationalities/NationalityDialog';

export interface ReviewItem {
  tour: Partial<Tour>;
  raw: { company: string; guide: string; nationality: string };
}

interface ImportTourReviewProps {
  items: ReviewItem[];
  onCancel: () => void;
  onConfirm: (tours: Partial<Tour>[]) => void;
}

export function ImportTourReview({ items, onCancel, onConfirm }: ImportTourReviewProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [nationalities, setNationalities] = useState<Nationality[]>([]);
  const [draft, setDraft] = useState<ReviewItem[]>(items);

  const [openCompanyDialog, setOpenCompanyDialog] = useState(false);
  const [openGuideDialog, setOpenGuideDialog] = useState(false);
  const [openNationalityDialog, setOpenNationalityDialog] = useState(false);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [c, g, n] = await Promise.all([
          store.listCompanies({}),
          store.listGuides({}),
          store.listNationalities({}),
        ]);
        setCompanies(c);
        setGuides(g);
        setNationalities(n);

        // Auto-match using fuzzy search
        const updatedDraft = items.map(item => {
          const tour = { ...item.tour };
          
          // Fuzzy match company
          if (item.raw.company && !tour.companyRef?.id) {
            const companyFuse = new Fuse(c, { keys: ['name'], threshold: 0.3 });
            const companyMatch = companyFuse.search(item.raw.company);
            if (companyMatch.length > 0) {
              const matched = companyMatch[0].item;
              tour.companyRef = { id: matched.id, nameAtBooking: matched.name };
            }
          }

          // Fuzzy match guide
          if (item.raw.guide && !tour.guideRef?.id) {
            const guideFuse = new Fuse(g, { keys: ['name'], threshold: 0.3 });
            const guideMatch = guideFuse.search(item.raw.guide);
            if (guideMatch.length > 0) {
              const matched = guideMatch[0].item;
              tour.guideRef = { id: matched.id, nameAtBooking: matched.name };
            }
          }

          // Fuzzy match nationality
          if (item.raw.nationality && !tour.clientNationalityRef?.id) {
            const nationalityFuse = new Fuse(n, { keys: ['name', 'iso2'], threshold: 0.3 });
            const nationalityMatch = nationalityFuse.search(item.raw.nationality);
            if (nationalityMatch.length > 0) {
              const matched = nationalityMatch[0].item;
              tour.clientNationalityRef = { id: matched.id, nameAtBooking: matched.name };
            }
          }

          return { ...item, tour };
        });
        setDraft(updatedDraft);
      } catch (e) {
        toast.error('Failed to load master data');
      }
    };
    load();
  }, []);

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
                <TabsList className="grid w-full grid-cols-5 bg-muted/50 rounded-md p-1">
                  <TabsTrigger value="info">Info</TabsTrigger>
                  <TabsTrigger value="destinations">
                    Destinations <Badge variant="secondary" className="ml-1">{item.tour.destinations?.length || 0}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="expenses">
                    Expenses <Badge variant="secondary" className="ml-1">{item.tour.expenses?.length || 0}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="meals">
                    Meals <Badge variant="secondary" className="ml-1">{item.tour.meals?.length || 0}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="allowances">
                    Allowances <Badge variant="secondary" className="ml-1">{item.tour.allowances?.length || 0}</Badge>
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
                        <div key={destIdx} className="p-3 flex justify-between items-center">
                          <div>
                            <div className="font-medium">{dest.name}</div>
                            <div className="text-xs text-muted-foreground">{dest.date} • {dest.price.toLocaleString()} ₫</div>
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
                        <div key={expIdx} className="p-3 flex justify-between items-center">
                          <div>
                            <div className="font-medium">{exp.name}</div>
                            <div className="text-xs text-muted-foreground">{exp.date} • {exp.price.toLocaleString()} ₫</div>
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
                        <div key={mealIdx} className="p-3 flex justify-between items-center">
                          <div>
                            <div className="font-medium">{meal.name}</div>
                            <div className="text-xs text-muted-foreground">{meal.date} • {meal.price.toLocaleString()} ₫</div>
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
                        <div key={allowIdx} className="p-3 flex justify-between items-center">
                          <div>
                            <div className="font-medium">{allow.province}</div>
                            <div className="text-xs text-muted-foreground">{allow.date} • {allow.amount.toLocaleString()} ₫</div>
                          </div>
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
        <Button onClick={() => onConfirm(draft.map(d => d.tour))} disabled={!allValid}>Import {draft.length} tour(s)</Button>
      </div>

      {/* Create dialogs */}
      <CompanyDialog open={openCompanyDialog} onOpenChange={setOpenCompanyDialog} onSubmit={handleCreateCompany} />
      <GuideDialog open={openGuideDialog} onOpenChange={setOpenGuideDialog} onSubmit={handleCreateGuide} />
      <NationalityDialog open={openNationalityDialog} onOpenChange={setOpenNationalityDialog} onSubmit={handleCreateNationality} />
    </div>
  );
}
