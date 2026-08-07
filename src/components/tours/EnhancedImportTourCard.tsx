import { useCallback, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Receipt, Utensils, DollarSign, Trash2 } from 'lucide-react';
import { SubcollectionSection } from './SubcollectionSection';
import { ImportTourInfoFields, type ImportEntityType } from './ImportTourInfoFields';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import type { ReviewItem } from '@/hooks/useEnhancedImportReview';
import type { Company, Guide, Nationality, TouristDestination, DetailedExpense } from '@/types/master';
import type { MatchCandidate } from '@/lib/import-match-utils';

type EntityType = ImportEntityType;

interface Props {
  item: ReviewItem;
  originalIndex: number;
  warnings: string[];
  companies: Company[];
  guides: Guide[];
  nationalities: Nationality[];
  destinations: TouristDestination[];
  expenses: DetailedExpense[];
  ctpAllowances: DetailedExpense[];
  matchDestination: (name: string) => TouristDestination | null;
  matchExpense: (name: string) => DetailedExpense | null;
  matchAllowance: (name: string) => DetailedExpense | null;
  suggestDestination: (name: string) => MatchCandidate<TouristDestination>[];
  suggestExpense: (name: string) => MatchCandidate<DetailedExpense>[];
  suggestAllowance: (name: string) => MatchCandidate<DetailedExpense>[];
  onUpdateDestination: (di: number, field: string, value: any) => void;
  onUpdateExpense: (ei: number, field: string, value: any) => void;
  onUpdateMeal: (mi: number, field: string, value: any) => void;
  onUpdateAllowance: (ai: number, field: string, value: any) => void;
  onRemoveDestination: (di: number) => void;
  onRemoveExpense: (ei: number) => void;
  onRemoveMeal: (mi: number) => void;
  onRemoveAllowance: (ai: number) => void;
  onUpdateField: (field: string, value: any) => void;
  onUpdateEntityRef: (entityType: EntityType, entity: { id: string; name: string }) => void;
  onRemove: () => void;
  onOpenCompanyDialog: () => void;
  onOpenNationalityDialog: () => void;
}

const ALL_SUBTABS = ['info', 'destinations', 'expenses', 'meals', 'allowances', 'summary'] as const;
type SubTab = typeof ALL_SUBTABS[number];
const LINE_SUBTABS: SubTab[] = ['destinations', 'expenses', 'meals', 'allowances'];
const LINE_TAB_LABELS: Record<'destinations' | 'expenses' | 'meals' | 'allowances', string> = {
  destinations: 'Dest', expenses: 'Exp', meals: 'Meals', allowances: 'Allow',
};

