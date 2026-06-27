import { useState, useMemo, useDeferredValue } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Check, ChevronsUpDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency-utils';
import { CurrencyInput } from '@/components/ui/currency-input';
import { DateInput } from '@/components/ui/date-input';
import { NumberInputMobile } from '@/components/ui/number-input-mobile';
import { toast } from 'sonner';
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
import type { Destination, Tour } from '@/types/tour';
import type { TouristDestination } from '@/types/master';
import {
  canEditAnyTourLineField,
  canEditTourLineField,
  canViewTourLineField,
  type Access,
  type TourLineFieldKey,
} from '@/lib/tour-detail-permissions';

interface DestinationFormProps {
  formData: Destination;
  onChange: (data: Destination) => void;
  editingIndex: number | null;
  tour?: Tour | null;
  touristDestinations: TouristDestination[];
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  onOpenNewDialog: () => void;
  tourId?: string;
  pendingFiles: File[];
  onPendingFilesChange: (files: File[]) => void;
  lineFieldAccess?: Partial<Record<TourLineFieldKey, Access>>;
}

export function DestinationForm({
  formData,
  onChange,
  editingIndex,
  tour,
  touristDestinations,
  onSubmit,
  onCancel,
  onOpenNewDialog,
  tourId,
  pendingFiles,
  onPendingFilesChange,
  lineFieldAccess,
}: DestinationFormProps) {
  const [openDestination, setOpenDestination] = useState(false);
  const [destSearch, setDestSearch] = useState('');
  const deferredSearch = useDeferredValue(destSearch);
  const filteredDestinations = useMemo(() => {
    if (!deferredSearch.trim()) return touristDestinations;
    const q = deferredSearch.trim().toLowerCase();
    return touristDestinations.filter(
      (d) => d.name.toLowerCase().includes(q)
    );
  }, [touristDestinations, deferredSearch]);
  const canView = (field: TourLineFieldKey) => canViewTourLineField(lineFieldAccess, field);
  const canEdit = (field: TourLineFieldKey) => canEditTourLineField(lineFieldAccess, field);
  const canSubmit =
    editingIndex !== null
      ? canEditAnyTourLineField(lineFieldAccess)
      : canEdit('name') && canEdit('date') && canEdit('price');

  return (
    <div className={TOUR_LINE_FORM_CARD}>
      <h3 className={TOUR_LINE_FORM_TITLE}>
        {editingIndex !== null ? 'Chỉnh sửa điểm đến' : 'Thêm điểm đến'}
      </h3>
      <form onSubmit={onSubmit} className={TOUR_LINE_FORM}>
        <div className={TOUR_LINE_FIELDS}>
          {canView('name') && (
          <div className={TOUR_LINE_SELECTOR_ROW}>
            <Popover open={openDestination} onOpenChange={(v) => { setOpenDestination(v); if (!v) setDestSearch(''); }}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={openDestination}
                  className="flex-1 justify-between"
                  disabled={!canEdit('name')}
                >
                  {formData.name || 'Chọn điểm đến...'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className={TOUR_LINE_COMBOBOX_POPOVER} align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Tìm điểm đến..."
                    value={destSearch}
                    onValueChange={setDestSearch}
                  />
                  <CommandList>
                    <CommandEmpty>Không tìm thấy điểm đến.</CommandEmpty>
                    <CommandGroup>
                      {filteredDestinations.map((dest) => (
                        <CommandItem
                          key={dest.id}
                          value={dest.name}
                          onSelect={() => {
                            const today = new Date().toISOString().split('T')[0];
                            onChange({
                              ...formData,
                              ...(canEdit('name') ? { name: dest.name } : {}),
                              ...(canEdit('price') ? { price: dest.price } : {}),
                              ...(canEdit('date') ? { date: formData.date || tour?.startDate || today } : {}),
                              ...(canEdit('quantity') ? { guests: formData.guests ?? (tour?.totalGuests || undefined) } : {}),
                            });
                            setOpenDestination(false);
                            setDestSearch('');
                          }}
                        >
                          <Check className={cn('mr-2 h-4 w-4', formData.name === dest.name ? 'opacity-100' : 'opacity-0')} />
                          {dest.name} ({formatCurrency(dest.price)})
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <Button type="button" variant="outline" size="icon" onClick={onOpenNewDialog} disabled={!canEdit('name')} title="Thêm điểm đến mới" className={TOUR_LINE_SELECTOR_ADD_BUTTON}>
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
            <div className="flex-1 min-w-0">
              <DateInput
                value={formData.date}
                onChange={(date) => onChange({ ...formData, date })}
                required
                disabled={!canEdit('date')}
                size="sm"
                className={TOUR_LINE_COMPACT_INPUT}
              />
            </div>
            )}
            {canView('quantity') && (
            <NumberInputMobile
              value={formData.guests}
              onChange={(val) => {
                if (!canEdit('quantity')) return;
                const max = tour?.totalGuests || 0;
                if (val !== undefined && max && val > max) {
                  toast.warning(`Số khách không được vượt quá tổng khách của tour (${max}).`);
                  onChange({ ...formData, guests: max });
                } else {
                  onChange({ ...formData, guests: val });
                }
              }}
              min={0}
              max={tour?.totalGuests || 0}
              placeholder="Số khách"
              className={TOUR_LINE_COMPACT_INPUT}
              size="sm"
              disabled={!canEdit('quantity')}
            />
            )}
          </div>
          )}
          <LineEvidenceFields
            line={formData}
            onChange={onChange}
            totalGuests={tour?.totalGuests || 0}
            tourId={tourId}
            lineType="destination"
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
