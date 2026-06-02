import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, MapPin, Receipt, Utensils, DollarSign, Trash2 } from 'lucide-react';
import { EntitySelector } from './EntitySelector';
import { SubcollectionSection } from './SubcollectionSection';
import type { ReviewItem } from '@/hooks/useEnhancedImportReview';
import type { Company, Guide, Nationality, TouristDestination, DetailedExpense } from '@/types/master';

type EntityType = 'companyRef' | 'guideRef' | 'clientNationalityRef';

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

export function EnhancedImportTourCard({
  item, originalIndex, warnings,
  companies, guides, nationalities, destinations, expenses, ctpAllowances,
  matchDestination, matchExpense, matchAllowance,
  onUpdateDestination, onUpdateExpense, onUpdateMeal, onUpdateAllowance,
  onRemoveDestination, onRemoveExpense, onRemoveMeal, onRemoveAllowance,
  onUpdateField, onUpdateEntityRef, onRemove,
  onOpenCompanyDialog, onOpenNationalityDialog,
}: Props) {
  const { tour, raw } = item;

  return (
    <Card className={warnings.length > 0 ? 'border-yellow-500' : ''}>
      <CardHeader className="pb-2 pt-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{tour.tourCode || `Tour ${originalIndex + 1}`}</CardTitle>
          <div className="flex items-center gap-1">
            {warnings.length > 0 && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0.5">{warnings.length}w</Badge>
            )}
            <Button variant="outline" size="sm" onClick={onRemove} className="h-6 w-6 p-0">
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-6 h-8">
            <TabsTrigger value="info" className="text-xs px-2">Info</TabsTrigger>
            <TabsTrigger value="destinations" className="text-xs px-1">
              Dest <Badge variant="secondary" className="ml-1 text-xs px-1 py-0">{tour.destinations?.length || 0}</Badge>
            </TabsTrigger>
            <TabsTrigger value="expenses" className="text-xs px-1">
              Exp <Badge variant="secondary" className="ml-1 text-xs px-1 py-0">{tour.expenses?.length || 0}</Badge>
            </TabsTrigger>
            <TabsTrigger value="meals" className="text-xs px-1">
              Meals <Badge variant="secondary" className="ml-1 text-xs px-1 py-0">{tour.meals?.length || 0}</Badge>
            </TabsTrigger>
            <TabsTrigger value="allowances" className="text-xs px-1">
              Allow <Badge variant="secondary" className="ml-1 text-xs px-1 py-0">{tour.allowances?.length || 0}</Badge>
            </TabsTrigger>
            <TabsTrigger value="summary" className="text-xs px-1">Summary</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-2 mt-2">
            {warnings.length > 0 && (
              <div className="p-2 bg-yellow-50 rounded border border-yellow-200">
                <div className="flex items-start gap-1">
                  <AlertCircle className="h-3 w-3 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-xs font-medium text-yellow-800">Warnings:</div>
                    <ul className="list-disc list-inside mt-0.5 text-xs text-yellow-700 space-y-0.5">
                      {warnings.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Client Name</Label>
                <Input value={tour.clientName || ''} onChange={(e) => onUpdateField('clientName', e.target.value)}
                  className={`h-7 text-xs ${!tour.clientName ? 'border-yellow-500' : ''}`} />
              </div>
              <div>
                <Label className="text-xs font-medium">Tour Code</Label>
                <Input value={tour.tourCode || ''} onChange={(e) => onUpdateField('tourCode', e.target.value)}
                  className={`h-7 text-xs ${!tour.tourCode ? 'border-yellow-500' : ''}`} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-medium">
                  Company {raw.company && <span className="text-muted-foreground ml-1">({raw.company})</span>}
                </Label>
                <div className={!tour.companyRef?.id ? 'border border-yellow-500 rounded' : ''}>
                  <EntitySelector entities={companies} selected={tour.companyRef}
                    onSelect={(e) => onUpdateEntityRef('companyRef', e)}
                    onCreateNew={onOpenCompanyDialog} placeholder="Select company" />
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium">
                  Guide {raw.guide && <span className="text-muted-foreground ml-1">({raw.guide})</span>}
                </Label>
                <div className={!tour.guideRef?.id ? 'border border-yellow-500 rounded' : ''}>
                  <EntitySelector entities={guides} selected={tour.guideRef}
                    onSelect={(e) => onUpdateEntityRef('guideRef', e)}
                    placeholder="Select guide" />
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium">
                  Nationality {raw.nationality && <span className="text-muted-foreground ml-1">({raw.nationality})</span>}
                </Label>
                <div className={!tour.clientNationalityRef?.id ? 'border border-yellow-500 rounded' : ''}>
                  <EntitySelector entities={nationalities} selected={tour.clientNationalityRef}
                    onSelect={(e) => onUpdateEntityRef('clientNationalityRef', e)}
                    onCreateNew={onOpenNationalityDialog} placeholder="Select nationality" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Start Date</Label>
                <Input type="date" value={tour.startDate || ''} onChange={(e) => onUpdateField('startDate', e.target.value)}
                  className={`h-7 text-xs ${!tour.startDate ? 'border-yellow-500' : ''}`} />
              </div>
              <div>
                <Label className="text-xs font-medium">End Date</Label>
                <Input type="date" value={tour.endDate || ''} onChange={(e) => onUpdateField('endDate', e.target.value)}
                  className={`h-7 text-xs ${!tour.endDate ? 'border-yellow-500' : ''}`} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="destinations" className="mt-2">
            <SubcollectionSection title="Destinations" icon={<MapPin className="h-3 w-3" />}
              items={tour.destinations || []} tourIndex={originalIndex} sectionKey="destinations"
              onUpdate={(i, f, v) => onUpdateDestination(i, f, v)} onRemove={onRemoveDestination}
              matchFunction={matchDestination} matchType="destination"
              masterData={destinations} rawData={raw.destinations || []} />
          </TabsContent>

          <TabsContent value="expenses" className="mt-2">
            <SubcollectionSection title="Expenses" icon={<Receipt className="h-3 w-3" />}
              items={tour.expenses || []} tourIndex={originalIndex} sectionKey="expenses"
              onUpdate={(i, f, v) => onUpdateExpense(i, f, v)} onRemove={onRemoveExpense}
              matchFunction={matchExpense} matchType="expense"
              masterData={expenses} rawData={raw.expenses || []} />
          </TabsContent>

          <TabsContent value="meals" className="mt-2">
            <SubcollectionSection title="Meals" icon={<Utensils className="h-3 w-3" />}
              items={tour.meals || []} tourIndex={originalIndex} sectionKey="meals"
              onUpdate={(i, f, v) => onUpdateMeal(i, f, v)} onRemove={onRemoveMeal}
              matchFunction={matchExpense} matchType="meal"
              masterData={expenses} rawData={raw.meals || []} />
          </TabsContent>

          <TabsContent value="allowances" className="mt-2">
            <SubcollectionSection title="Allowances" icon={<DollarSign className="h-3 w-3" />}
              items={tour.allowances || []} tourIndex={originalIndex} sectionKey="allowances"
              onUpdate={(i, f, v) => onUpdateAllowance(i, f, v)} onRemove={onRemoveAllowance}
              matchFunction={matchAllowance} matchType="allowance"
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
      </CardContent>
    </Card>
  );
}
