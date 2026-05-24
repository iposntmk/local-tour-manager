import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { CompanyDialog } from '@/components/companies/CompanyDialog';
import { GuideDialog } from '@/components/guides/GuideDialog';
import { NationalityDialog } from '@/components/nationalities/NationalityDialog';
import { DestinationDialog } from '@/components/destinations/DestinationDialog';
import { DetailedExpenseDialog } from '@/components/detailed-expenses/DetailedExpenseDialog';
import { ShoppingDialog } from '@/components/shopping/ShoppingDialog';
import { useEnhancedImportReview } from '@/hooks/useEnhancedImportReview';
import { EnhancedImportTourCard } from './EnhancedImportTourCard';
import type { Company, Guide, Nationality } from '@/types/master';
import type { Tour } from '@/types/tour';

export type { ReviewItem } from '@/hooks/useEnhancedImportReview';

interface EnhancedImportReviewProps {
  items: import('@/hooks/useEnhancedImportReview').ReviewItem[];
  onCancel: () => void;
  onConfirm: (tours: Partial<Tour>[]) => void;
  preloadedEntities?: { companies: Company[]; guides: Guide[]; nationalities: Nationality[] };
}

export function EnhancedImportReview({ items, onCancel, onConfirm, preloadedEntities }: EnhancedImportReviewProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const {
    companies, guides, nationalities, languages, destinations, expenses, ctpAllowances,
    draft, searchQuery, setSearchQuery,
    validationWarnings, filteredTours, validateForImport,
    matchDestination, matchExpense, matchAllowance,
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
  } = useEnhancedImportReview(items, preloadedEntities);

  const handleImportConfirm = () => {
    try {
      const validation = validateForImport();
      if (!validation.valid) {
        toast.error(`Cannot import: ${validation.errors.join(', ')}`, { duration: 8000 });
        return;
      }
      const finalTours = draft.map(d => {
        const tour = { ...d.tour };
        if (tour.destinations) {
          tour.destinations = tour.destinations.map(({ matchedId, matchedPrice, ...dest }: any) => ({
            ...dest, price: matchedPrice !== undefined ? matchedPrice : dest.price,
          }));
        }
        if (tour.expenses) {
          tour.expenses = tour.expenses.map(({ matchedId, matchedPrice, ...exp }: any) => ({
            ...exp, price: matchedPrice !== undefined ? matchedPrice : exp.price,
          }));
        }
        if (tour.meals) {
          tour.meals = tour.meals.map(({ matchedId, matchedPrice, ...meal }: any) => ({
            ...meal, price: matchedPrice !== undefined ? matchedPrice : meal.price,
          }));
        }
        if (tour.allowances) {
          tour.allowances = tour.allowances.map(({ matchedId, matchedPrice, ...a }: any) => ({
            ...a, price: matchedPrice !== undefined ? matchedPrice : a.price,
          }));
        }
        return tour;
      });
      onConfirm(finalTours);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Import failed: ${msg}`, { duration: 8000 });
    }
  };

  const warningCount = Object.keys(validationWarnings).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">Import Review</h2>
        <Badge variant="outline" className="text-xs">{draft.length} tour{draft.length !== 1 ? 's' : ''}</Badge>
        <Badge variant={warningCount === 0 ? 'default' : 'secondary'} className="text-xs">
          {warningCount === 0 ? 'Ready' : `${warningCount} warnings`}
        </Badge>
      </div>

      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground h-3 w-3" />
        <Input placeholder="Search tours..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-7 h-8 text-sm" />
      </div>

      <ScrollArea className="h-[calc(100vh-300px)]" ref={scrollContainerRef as any}>
        <div className="space-y-4 pr-4">
          {filteredTours.map((item, index) => {
            const originalIndex = draft.findIndex(d => d === item);
            const warnings = validationWarnings[originalIndex] || [];
            return (
              <div key={originalIndex}>
                <EnhancedImportTourCard
                  item={item} originalIndex={originalIndex} warnings={warnings}
                  companies={companies} guides={guides} nationalities={nationalities}
                  destinations={destinations} expenses={expenses} ctpAllowances={ctpAllowances}
                  matchDestination={matchDestination} matchExpense={matchExpense} matchAllowance={matchAllowance}
                  onUpdateDestination={(di, f, v) => updateDestination(originalIndex, di, f, v)}
                  onUpdateExpense={(ei, f, v) => updateExpense(originalIndex, ei, f, v)}
                  onUpdateMeal={(mi, f, v) => updateMeal(originalIndex, mi, f, v)}
                  onUpdateAllowance={(ai, f, v) => updateAllowance(originalIndex, ai, f, v)}
                  onRemoveDestination={(di) => removeDestination(originalIndex, di)}
                  onRemoveExpense={(ei) => removeExpense(originalIndex, ei)}
                  onRemoveMeal={(mi) => removeMeal(originalIndex, mi)}
                  onRemoveAllowance={(ai) => removeAllowance(originalIndex, ai)}
                  onUpdateField={(f, v) => updateTourField(originalIndex, f, v)}
                  onUpdateEntityRef={(t, e) => updateEntityRef(originalIndex, t, e)}
                  onRemove={() => removeTour(originalIndex)}
                  onOpenCompanyDialog={() => { setTargetIndex(originalIndex); setInitialEntityName(item.raw.company || ''); setOpenCompanyDialog(true); }}
                  onOpenGuideDialog={() => { setTargetIndex(originalIndex); setInitialEntityName(item.raw.guide || ''); setOpenGuideDialog(true); }}
                  onOpenNationalityDialog={() => { setTargetIndex(originalIndex); setInitialEntityName(item.raw.nationality || ''); setOpenNationalityDialog(true); }}
                />
                {index < filteredTours.length - 1 && <div className="my-4 border-t border-gray-300" />}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleImportConfirm}>Import {draft.length} tour(s)</Button>
      </div>

      <CompanyDialog open={openCompanyDialog} onOpenChange={setOpenCompanyDialog}
        company={initialEntityName ? { id: '', name: initialEntityName, createdAt: '', updatedAt: '' } as any : undefined}
        onSubmit={handleCreateCompany} />
      <GuideDialog open={openGuideDialog} onOpenChange={setOpenGuideDialog}
        guide={initialEntityName ? { id: '', name: initialEntityName, createdAt: '', updatedAt: '' } as any : undefined}
        languages={languages} onSubmit={handleCreateGuide} />
      <NationalityDialog open={openNationalityDialog} onOpenChange={setOpenNationalityDialog}
        nationality={initialEntityName ? { id: '', name: initialEntityName, createdAt: '', updatedAt: '' } as any : undefined}
        onSubmit={handleCreateNationality} />
      <DestinationDialog open={openDestinationDialog} onOpenChange={setOpenDestinationDialog} onSubmit={handleCreateDestination} />
      <DetailedExpenseDialog open={openExpenseDialog} onOpenChange={setOpenExpenseDialog} onSubmit={handleCreateExpense} />
      <ShoppingDialog open={openShoppingDialog} onOpenChange={setOpenShoppingDialog} onSubmit={handleCreateShopping} />
    </div>
  );
}
