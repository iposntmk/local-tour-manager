import { memo, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const MAX_VISIBLE_OPTIONS = 80;

type Props = {
  value: string;
  onChange: (value: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: string[];
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel: string;
  allLabel: string;
  allValue: string;
};

const normalizeSearchText = (value: string) =>
  value
    .trim()
    .toLocaleLowerCase('vi-VN')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');

export const TourFilterOptionCombobox = memo(function TourFilterOptionCombobox({
  value,
  onChange,
  open,
  onOpenChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  allLabel,
  allValue,
}: Props) {
  const [query, setQuery] = useState('');

  const visibleOptions = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query);
    const matchingOptions = normalizedQuery
      ? options.filter((option) => normalizeSearchText(option).includes(normalizedQuery))
      : options;

    const visible = matchingOptions.slice(0, MAX_VISIBLE_OPTIONS);
    if (value && normalizeSearchText(value).includes(normalizedQuery) && !visible.includes(value)) {
      return [value, ...visible].slice(0, MAX_VISIBLE_OPTIONS);
    }

    return visible;
  }, [options, query, value]);

  const handleSelect = (nextValue: string) => {
    onChange(nextValue);
    onOpenChange(false);
  };

  return (
    <Popover open={open} onOpenChange={(nextOpen) => { onOpenChange(nextOpen); if (!nextOpen) setQuery(''); }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`w-full justify-start text-left font-normal h-10 ${!value ? 'text-muted-foreground' : ''}`}
          title={value || placeholder}
        >
          <span className="truncate">{value || placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[260px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput value={query} onValueChange={setQuery} placeholder={searchPlaceholder} />
          <CommandList>
            {visibleOptions.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">{emptyLabel}</div>
            )}
            <CommandGroup>
              <CommandItem value={allValue} onSelect={() => handleSelect('')}>
                <Check className={`mr-2 h-4 w-4 ${value ? 'opacity-0' : 'opacity-100'}`} />
                {allLabel}
              </CommandItem>
              {visibleOptions.map((option) => (
                <CommandItem key={option} value={option} onSelect={() => handleSelect(option)}>
                  <Check className={`mr-2 h-4 w-4 ${value === option ? 'opacity-100' : 'opacity-0'}`} />
                  <span className="truncate">{option}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
});
