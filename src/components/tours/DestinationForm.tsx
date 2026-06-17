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
import { toast } from 'sonner';
import { LineEvidenceFields } from '@/components/tours/LineEvidenceFields';
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
  const canView = (field: TourLineFieldKey) => canViewTourLineField(lineFieldAccess, field);
  const canEdit = (field: TourLineFieldKey) => canEditTourLineField(lineFieldAccess, field);
  const canSubmit =
    editingIndex !== null
      ? canEditAnyTourLineField(lineFieldAccess)
      : canEdit('name') && canEdit('date') && canEdit('price');

  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="text-lg font-semibold mb-4">
        {editingIndex !== null ? 'Chỉnh sửa điểm đến' : 'Thêm điểm đến'}
      </h3>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-3">
          {canView('name') && (
          <div className="flex gap-2">
            <Popover open={openDestination} onOpenChange={setOpenDestination}>
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
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Tìm điểm đến..." />
                  <CommandList>
                    <CommandEmpty>Không tìm thấy điểm đến.</CommandEmpty>
                    <CommandGroup>
                      {touristDestinations.map((dest) => (
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
            <Button type="button" variant="outline" size="icon" onClick={onOpenNewDialog} disabled={!canEdit('name')} title="Thêm điểm đến mới">
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
            className="w-full"
            disabled={!canEdit('quantity')}
          />
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
        <div className="flex gap-2">
          <Button type="submit" className="hover-scale" disabled={!canSubmit}>
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
