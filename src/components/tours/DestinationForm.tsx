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
import { toast } from 'sonner';
import type { Destination, Tour } from '@/types/tour';
import type { TouristDestination } from '@/types/master';

interface DestinationFormProps {
  formData: Destination;
  onChange: (data: Destination) => void;
  editingIndex: number | null;
  tour?: Tour | null;
  touristDestinations: TouristDestination[];
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  onOpenNewDialog: () => void;
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
}: DestinationFormProps) {
  const [openDestination, setOpenDestination] = useState(false);

  useEffect(() => {
    if (editingIndex !== null) {
      const timer = setTimeout(() => setOpenDestination(true), 100);
      return () => clearTimeout(timer);
    }
  }, [editingIndex]);

  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="text-lg font-semibold mb-4">
        {editingIndex !== null ? 'Chỉnh sửa điểm đến' : 'Thêm điểm đến'}
      </h3>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-3">
          <div className="flex gap-2">
            <Popover open={openDestination} onOpenChange={setOpenDestination}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={openDestination}
                  className="flex-1 justify-between"
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
                              name: dest.name,
                              price: dest.price,
                              date: formData.date || tour?.startDate || today,
                              guests: formData.guests ?? (tour?.totalGuests || undefined),
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
            <Button type="button" variant="outline" size="icon" onClick={onOpenNewDialog} title="Thêm điểm đến mới">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <CurrencyInput
            placeholder="Giá (VND)"
            value={formData.price}
            onChange={(price) => onChange({ ...formData, price })}
          />
          <DateInput
            value={formData.date}
            onChange={(date) => onChange({ ...formData, date })}
            required
          />
          <NumberInputMobile
            value={formData.guests}
            onChange={(val) => {
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
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" className="hover-scale">
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
