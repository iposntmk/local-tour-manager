import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Check, ChevronsUpDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency-utils';
import { CurrencyInput } from '@/components/ui/currency-input';
import { DateInput } from '@/components/ui/date-input';
import {
  TOUR_LINE_ACTIONS,
  TOUR_LINE_CANCEL_BUTTON,
  TOUR_LINE_COMBOBOX_POPOVER,
  TOUR_LINE_COMPACT_INPUT,
  TOUR_LINE_FIELDS,
  TOUR_LINE_FORM,
  TOUR_LINE_FORM_CARD,
  TOUR_LINE_FORM_TITLE,
  TOUR_LINE_SELECTOR_ADD_BUTTON,
  TOUR_LINE_SELECTOR_ROW,
  TOUR_LINE_SUBMIT_BUTTON,
} from '@/lib/tab-styles';
import type { Shopping } from '@/types/tour';
import type { Shopping as MasterShopping } from '@/types/master';
import { getNetCommission } from '@/lib/shopping-commission-utils';

interface ShoppingFormProps {
  formData: Shopping;
  onChange: (data: Shopping) => void;
  editingIndex: number | null;
  tour?: { startDate?: string } | null;
  shoppingItems: MasterShopping[];
  formReceiveFull: boolean;
  formCashPayment: boolean;
  onFormReceiveFullChange: (checked: boolean) => void;
  onFormCashPaymentChange: (checked: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  onOpenNewDialog: () => void;
  isPendingAdd: boolean;
  isPendingClear: boolean;
}

export function ShoppingForm({
  formData,
  onChange,
  editingIndex,
  tour,
  shoppingItems,
  formReceiveFull,
  formCashPayment,
  onFormReceiveFullChange,
  onFormCashPaymentChange,
  onSubmit,
  onCancel,
  onOpenNewDialog,
  isPendingAdd,
  isPendingClear,
}: ShoppingFormProps) {
  const [openShopping, setOpenShopping] = useState(false);

  useEffect(() => {
    if (editingIndex !== null) {
      const timer = setTimeout(() => setOpenShopping(true), 100);
      return () => clearTimeout(timer);
    }
  }, [editingIndex]);

  const updateCommission = (patch: Partial<Shopping>, opts?: { manualPitAmount?: boolean }) => {
    const next = { ...formData, ...patch };
    const shouldAutoCalc = !opts?.manualPitAmount && (patch.price !== undefined || patch.pitRate !== undefined || patch.withholdsPit !== undefined);
    const pitAmount = next.withholdsPit
      ? shouldAutoCalc
        ? Math.round((next.price || 0) * (next.pitRate || 0))
        : (next.pitAmount ?? Math.round((next.price || 0) * (next.pitRate || 0)))
      : 0;
    onChange({ ...next, pitAmount, netCommission: Math.max(0, (next.price || 0) - pitAmount) });
  };

  return (
    <form onSubmit={onSubmit} className={`${TOUR_LINE_FORM_CARD} ${TOUR_LINE_FORM}`}>
      <h3 className={TOUR_LINE_FORM_TITLE}>
        {editingIndex !== null ? 'Chỉnh sửa mục mua sắm' : 'Thêm mục mua sắm'}
      </h3>
      <div className={TOUR_LINE_FIELDS}>
        <div>
          <label className="text-sm font-medium mb-2 block">Mục mua sắm *</label>
          <div className={TOUR_LINE_SELECTOR_ROW}>
            <Popover open={openShopping} onOpenChange={setOpenShopping}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" role="combobox" className="flex-1 justify-between">
                  {formData.name || 'Chọn mục mua sắm...'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className={TOUR_LINE_COMBOBOX_POPOVER}>
                <Command>
                  <CommandInput placeholder="Tìm mục mua sắm..." />
                  <CommandEmpty>Không tìm thấy mục mua sắm.</CommandEmpty>
                  <CommandList>
                    <CommandGroup>
                      {shoppingItems.map((item) => (
                        <CommandItem
                          key={item.id}
                          value={item.name}
                          onSelect={() => {
                            const nextPrice = item.price || formData.price;
                            const nextPitAmount = item.withholdsPit ? Math.round(nextPrice * (item.pitRate || 0)) : 0;
                            onChange({
                              ...formData,
                              name: item.name,
                              price: nextPrice,
                              withholdsPit: item.withholdsPit,
                              pitRate: item.pitRate,
                              pitAmount: nextPitAmount,
                              netCommission: Math.max(0, nextPrice - nextPitAmount),
                            });
                            setOpenShopping(false);
                          }}
                        >
                          <Check className={cn('mr-2 h-4 w-4', formData.name === item.name ? 'opacity-100' : 'opacity-0')} />
                          {item.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <Button type="button" variant="outline" size="icon" onClick={onOpenNewDialog} title="Thêm mục mua sắm mới" className={TOUR_LINE_SELECTOR_ADD_BUTTON}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Hoa hồng gộp *</label>
          <CurrencyInput value={formData.price} onChange={(value) => updateCommission({ price: value })} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex items-center gap-2 rounded-md border p-3 text-sm font-medium">
            <Checkbox checked={!!formData.withholdsPit} onCheckedChange={(v) => updateCommission({ withholdsPit: v === true })} />
            Trừ thuế TNCN
          </label>
          <div>
            <label className="text-sm font-medium mb-2 block">Tỷ lệ thuế (%)</label>
            <Input
              type="number" min="0" step="0.01"
              disabled={!formData.withholdsPit}
              value={formData.pitRate !== undefined ? formData.pitRate * 100 : ''}
              onChange={(e) => {
                const value = e.target.value === '' ? undefined : Number(e.target.value) / 100;
                const pitAmount = formData.withholdsPit ? Math.round((formData.price || 0) * (value || 0)) : 0;
                onChange({ ...formData, pitRate: value, pitAmount, netCommission: Math.max(0, (formData.price || 0) - pitAmount) });
              }}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Tiền thuế</label>
            <CurrencyInput value={formData.pitAmount || 0} onChange={(value) => updateCommission({ pitAmount: value }, { manualPitAmount: true })} />
          </div>
        </div>
        <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
          Hoa hồng thực nhận: <span className="font-semibold">{formatCurrency(getNetCommission(formData))}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 rounded-md border p-3 text-sm font-medium">
            <Checkbox checked={formCashPayment} onCheckedChange={(v) => onFormCashPaymentChange(v === true)} />
            Tiền mặt
          </label>
          <label className="flex items-center gap-2 rounded-md border p-3 text-sm font-medium">
            <Checkbox
              checked={formReceiveFull}
              disabled={getNetCommission(formData) <= 0 || isPendingAdd || isPendingClear}
              onCheckedChange={(v) => onFormReceiveFullChange(v === true)}
            />
            Nhận đủ
          </label>
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Ngày *</label>
          <DateInput value={formData.date} onChange={(value) => onChange({ ...formData, date: value })} size="sm" className={TOUR_LINE_COMPACT_INPUT} />
        </div>
      </div>
      <div className={TOUR_LINE_ACTIONS}>
        <Button type="submit" className={TOUR_LINE_SUBMIT_BUTTON}>
          {editingIndex !== null ? (
            <><Check className="h-4 w-4 mr-2" />Cập nhật</>
          ) : (
            <><Plus className="h-4 w-4 mr-2" />Thêm</>
          )}
        </Button>
        {editingIndex !== null && (
          <Button type="button" variant="outline" onClick={onCancel} className={TOUR_LINE_CANCEL_BUTTON}>Hủy</Button>
        )}
      </div>
    </form>
  );
}
