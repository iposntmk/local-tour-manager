import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Check, ChevronsUpDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency-utils';
import { CurrencyInput } from '@/components/ui/currency-input';
import { DateInput } from '@/components/ui/date-input';
import { NumberInputMobile } from '@/components/ui/number-input-mobile';
import { LineEvidenceFields } from '@/components/tours/LineEvidenceFields';
import {
  getWaterExpenseDays,
  isWaterExpense,
  normalizeWaterExpenseLine,
} from '@/lib/water-expense-utils';
import type { Expense, Tour } from '@/types/tour';
import type { DetailedExpense } from '@/types/master';
import {
  canEditAnyTourLineField,
  canEditTourLineField,
  canViewTourLineField,
  type Access,
  type TourLineFieldKey,
} from '@/lib/tour-detail-permissions';

interface ExpenseFormProps {
  formData: Expense;
  onChange: (data: Expense) => void;
  editingIndex: number | null;
  tour?: Tour | null;
  detailedExpenses: DetailedExpense[];
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  onOpenNewDialog: () => void;
  tourId?: string;
  pendingFiles: File[];
  onPendingFilesChange: (files: File[]) => void;
  lineFieldAccess?: Partial<Record<TourLineFieldKey, Access>>;
}

export function ExpenseForm({
  formData,
  onChange,
  editingIndex,
  tour,
  detailedExpenses,
  onSubmit,
  onCancel,
  onOpenNewDialog,
  tourId,
  pendingFiles,
  onPendingFilesChange,
  lineFieldAccess,
}: ExpenseFormProps) {
  const [openExpense, setOpenExpense] = useState(false);
  const canView = (field: TourLineFieldKey) => canViewTourLineField(lineFieldAccess, field);
  const canEdit = (field: TourLineFieldKey) => canEditTourLineField(lineFieldAccess, field);
  const canSubmit =
    editingIndex !== null
      ? canEditAnyTourLineField(lineFieldAccess)
      : canEdit('name') && canEdit('date') && canEdit('price');
  const tourGuests = tour?.totalGuests || 0;
  const tourDays = tour?.totalDays || 1;
  const waterExpense = isWaterExpense(formData);
  const waterDays = getWaterExpenseDays(formData, tourGuests, tourDays);

  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="text-lg font-semibold mb-4">
        {editingIndex !== null ? 'Chỉnh sửa chi phí' : 'Thêm chi phí'}
      </h3>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-3">
          {canView('name') && (
          <div className="flex gap-2">
            <Popover open={openExpense} onOpenChange={setOpenExpense}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={openExpense}
                  className="justify-between flex-1"
                  disabled={!canEdit('name')}
                >
                  {formData.name || 'Chọn chi phí...'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Tìm chi phí..." />
                  <CommandList>
                    <CommandEmpty>Không tìm thấy chi phí.</CommandEmpty>
                    <CommandGroup>
                      {detailedExpenses.map((exp) => (
                        <CommandItem
                          key={exp.id}
                          value={exp.name}
                          onSelect={() => {
                            const today = new Date().toISOString().split('T')[0];
                            const nextExpense = {
                              ...formData,
                              ...(canEdit('name') ? { name: exp.name } : {}),
                              ...(canEdit('price') ? { price: exp.price } : {}),
                              ...(canEdit('date') ? { date: formData.date || tour?.endDate || today } : {}),
                            };
                            onChange(normalizeWaterExpenseLine(nextExpense, tourGuests, tourDays));
                            setOpenExpense(false);
                          }}
                        >
                          <Check className={cn('mr-2 h-4 w-4', formData.name === exp.name ? 'opacity-100' : 'opacity-0')} />
                          {exp.name} ({formatCurrency(exp.price)})
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <Button type="button" variant="outline" size="icon" onClick={onOpenNewDialog} disabled={!canEdit('name')} title="Thêm loại chi phí mới">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          )}
          {canView('price') && (
          <CurrencyInput
            placeholder="Giá (VND)"
            value={formData.price}
            onChange={(price) => onChange({ ...formData, price })}
            disabled={!canEdit('price')}
          />
          )}
          {canView('date') && (
          <DateInput
            value={formData.date}
            onChange={(date) => onChange({ ...formData, date })}
            required
            disabled={!canEdit('date')}
          />
          )}
          {canView('quantity') && (
          <NumberInputMobile
            value={waterExpense ? tourGuests : formData.guests}
            onChange={(val) => onChange({ ...formData, guests: val })}
            min={0}
            max={waterExpense || !tourGuests ? undefined : tourGuests}
            placeholder="Số khách"
            className="w-full"
            disabled={!canEdit('quantity') || waterExpense}
          />
          )}
          {canView('quantity') && waterExpense && (
          <NumberInputMobile
            value={waterDays}
            onChange={(val) => onChange({ ...formData, guests: tourGuests, days: val ?? 0 })}
            min={0}
            step={0.5}
            placeholder="Số ngày tính nước"
            className="w-full"
            disabled={!canEdit('quantity')}
          />
          )}
          <LineEvidenceFields
            line={formData}
            onChange={onChange}
            totalGuests={tour?.totalGuests || 0}
            tourId={tourId}
            lineType="expense"
            pendingFiles={pendingFiles}
            onPendingFilesChange={onPendingFilesChange}
            access={lineFieldAccess?.evidence}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button type="submit" className="hover-scale w-full sm:w-auto" disabled={!canSubmit}>
            <Plus className="h-4 w-4 mr-2" />
            {editingIndex !== null ? 'Cập nhật' : 'Thêm'}
          </Button>
          {editingIndex !== null && (
            <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
              Hủy
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
