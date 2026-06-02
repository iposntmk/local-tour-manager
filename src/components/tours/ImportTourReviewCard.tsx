import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDateRangeDisplay } from '@/lib/date-utils';
import type { ReviewItem } from '@/hooks/useImportTourReview';
import type { Company, Guide, Nationality, TouristDestination, DetailedExpense, Shopping, Province } from '@/types/master';
import type { EntityRef } from '@/types/tour';

interface Props {
  item: ReviewItem;
  idx: number;
  companies: Company[];
  guides: Guide[];
  nationalities: Nationality[];
  destinations: TouristDestination[];
  expenses: DetailedExpense[];
  shoppings: Shopping[];
  provinces: Province[];
  onSetRef: (key: 'companyRef' | 'guideRef' | 'clientNationalityRef', ref: EntityRef) => void;
  onUpdateDestinationMatch: (destIdx: number, selected: TouristDestination) => void;
  onUpdateExpenseMatch: (expIdx: number, selected: DetailedExpense) => void;
  onUpdateMealMatch: (mealIdx: number, selected: Shopping) => void;
  onUpdateAllowanceMatch: (allowIdx: number, selected: Province) => void;
  onOpenAddCompany: () => void;
  onOpenAddNationality: () => void;
  onOpenAddDestination: (destIdx: number) => void;
  onOpenAddExpense: (expIdx: number) => void;
  onOpenAddShopping: (mealIdx: number) => void;
}

