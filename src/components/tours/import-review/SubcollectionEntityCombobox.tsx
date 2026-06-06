import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

interface EntityComboboxProps {
  value: string | null;
  options: Array<{ id: string; name: string; price?: number }>;
  onSelect: (opt: { id: string; name: string; price?: number }) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  /** Extra entries prepended to the option list (e.g. ranked suggestions). */
  prependOptions?: Array<{ id: string; name: string; price?: number }>;
  /** Visual state for the trigger. */
  tone?: 'default' | 'success' | 'warning';
  className?: string;
}

/**
 * Searchable combobox over `options` (and optional `prependOptions`).
 * Selecting an entry calls `onSelect` with its full record. The trigger's
 * border colour reflects the `tone` prop. Used by both the mobile card
 * and desktop table row for destinations/expenses/meals/allowances.
 */
export function EntityCombobox({
  value,
  options,
  onSelect,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  emptyText = 'No item found.',
  prependOptions,
  tone = 'default',
  className,
}: EntityComboboxProps) {
  const [open, setOpen] = useState(false);

  const prependIds = new Set((prependOptions ?? []).map((o) => o.id));
  const ordered = [
    ...(prependOptions ?? []),
    ...options.filter((o) => !prependIds.has(o.id)),
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'h-7 justify-between text-xs w-full',
            tone === 'success' && 'border-green-500 bg-green-50',
            tone === 'warning' && 'border-yellow-500 bg-yellow-50',
            className,
          )}
        >
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} className="h-7 text-xs" />
          <CommandList>
            <CommandEmpty className="text-xs">{emptyText}</CommandEmpty>
            <CommandGroup>
              {ordered.map((opt) => (
                <CommandItem
                  key={opt.id}
                  value={opt.name}
                  onSelect={() => {
                    onSelect(opt);
                    setOpen(false);
                  }}
                  className="text-xs"
                >
                  <Check
                    className={cn(
                      'mr-2 h-3 w-3',
                      value === opt.name ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {opt.name}{opt.price != null ? ` (${opt.price.toLocaleString()} ₫)` : ''}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export type { EntityComboboxProps };
