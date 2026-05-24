import { Button } from '@/components/ui/button';
import { CompanyDialog } from '@/components/companies/CompanyDialog';
import { GuideDialog } from '@/components/guides/GuideDialog';
import { NationalityDialog } from '@/components/nationalities/NationalityDialog';
import { DestinationDialog } from '@/components/destinations/DestinationDialog';
import { DetailedExpenseDialog } from '@/components/detailed-expenses/DetailedExpenseDialog';
import { ShoppingDialog } from '@/components/shopping/ShoppingDialog';
import { useImportTourReview } from '@/hooks/useImportTourReview';
import { ImportTourReviewCard } from './ImportTourReviewCard';
import type { Company, Guide, Nationality } from '@/types/master';
import type { Tour } from '@/types/tour';

export type { ReviewItem } from '@/hooks/useImportTourReview';

interface ImportTourReviewProps {
  items: import('@/hooks/useImportTourReview').ReviewItem[];
  onCancel: () => void;
  onConfirm: (tours: Partial<Tour>[]) => void;
  preloadedEntities?: { companies: Company[]; guides: Guide[]; nationalities: Nationality[] };
}

export function ImportTourReview({ items, onCancel, onConfirm, preloadedEntities }: ImportTourReviewProps) {
  const {
    companies, guides, nationalities, languages, destinations, expenses, shoppings, provinces,
    draft, allValid,
    setRef, openAddDialog,
    updateDestinationMatch, updateExpenseMatch, updateMealMatch, updateAllowanceMatch,
    handleCreateCompany, handleCreateGuide, handleCreateNationality,
    handleCreateDestination, handleCreateExpense, handleCreateShopping,
    openCompanyDialog, setOpenCompanyDialog,
    openGuideDialog, setOpenGuideDialog,
    openNationalityDialog, setOpenNationalityDialog,
    openDestinationDialog, setOpenDestinationDialog,
    openExpenseDialog, setOpenExpenseDialog,
    openShoppingDialog, setOpenShoppingDialog,
    targetIndex, setTargetIndex,
    targetItemIndex, setTargetItemIndex,
  } = useImportTourReview(items, preloadedEntities);

  const handleConfirm = () => {
    const finalTours = draft.map(d => {
      const tour = { ...d.tour };
      if (tour.destinations) {
        tour.destinations = tour.destinations.map(dest =>
          (dest as any).matchedPrice !== undefined ? { ...dest, price: (dest as any).matchedPrice } : dest,
        );
      }
      if (tour.expenses) {
        tour.expenses = tour.expenses.map(exp =>
          (exp as any).matchedPrice !== undefined ? { ...exp, price: (exp as any).matchedPrice } : exp,
        );
      }
      return tour;
    });
    onConfirm(finalTours);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
        {draft.map((item, idx) => (
          <ImportTourReviewCard
            key={idx}
            item={item} idx={idx}
            companies={companies} guides={guides} nationalities={nationalities}
            destinations={destinations} expenses={expenses} shoppings={shoppings} provinces={provinces}
            onSetRef={(key, ref) => setRef(idx, key, ref)}
            onUpdateDestinationMatch={(di, sel) => updateDestinationMatch(idx, di, sel)}
            onUpdateExpenseMatch={(ei, sel) => updateExpenseMatch(idx, ei, sel)}
            onUpdateMealMatch={(mi, sel) => updateMealMatch(idx, mi, sel)}
            onUpdateAllowanceMatch={(ai, sel) => updateAllowanceMatch(idx, ai, sel)}
            onOpenAddCompany={() => openAddDialog('company', idx)}
            onOpenAddGuide={() => openAddDialog('guide', idx)}
            onOpenAddNationality={() => openAddDialog('nationality', idx)}
            onOpenAddDestination={(di) => { setTargetIndex(idx); setTargetItemIndex(di); setOpenDestinationDialog(true); }}
            onOpenAddExpense={(ei) => { setTargetIndex(idx); setTargetItemIndex(ei); setOpenExpenseDialog(true); }}
            onOpenAddShopping={(mi) => { setTargetIndex(idx); setTargetItemIndex(mi); setOpenShoppingDialog(true); }}
          />
        ))}
      </div>

      <div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 py-3 border-t mt-2 flex justify-between px-1">
        <Button variant="outline" onClick={onCancel}>Back</Button>
        <Button onClick={handleConfirm} disabled={!allValid}>
          Import {draft.length} tour(s)
        </Button>
      </div>

      <CompanyDialog open={openCompanyDialog} onOpenChange={setOpenCompanyDialog} onSubmit={handleCreateCompany} />
      <GuideDialog open={openGuideDialog} onOpenChange={setOpenGuideDialog} languages={languages} onSubmit={handleCreateGuide} />
      <NationalityDialog open={openNationalityDialog} onOpenChange={setOpenNationalityDialog} onSubmit={handleCreateNationality} />
      <DestinationDialog open={openDestinationDialog} onOpenChange={setOpenDestinationDialog} onSubmit={handleCreateDestination} />
      <DetailedExpenseDialog open={openExpenseDialog} onOpenChange={setOpenExpenseDialog} onSubmit={handleCreateExpense} />
      <ShoppingDialog open={openShoppingDialog} onOpenChange={setOpenShoppingDialog} onSubmit={handleCreateShopping} />
    </div>
  );
}
