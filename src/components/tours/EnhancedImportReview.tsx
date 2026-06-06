import { useMemo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Search, LayoutList, Braces, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { CompanyDialog } from '@/components/companies/CompanyDialog';
import { NationalityDialog } from '@/components/nationalities/NationalityDialog';
import { DestinationDialog } from '@/components/destinations/DestinationDialog';
import { DetailedExpenseDialog } from '@/components/detailed-expenses/DetailedExpenseDialog';
import { ShoppingDialog } from '@/components/shopping/ShoppingDialog';
import { useEnhancedImportReview } from '@/hooks/useEnhancedImportReview';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import { EnhancedImportTourCard } from './EnhancedImportTourCard';
import { ImportReviewImageView } from './ImportReviewImageView';
import { ImportReviewJsonView } from './ImportReviewJsonView';
import { buildFinalTours } from '@/lib/import-review-utils';
import type { Company, Guide, Nationality } from '@/types/master';
import type { Tour } from '@/types/tour';

export type { ReviewItem } from '@/hooks/useEnhancedImportReview';

interface EnhancedImportReviewProps {
  items: import('@/hooks/useEnhancedImportReview').ReviewItem[];
  onCancel: () => void;
  onConfirm: (tours: Partial<Tour>[]) => void;
  preloadedEntities?: { companies: Company[]; guides: Guide[]; nationalities: Nationality[] };
  /** Ảnh/PDF đã gửi OCR để đối chiếu trong màn hình review. */
  imageFile?: File | null;
  /** OCR thô của Azure (chỉ có ở luồng import từ ảnh) để hiển thị ở tab JSON. */
  rawOcr?: unknown;
}

const TAB_DATA = 'data';
const TAB_IMAGE = 'image';
const TAB_JSON = 'json';

export function EnhancedImportReview({ items, onCancel, onConfirm, preloadedEntities, imageFile, rawOcr }: EnhancedImportReviewProps) {
  const {
    companies, guides, nationalities, destinations, expenses, ctpAllowances,
    draft, searchQuery, setSearchQuery,
    validationWarnings, filteredTours, validateForImport,
    matchDestination, matchExpense, matchAllowance,
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
  } = useEnhancedImportReview(items, preloadedEntities);

  const tabs = useMemo(
    () => [TAB_DATA, ...(imageFile ? [TAB_IMAGE] : []), TAB_JSON],
    [imageFile],
  );
  const [activeTab, setActiveTab] = useState<string>(TAB_DATA);

  const goNext = useCallback(() => {
    setActiveTab((cur) => {
      const i = tabs.indexOf(cur);
      return i < tabs.length - 1 ? tabs[i + 1] : cur;
    });
  }, [tabs]);

  const goPrev = useCallback(() => {
    setActiveTab((cur) => {
      const i = tabs.indexOf(cur);
      return i > 0 ? tabs[i - 1] : cur;
    });
  }, [tabs]);

  const swipeRef = useSwipeNavigation<HTMLDivElement>({
    onSwipeLeft: goNext,
    onSwipeRight: goPrev,
  });

  const handleImportConfirm = () => {
    try {
      const validation = validateForImport();
      if (!validation.valid) {
        toast.error(`Cannot import: ${validation.errors.join(', ')}`, { duration: 8000 });
        return;
      }
      onConfirm(buildFinalTours(draft));
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Import failed: ${msg}`, { duration: 8000 });
    }
  };

  const warningCount = Object.keys(validationWarnings).length;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0 pb-2 sm:pb-3">
        <h2 className="text-base sm:text-lg font-semibold">Import Review</h2>
        <Badge variant="outline" className="text-xs">{draft.length} tour{draft.length !== 1 ? 's' : ''}</Badge>
        <Badge variant={warningCount === 0 ? 'default' : 'secondary'} className="text-xs">
          {warningCount === 0 ? 'Ready' : `${warningCount} warnings`}
        </Badge>
      </div>

      <div ref={swipeRef} className="flex flex-col flex-1 min-h-0 touch-pan-y">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
          <TabsList className="shrink-0 w-full sm:w-auto justify-start overflow-x-auto scrollbar-hide">
            <TabsTrigger value="data" className="gap-1.5 whitespace-nowrap">
              <LayoutList className="h-3.5 w-3.5" />Dữ liệu
            </TabsTrigger>
            {imageFile && (
              <TabsTrigger value="image" className="gap-1.5 whitespace-nowrap">
                <ImageIcon className="h-3.5 w-3.5" />Ảnh
              </TabsTrigger>
            )}
            <TabsTrigger value="json" className="gap-1.5 whitespace-nowrap">
              <Braces className="h-3.5 w-3.5" />JSON
            </TabsTrigger>
          </TabsList>

          <TabsContent value="data" className="flex flex-col flex-1 min-h-0 mt-2 sm:mt-3 gap-2 sm:gap-3">
            <div className="relative shrink-0">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground h-3 w-3" />
              <Input placeholder="Search tours..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 h-8 text-sm" />
            </div>

            <div className="overflow-y-auto flex-1 min-h-0 overscroll-contain -mx-3 sm:-mx-0 px-3 sm:px-0">
              <div className="space-y-3 sm:space-y-4">
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
                    suggestDestination={suggestDestination} suggestExpense={suggestExpense} suggestAllowance={suggestAllowance}
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
                    onOpenNationalityDialog={() => { setTargetIndex(originalIndex); setInitialEntityName(item.raw.nationality || ''); setOpenNationalityDialog(true); }}
                  />
                  {index < filteredTours.length - 1 && <div className="my-3 sm:my-4 border-t border-gray-300" />}
                </div>
              );
            })}
              </div>
            </div>
          </TabsContent>

          {imageFile && (
            <TabsContent value="image" className="flex flex-col flex-1 min-h-0 mt-2 sm:mt-3">
              <ImportReviewImageView file={imageFile} />
            </TabsContent>
          )}

          <TabsContent value="json" className="flex flex-col flex-1 min-h-0 mt-2 sm:mt-3">
            <ImportReviewJsonView draft={draft} rawOcr={rawOcr} />
          </TabsContent>
        </Tabs>
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-between gap-2 shrink-0 sticky bottom-0 bg-background pt-2 sm:pt-3 border-t mt-2 sm:mt-3">
        <Button variant="outline" onClick={onCancel} className="w-full sm:w-auto">Cancel</Button>
        <Button onClick={handleImportConfirm} className="w-full sm:w-auto">Import {draft.length} tour(s)</Button>
      </div>

      <CompanyDialog open={openCompanyDialog} onOpenChange={setOpenCompanyDialog}
        company={initialEntityName ? { id: '', name: initialEntityName, createdAt: '', updatedAt: '' } as any : undefined}
        onSubmit={handleCreateCompany} />
      <NationalityDialog open={openNationalityDialog} onOpenChange={setOpenNationalityDialog}
        nationality={initialEntityName ? { id: '', name: initialEntityName, createdAt: '', updatedAt: '' } as any : undefined}
        onSubmit={handleCreateNationality} />
      <DestinationDialog open={openDestinationDialog} onOpenChange={setOpenDestinationDialog} onSubmit={handleCreateDestination} />
      <DetailedExpenseDialog open={openExpenseDialog} onOpenChange={setOpenExpenseDialog} onSubmit={handleCreateExpense} />
      <ShoppingDialog open={openShoppingDialog} onOpenChange={setOpenShoppingDialog} onSubmit={handleCreateShopping} />
    </div>
  );
}
