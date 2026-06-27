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
  TOUR_LINE_ACTIONS,
  TOUR_LINE_CANCEL_BUTTON,
  TOUR_LINE_COMBOBOX_POPOVER,
  TOUR_LINE_COMPACT_INPUT,
  TOUR_LINE_FIELDS,
  TOUR_LINE_FORM,
  TOUR_LINE_FORM_CARD,
  TOUR_LINE_FORM_TITLE,
  TOUR_LINE_INLINE_FIELDS,
  TOUR_LINE_SELECTOR_ADD_BUTTON,
  TOUR_LINE_SELECTOR_ROW,
  TOUR_LINE_SUBMIT_BUTTON,
} from '@/lib/tab-styles';
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
    <div className={TOUR_LINE_FORM_CARD}>
      <h3 className={TOUR_LINE_FORM_TITLE}>
        {editingIndex !== null ? 'Chỉnh sửa chi phí' : 'Thêm chi phí'}
      </h3>
      <form onSubmit={onSubmit} className={TOUR_LINE_FORM}>
        <div className={TOUR_LINE_FIELDS}>
          {canView('name') && (
          <div className={TOUR_LINE_SELECTOR_ROW}>
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
              <PopoverContent className={TOUR_LINE_COMBOBOX_POPOVER} align="start">
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
            <Button type="button" variant="outline" size="icon" onClick={onOpenNewDialog} disabled={!canEdit('name')} title="Thêm loại chi phí mới" className={TOUR_LINE_SELECTOR_ADD_BUTTON}>
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
          {(canView('date') || canView('quantity')) && (
          <div className={TOUR_LINE_INLINE_FIELDS}>
            {canView('date') && (
            <DateInput
              value={formData.date}
              onChange={(date) => onChange({ ...formData, date })}
              required
              disabled={!canEdit('date')}
              size="sm"
              className={TOUR_LINE_COMPACT_INPUT}
            />
            )}
            {canView('quantity') && (
            <NumberInputMobile
              value={waterExpense ? tourGuests : formData.guests}
              onChange={(val) => onChange({ ...formData, guests: val })}
              min={0}
              max={waterExpense || !tourGuests ? undefined : tourGuests}
              placeholder="Số khách"
              className={TOUR_LINE_COMPACT_INPUT}
              size="sm"
              disabled={!canEdit('quantity') || waterExpense}
            />
            )}
          </div>
          )}
          {canView('quantity') && waterExpense && (
          <NumberInputMobile
            value={waterDays}
            onChange={(val) => onChange({ ...formData, guests: tourGuests, days: val ?? 0 })}
            min={0}
            step={0.5}
            placeholder="Số ngày tính nước"
            className={TOUR_LINE_COMPACT_INPUT}
            size="sm"
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
        <div className={TOUR_LINE_ACTIONS}>
          <Button type="submit" className={TOUR_LINE_SUBMIT_BUTTON} disabled={!canSubmit}>
            <Plus className="h-4 w-4 mr-2" />
            {editingIndex !== null ? 'Cập nhật' : 'Thêm'}
          </Button>
          {editingIndex !== null && (
            <Button type="button" variant="outline" onClick={onCancel} className={TOUR_LINE_CANCEL_BUTTON}>
              Hủy
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
