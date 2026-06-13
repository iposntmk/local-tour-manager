import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, ChevronsUpDown, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency-utils';
import { CurrencyInput } from '@/components/ui/currency-input';
import { DateInput } from '@/components/ui/date-input';
import { NumberInputMobile } from '@/components/ui/number-input-mobile';
import { toast } from 'sonner';
import { useMealsTab } from '@/hooks/useMealsTab';
import { MealsDesktopTable } from './MealsDesktopTable';
import { NewMealDialog } from './NewMealDialog';
import { MealsMobileList } from '@/components/tours/mobile/MealsMobileList';
import { LineEvidenceFields } from '@/components/tours/LineEvidenceFields';
import type { Meal, Tour } from '@/types/tour';
import {
  canEditAnyTourLineField,
  canEditTourLineField,
  canViewTourLineField,
  type Access,
  type TourLineFieldKey,
} from '@/lib/tour-detail-permissions';

interface MealsTabProps {
  tourId?: string;
  meals: Meal[];
  onChange?: (meals: Meal[]) => void;
  tour?: Tour | null;
  readOnly?: boolean;
  editRequest?: { index: number; key: number };
  lineFieldAccess?: Partial<Record<TourLineFieldKey, Access>>;
}

export function MealsTab({ tourId, meals, onChange, tour, readOnly = false, editRequest, lineFieldAccess }: MealsTabProps) {
  const {
    editingIndex, formData, setFormData, openMeal, setOpenMeal,
    showNewMealDialog, setShowNewMealDialog,
    newMealName, setNewMealName, newMealPrice, setNewMealPrice,
    newMealCategoryId, setNewMealCategoryId, openCategory, setOpenCategory,
    showNewCategoryDialog, setShowNewCategoryDialog,
    detailedExpenses, expenseCategories,
    deleteMutation, createMealMutation,
    handleSubmit, handleEdit, handleCancel, handleDuplicate,
    handleCreateNewMeal, handleMobileGuestsChange, handleCreateNewCategory,
    sortedMeals, mealsTotalAmount, autosaveMeal,
    pendingFiles, setPendingFiles,
  } = useMealsTab({ tourId, meals, onChange, tour, readOnly, lineFieldAccess });
  const canView = (field: TourLineFieldKey) => canViewTourLineField(lineFieldAccess, field);
  const canEdit = (field: TourLineFieldKey) => canEditTourLineField(lineFieldAccess, field);
  const canEditLine = canEditAnyTourLineField(lineFieldAccess);
  const canSubmit = editingIndex !== null ? canEditLine : canEdit('name') && canEdit('date') && canEdit('price');

  useEffect(() => {
    if (editRequest && editRequest.index >= 0 && editRequest.index < meals.length) {
      handleEdit(editRequest.index);
    }
  }, [editRequest?.key]);

  return (
    <div className="space-y-6">
      {!readOnly && canEditLine && (
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingIndex !== null ? 'Chỉnh sửa bữa ăn' : 'Thêm bữa ăn'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              {canView('name') && (
              <div className="flex gap-2">
                <Popover open={openMeal} onOpenChange={setOpenMeal}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" role="combobox" aria-expanded={openMeal}
                      className="flex-1 justify-between" disabled={!canEdit('name')}>
                      {formData.name || 'Chọn bữa ăn...'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Tìm bữa ăn..." />
                      <CommandList>
                        <CommandEmpty>Không tìm thấy bữa ăn.</CommandEmpty>
                        <CommandGroup>
                          {detailedExpenses.map((item) => (
                            <CommandItem key={item.id} value={item.name} onSelect={() => {
                              setFormData({
                                ...formData,
                                ...(canEdit('name') ? { name: item.name } : {}),
                                ...(canEdit('price') ? { price: item.price } : {}),
                                ...(canEdit('date') ? { date: formData.date || new Date().toISOString().split('T')[0] } : {}),
                              });
                              setOpenMeal(false);
                            }}>
                              <Check className={cn('mr-2 h-4 w-4', formData.name === item.name ? 'opacity-100' : 'opacity-0')} />
                              {item.name} ({formatCurrency(item.price)})
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Button type="button" variant="outline" size="icon" onClick={() => setShowNewMealDialog(true)} disabled={!canEdit('name')} title="Thêm bữa ăn mới">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              )}
              {canView('price') && (
              <CurrencyInput placeholder="Giá (VND)" value={formData.price}
                onChange={(price) => setFormData({ ...formData, price })} disabled={!canEdit('price')} />
              )}
              {canView('date') && (
              <DateInput value={formData.date} onChange={(date) => setFormData({ ...formData, date })} required disabled={!canEdit('date')} />
              )}
              {canView('quantity') && (
              <NumberInputMobile value={formData.guests} onChange={(val) => {
                if (!canEdit('quantity')) return;
                const max = tour?.totalGuests || 0;
                if (val !== undefined && max && val > max) {
                  toast.warning(`Số khách không được vượt quá tổng khách của tour (${max}).`);
                  setFormData({ ...formData, guests: max });
                } else {
                  setFormData({ ...formData, guests: val });
                }
              }} min={0} max={tour?.totalGuests || 0} placeholder="Số khách" className="w-full" disabled={!canEdit('quantity')} />
              )}
              <LineEvidenceFields
                line={formData}
                onChange={setFormData}
                totalGuests={tour?.totalGuests || 0}
                tourId={tourId}
                lineType="meal"
                pendingFiles={pendingFiles}
                onPendingFilesChange={setPendingFiles}
                access={lineFieldAccess?.evidence}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button type="submit" className="hover-scale w-full sm:w-auto" disabled={!canSubmit}>
                <Plus className="h-4 w-4 mr-2" />{editingIndex !== null ? 'Cập nhật' : 'Thêm'}
              </Button>
              {editingIndex !== null && (
                <Button type="button" variant="outline" onClick={handleCancel} className="w-full sm:w-auto">Hủy</Button>
              )}
            </div>
          </form>
        </div>
      )}

      <div className="rounded-lg border">
        <div className="p-4 border-b bg-muted/50">
          <h3 className="font-semibold">Danh sách bữa ăn</h3>
        </div>
        {meals.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Chưa có bữa ăn nào</div>
        ) : (
          <>
            <MealsDesktopTable
              sortedMeals={sortedMeals} tourGuests={tour?.totalGuests || 0}
              readOnly={readOnly} totalAmount={mealsTotalAmount}
              lineFieldAccess={lineFieldAccess}
              onEdit={handleEdit} onDuplicate={handleDuplicate}
              onDelete={(idx) => deleteMutation.mutate(idx)}
              onGuestsChange={(idx, val) => {
                const updated = { ...meals[idx], guests: val };
                autosaveMeal(idx, updated as Meal);
              }}
              tourId={tourId}
            />
            <div className="md:hidden">
              <MealsMobileList
                items={sortedMeals} tourGuests={tour?.totalGuests || 0}
                readOnly={readOnly} onEdit={handleEdit} onDuplicate={handleDuplicate}
                lineFieldAccess={lineFieldAccess}
                onDelete={(idx) => deleteMutation.mutate(idx)}
                onGuestsChange={handleMobileGuestsChange} totalAmount={mealsTotalAmount}
              />
            </div>
          </>
        )}
      </div>

      <NewMealDialog
        open={showNewMealDialog} onOpenChange={setShowNewMealDialog}
        newMealName={newMealName} setNewMealName={setNewMealName}
        newMealPrice={newMealPrice} setNewMealPrice={setNewMealPrice}
        newMealCategoryId={newMealCategoryId} setNewMealCategoryId={setNewMealCategoryId}
        openCategory={openCategory} setOpenCategory={setOpenCategory}
        showNewCategoryDialog={showNewCategoryDialog} setShowNewCategoryDialog={setShowNewCategoryDialog}
        expenseCategories={expenseCategories} isPending={createMealMutation.isPending}
        readOnly={readOnly || !canEdit('name') || !canEdit('price')}
        onSubmit={handleCreateNewMeal} onCreateCategory={handleCreateNewCategory}
      />
    </div>
  );
}
