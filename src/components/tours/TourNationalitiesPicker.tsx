import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { NumberInput } from '@/components/ui/number-input';
import { cn, getRequiredFieldClasses } from '@/lib/utils';
import type { Nationality } from '@/types/master';
import type { TourNationality } from '@/types/tour';

interface TourNationalitiesPickerProps {
  nationalities: Nationality[];
  value: TourNationality[];
  onChange: (value: TourNationality[]) => void;
  totalGuests: number;
  required?: boolean;
  placeholder?: string;
}

export function TourNationalitiesPicker({
  nationalities,
  value,
  onChange,
  totalGuests,
  required = false,
  placeholder = 'Chọn quốc tịch...',
}: TourNationalitiesPickerProps) {
  const [open, setOpen] = useState(false);
  const selectedIds = useMemo(() => new Set(value.map((item) => item.id)), [value]);
  const paxTotal = value.reduce((sum, item) => sum + (Number(item.paxCount) || 0), 0);
  const hasPaxMismatch = value.length > 0 && totalGuests > 0 && paxTotal !== totalGuests;

  useEffect(() => {
    if (value.length !== 1 || totalGuests <= 0 || value[0].paxCount === totalGuests) {
      return;
    }

    onChange([{ ...value[0], paxCount: totalGuests }]);
  }, [onChange, totalGuests, value]);

  const buttonLabel = (() => {
    if (value.length === 0) return placeholder;
    if (value.length === 1) {
      const selected = nationalities.find((item) => item.id === value[0].id);
      const icon = selected?.emoji ? `${selected.emoji} ` : '';
      return `${icon}${value[0].nameAtBooking} (${value[0].paxCount} pax)`;
    }
    return `${value.length} quốc tịch - ${paxTotal}/${totalGuests || paxTotal} pax`;
  })();

  const toggleNationality = (nationality: Nationality) => {
    if (selectedIds.has(nationality.id)) {
      onChange(value.filter((item) => item.id !== nationality.id));
      return;
    }

    const remainingPax = Math.max((totalGuests || 0) - paxTotal, 0);
    const paxCount = value.length === 0 ? Math.max(totalGuests || 1, 1) : Math.max(remainingPax, 1);
    onChange([
      ...value,
      {
        id: nationality.id,
        nameAtBooking: nationality.name,
        paxCount,
      },
    ]);
  };

  const updatePaxCount = (id: string, paxCount: number) => {
    onChange(value.map((item) => (
      item.id === id
        ? { ...item, paxCount: Math.max(1, paxCount || 1) }
        : item
    )));
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            className={cn('w-full justify-between', getRequiredFieldClasses(required && value.length === 0))}
          >
            <span className="truncate">{buttonLabel}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder="Tìm quốc tịch..." />
            <CommandList>
              <CommandEmpty>Không tìm thấy quốc tịch.</CommandEmpty>
              <CommandGroup>
                {nationalities.map((nationality) => {
                  const checked = selectedIds.has(nationality.id);
                  return (
                    <CommandItem
                      key={nationality.id}
                      value={nationality.name}
                      onSelect={() => toggleNationality(nationality)}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          checked ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      {nationality.emoji} {nationality.name}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <div className="rounded-md border p-3 space-y-3">
          {value.map((item) => {
            const nationality = nationalities.find((n) => n.id === item.id);
            return (
              <div key={item.id} className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_150px] sm:gap-3">
                <div className="min-w-0 truncate text-sm font-medium">
                  {nationality?.emoji} {item.nameAtBooking}
                </div>
                <NumberInput
                  value={item.paxCount}
                  onChange={(nextValue) => updatePaxCount(item.id, nextValue)}
                  min={1}
                />
              </div>
            );
          })}
          <div className={cn('text-xs', hasPaxMismatch ? 'text-destructive' : 'text-muted-foreground')}>
            Tổng pax theo quốc tịch: {paxTotal}/{totalGuests || paxTotal}
          </div>
        </div>
      )}
    </div>
  );
}