export function ImportTourReviewCard({
  item, idx,
  companies, guides, nationalities, destinations, expenses, shoppings, provinces,
  onSetRef, onUpdateDestinationMatch, onUpdateExpenseMatch, onUpdateMealMatch, onUpdateAllowanceMatch,
  onOpenAddCompany, onOpenAddNationality,
  onOpenAddDestination, onOpenAddExpense, onOpenAddShopping,
}: Props) {
  const { tour, raw } = item;

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-base font-medium">{tour.tourCode}</div>
          <div className="text-xs text-muted-foreground">
            {tour.startDate && tour.endDate
              ? formatDateRangeDisplay(tour.startDate, tour.endDate)
              : `${tour.startDate || ''} → ${tour.endDate || ''}`}
          </div>
        </div>
        <Separator />

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-5 h-auto gap-1 bg-muted/50 rounded-md p-1">
            {(['info', 'destinations', 'expenses', 'meals', 'allowances'] as const).map((tab, i) => {
              const labels = ['Info', 'Dest.', 'Exp.', 'Meals', 'Allow.'];
              const counts = [null, tour.destinations?.length, tour.expenses?.length, tour.meals?.length, tour.allowances?.length];
              return (
                <TabsTrigger key={tab} value={tab} className="text-xs sm:text-sm flex flex-col items-center gap-0.5 px-1 py-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <span className="leading-none">{labels[i]}</span>
                  {counts[i] != null && (
                    <Badge variant="secondary" className="text-[10px] h-4 min-w-[16px] px-1 leading-none flex items-center justify-center">{counts[i]}</Badge>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {([
                { label: 'Company', key: 'companyRef' as const, list: companies, raw: raw.company, onAdd: onOpenAddCompany },
                { label: 'Guide', key: 'guideRef' as const, list: guides, raw: raw.guide, onAdd: undefined },
                { label: 'Client Nationality', key: 'clientNationalityRef' as const, list: nationalities, raw: raw.nationality, onAdd: onOpenAddNationality },
              ] as const).map(({ label, key, list, raw: rawVal, onAdd }) => (
                <div key={key} className="space-y-1">
                  <Label>{label}</Label>
                  <div className="flex gap-2">
                    <Select value={(tour[key] as EntityRef | undefined)?.id || undefined}
                      onValueChange={(val) => {
                        const sel = (list as { id: string; name: string }[]).find(x => x.id === val);
                        if (sel) onSetRef(key, { id: sel.id, nameAtBooking: sel.name });
                      }}>
                      <SelectTrigger>
                        <SelectValue placeholder={rawVal ? `Find: ${rawVal}` : `Select ${label.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent className="z-50 bg-popover">
                        {(list as { id: string; name: string }[]).map(x => (
                          <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {onAdd && <Button variant="outline" onClick={onAdd}>Add</Button>}
                  </div>
                  {!(tour[key] as EntityRef | undefined)?.id && <p className="text-xs text-destructive">Required</p>}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-muted-foreground pt-2">
              <div>Guests: {tour.totalGuests}</div>
              <div>Client: {tour.clientName || '-'}</div>
              <div>Driver: {tour.driverName || '-'}</div>
              <div>Days: {tour.totalDays || 0}</div>
            </div>
          </TabsContent>

          <TabsContent value="destinations" className="mt-4">
            {tour.destinations?.length ? (
              <div className="rounded-lg border divide-y">
                {tour.destinations.map((dest, destIdx) => (
                  <div key={destIdx} className="p-3 space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{dest.name}</div>
                        <div className="text-xs text-muted-foreground">{dest.date} • {dest.price.toLocaleString()} ₫</div>
                      </div>
                      {(dest as any).matchedId && <Badge variant="secondary" className="text-xs">Matched</Badge>}
                    </div>
                    <div className="flex gap-2">
                      <Select value={(dest as any).matchedId || undefined} onValueChange={(val) => {
                        const sel = destinations.find(d => d.id === val);
                        if (sel) onUpdateDestinationMatch(destIdx, sel);
                      }}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Match to master destination" /></SelectTrigger>
                        <SelectContent className="z-50 bg-popover">
                          {destinations.map(d => <SelectItem key={d.id} value={d.id} className="text-xs">{d.name} - {d.price.toLocaleString()} ₫</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm" className="h-8 text-xs whitespace-nowrap" onClick={() => onOpenAddDestination(destIdx)}>Add New</Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : <div className="text-center py-8 text-muted-foreground">No destinations</div>}
          </TabsContent>

          <TabsContent value="expenses" className="mt-4">
            {tour.expenses?.length ? (
              <div className="rounded-lg border divide-y">
                {tour.expenses.map((exp, expIdx) => (
                  <div key={expIdx} className="p-3 space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{exp.name}</div>
                        <div className="text-xs text-muted-foreground">{exp.date} • {exp.price.toLocaleString()} ₫</div>
                      </div>
                      {(exp as any).matchedId && <Badge variant="secondary" className="text-xs">Matched</Badge>}
                    </div>
                    <div className="flex gap-2">
                      <Select value={(exp as any).matchedId || undefined} onValueChange={(val) => {
                        const sel = expenses.find(e => e.id === val);
                        if (sel) onUpdateExpenseMatch(expIdx, sel);
                      }}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Match to master expense" /></SelectTrigger>
                        <SelectContent className="z-50 bg-popover">
                          {expenses.map(e => <SelectItem key={e.id} value={e.id} className="text-xs">{e.name} - {e.price.toLocaleString()} ₫</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm" className="h-8 text-xs whitespace-nowrap" onClick={() => onOpenAddExpense(expIdx)}>Add New</Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : <div className="text-center py-8 text-muted-foreground">No expenses</div>}
          </TabsContent>

          <TabsContent value="meals" className="mt-4">
            {tour.meals?.length ? (
              <div className="rounded-lg border divide-y">
                {tour.meals.map((meal, mealIdx) => (
                  <div key={mealIdx} className="p-3 space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{meal.name}</div>
                        <div className="text-xs text-muted-foreground">{meal.date} • {meal.price.toLocaleString()} ₫</div>
                      </div>
                      {(meal as any).matchedId && <Badge variant="secondary" className="text-xs">Matched</Badge>}
                    </div>
                    <div className="flex gap-2">
                      <Select value={(meal as any).matchedId || undefined} onValueChange={(val) => {
                        const sel = shoppings.find(s => s.id === val);
                        if (sel) onUpdateMealMatch(mealIdx, sel);
                      }}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Match to shopping item" /></SelectTrigger>
                        <SelectContent className="z-50 bg-popover">
                          {shoppings.map(s => <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm" className="h-8 text-xs whitespace-nowrap" onClick={() => onOpenAddShopping(mealIdx)}>Add New</Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : <div className="text-center py-8 text-muted-foreground">No meals</div>}
          </TabsContent>

          <TabsContent value="allowances" className="mt-4">
            {tour.allowances?.length ? (
              <div className="rounded-lg border divide-y">
                {tour.allowances.map((allow, allowIdx) => (
                  <div key={allowIdx} className="p-3 space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{allow.name}</div>
                        <div className="text-xs text-muted-foreground">{allow.date} • {allow.price.toLocaleString()} ₫</div>
                      </div>
                      {(allow as any).matchedProvinceId && <Badge variant="secondary" className="text-xs">Matched</Badge>}
                    </div>
                    <Select value={(allow as any).matchedProvinceId || undefined} onValueChange={(val) => {
                      const sel = provinces.find(p => p.id === val);
                      if (sel) onUpdateAllowanceMatch(allowIdx, sel);
                    }}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Match to province" /></SelectTrigger>
                      <SelectContent className="z-50 bg-popover">
                        {provinces.map(p => <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            ) : <div className="text-center py-8 text-muted-foreground">No allowances</div>}
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
}