export function EnhancedImportTourCard({
  item, originalIndex, warnings,
  companies, guides, nationalities, destinations, expenses, ctpAllowances,
  matchDestination, matchExpense, matchAllowance,
  suggestDestination, suggestExpense, suggestAllowance,
  onUpdateDestination, onUpdateExpense, onUpdateMeal, onUpdateAllowance,
  onRemoveDestination, onRemoveExpense, onRemoveMeal, onRemoveAllowance,
  onUpdateField, onUpdateEntityRef, onRemove,
  onOpenCompanyDialog, onOpenNationalityDialog,
}: Props) {
  const { tour, raw } = item;
  const [activeSub, setActiveSub] = useState<SubTab>('info');

  const counts: Record<SubTab, number> = {
    info: 0,
    destinations: tour.destinations?.length || 0,
    expenses: tour.expenses?.length || 0,
    meals: tour.meals?.length || 0,
    allowances: tour.allowances?.length || 0,
    summary: tour.summary ? 1 : 0,
  };

  // Luồng import từ ảnh chỉ lấy tab Thông tin: khi không có dòng chi tiết nào
  // thì ẩn hẳn 4 tab dòng cho đỡ rối.
  const hasLines = LINE_SUBTABS.some((key) => counts[key] > 0);
  const subTabs = useMemo(
    () => ALL_SUBTABS.filter((key) => hasLines || !LINE_SUBTABS.includes(key)),
    [hasLines],
  );

  const goNext = useCallback(() => {
    setActiveSub((cur) => {
      const i = subTabs.indexOf(cur);
      return i >= 0 && i < subTabs.length - 1 ? subTabs[i + 1] : cur;
    });
  }, [subTabs]);
  const goPrev = useCallback(() => {
    setActiveSub((cur) => {
      const i = subTabs.indexOf(cur);
      return i > 0 ? subTabs[i - 1] : cur;
    });
  }, [subTabs]);

  const swipeRef = useSwipeNavigation<HTMLDivElement>({
    onSwipeLeft: goNext,
    onSwipeRight: goPrev,
    // Keep card sub-tab swipes from also flipping the top-level tabs.
    stopPropagation: true,
  });

  return (
    <Card className={warnings.length > 0 ? 'border-yellow-500' : ''}>
      <CardHeader className="pb-2 pt-3 px-3 sm:px-6">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm sm:text-base truncate min-w-0">
            {tour.tourCode || `Tour ${originalIndex + 1}`}
          </CardTitle>
          <div className="flex items-center gap-1 shrink-0">
            {warnings.length > 0 && (
              <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 py-0.5">{warnings.length}w</Badge>
            )}
            <Button variant="outline" size="sm" onClick={onRemove} className="h-6 w-6 p-0" aria-label="Xoá tour">
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2 px-3 sm:px-6">
        <div ref={swipeRef} className="touch-pan-y">
          <Tabs value={activeSub} onValueChange={(v) => setActiveSub(v as SubTab)} className="w-full">
            <TabsList
              className={`w-full h-8 overflow-x-auto scrollbar-hide flex-nowrap justify-start sm:overflow-visible ${hasLines ? 'sm:grid sm:grid-cols-6' : 'sm:grid sm:grid-cols-2'}`}
            >
              <TabsTrigger value="info" className="text-xs px-2 shrink-0">Info</TabsTrigger>
              {hasLines && (['destinations', 'expenses', 'meals', 'allowances'] as const).map((key) => (
                <TabsTrigger key={key} value={key} className="text-xs px-1.5 sm:px-1 shrink-0 gap-1">
                  <span>{LINE_TAB_LABELS[key]}</span>
                  <Badge variant="secondary" className="text-[10px] sm:text-xs px-1 py-0">{counts[key]}</Badge>
                </TabsTrigger>
              ))}
              <TabsTrigger value="summary" className="text-xs px-1.5 sm:px-1 shrink-0">Summary</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="mt-2">
              <ImportTourInfoFields
                item={item} warnings={warnings}
                companies={companies} guides={guides} nationalities={nationalities}
                onUpdateField={onUpdateField} onUpdateEntityRef={onUpdateEntityRef}
                onOpenCompanyDialog={onOpenCompanyDialog} onOpenNationalityDialog={onOpenNationalityDialog} />
            </TabsContent>

            <TabsContent value="destinations" className="mt-2">
              <SubcollectionSection title="Destinations" icon={<MapPin className="h-3 w-3" />}
                items={tour.destinations || []} tourIndex={originalIndex} sectionKey="destinations"
                onUpdate={(i, f, v) => onUpdateDestination(i, f, v)} onRemove={onRemoveDestination}
                matchFunction={matchDestination} suggestFunction={suggestDestination} matchType="destination"
                masterData={destinations} rawData={raw.destinations || []} />
            </TabsContent>

            <TabsContent value="expenses" className="mt-2">
              <SubcollectionSection title="Expenses" icon={<Receipt className="h-3 w-3" />}
                items={tour.expenses || []} tourIndex={originalIndex} sectionKey="expenses"
                onUpdate={(i, f, v) => onUpdateExpense(i, f, v)} onRemove={onRemoveExpense}
                matchFunction={matchExpense} suggestFunction={suggestExpense} matchType="expense"
                masterData={expenses} rawData={raw.expenses || []} />
            </TabsContent>

            <TabsContent value="meals" className="mt-2">
              <SubcollectionSection title="Meals" icon={<Utensils className="h-3 w-3" />}
                items={tour.meals || []} tourIndex={originalIndex} sectionKey="meals"
                onUpdate={(i, f, v) => onUpdateMeal(i, f, v)} onRemove={onRemoveMeal}
                matchFunction={matchExpense} suggestFunction={suggestExpense} matchType="meal"
                masterData={expenses} rawData={raw.meals || []} />
            </TabsContent>

            <TabsContent value="allowances" className="mt-2">
              <SubcollectionSection title="Allowances" icon={<DollarSign className="h-3 w-3" />}
                items={tour.allowances || []} tourIndex={originalIndex} sectionKey="allowances"
                onUpdate={(i, f, v) => onUpdateAllowance(i, f, v)} onRemove={onRemoveAllowance}
                matchFunction={matchAllowance} suggestFunction={suggestAllowance} matchType="allowance"
                masterData={ctpAllowances} rawData={raw.allowances || []} />
            </TabsContent>

            <TabsContent value="summary" className="mt-2">
              <SubcollectionSection title="Summary" icon={<DollarSign className="h-3 w-3" />}
                items={tour.summary ? [tour.summary] : []} tourIndex={originalIndex} sectionKey="summary"
                onUpdate={(_, f, v) => onUpdateField('summary', { ...tour.summary, [f]: v })}
                onRemove={() => {}} matchFunction={null} matchType="summary"
                rawData={raw.summary ? [raw.summary] : []} />
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
}
