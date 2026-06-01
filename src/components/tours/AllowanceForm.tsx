import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Check, ChevronsUpDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency-utils';
import { CurrencyInput } from '@/components/ui/currency-input';
import { DateInput } from '@/components/ui/date-input';
import { NumberInputMobile } from '@/components/ui/number-input-mobile';
import type { Allowance, Tour } from '@/types/tour';
import type { DetailedExpense } from '@/types/master';
import {
  canEditAnyTourLineField,
  canEditTourLineField,
  canViewTourLineField,
  type Access,
  type TourLineFieldKey,
} from '@/lib/tour-detail-permissions';

interface AllowanceFormProps {
  formData: Allowance;
  onChange: (data: Allowance) => void;
  editingIndex: number | null;
  tour?: Tour | null;
  detailedExpenses: DetailedExpense[];
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  onOpenNewDialog: () => void;
  lineFieldAccess?: Partial<Record<TourLineFieldKey, Access>>;
}

export function AllowanceForm({
  formData,
  onChange,
  editingIndex,
  tour,
  detailedExpenses,
  onSubmit,
  onCancel,
  onOpenNewDialog,
  lineFieldAccess,
}: AllowanceFormProps) {
  const [openExpense, setOpenExpense] = useState(false);
  const canView = (field: TourLineFieldKey) => canViewTourLineField(lineFieldAccess, field);
  const canEdit = (field: TourLineFieldKey) => canEditTourLineField(lineFieldAccess, field);
  const canSubmit =
    editingIndex !== null
      ? canEditAnyTourLineField(lineFieldAccess, ['name', 'price', 'date', 'quantity'])
      : canEdit('name') && canEdit('date') && canEdit('price');

  useEffect(() => {
    if (editingIndex !== null) {
      const timer = setTimeout(() => setOpenExpense(true), 100);
      return () => clearTimeout(timer);
    }
  }, [editingIndex]);

  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="text-lg font-semibold mb-4">
        {editingIndex !== null ? 'Chỉnh sửa CTP' : 'Thêm CTP'}
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
                  className="min-w-0 flex-1 justify-between"
                  disabled={!canEdit('name')}
                >
                  <span className="truncate">{formData.name || 'Chọn CTP...'}</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Tìm CTP..." />
                  <CommandList>
                    <CommandEmpty>Không tìm thấy CTP.</CommandEmpty>
                    <CommandGroup>
                      {detailedExpenses.map((exp) => {
                        const categoryLabel = exp.categoryRef?.nameAtBooking || 'Khác';
                        return (
                          <CommandItem
                            key={exp.id}
                            value={`${exp.name} ${categoryLabel}`}
                            onSelect={() => {
                              const today = new Date().toISOString().split('T')[0];
                              onChange({
                                ...formData,
                                ...(canEdit('name') ? { name: exp.name } : {}),
                                ...(canEdit('price') ? { price: exp.price } : {}),
                                ...(canEdit('date') ? { date: formData.date || tour?.startDate || today } : {}),
                                ...(canEdit('quantity') ? { quantity: formData.quantity || 1 } : {}),
                                categoryId: exp.categoryRef?.id,
                              });
                              setOpenExpense(false);
                            }}
                          >
                            <Check className={cn('mr-2 h-4 w-4', formData.name === exp.name ? 'opacity-100' : 'opacity-0')} />
                            <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                              <span className="truncate">{exp.name}</span>
                              <span className="shrink-0 text-xs text-muted-foreground">
                                {categoryLabel} · {formatCurrency(exp.price)}
                              </span>
                            </span>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <Button type="button" variant="outline" size="icon" title="Thêm CTP" aria-label="Thêm CTP" onClick={onOpenNewDialog} disabled={!canEdit('name')}>
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
            value={formData.quantity || 1}
            onChange={(val) => onChange({ ...formData, quantity: val || 1 })}
            min={1}
            placeholder="Số lượng"
            className="w-full"
            disabled={!canEdit('quantity')}
          />
          )}
        </div>
        <div className="flex gap-2">
          <Button type="submit" className="hover-scale flex-1" disabled={!canSubmit}>
            <Plus className="h-4 w-4 mr-2" />
            {editingIndex !== null ? 'Cập nhật' : 'Thêm'}
          </Button>
          {editingIndex !== null && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Hủy
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
