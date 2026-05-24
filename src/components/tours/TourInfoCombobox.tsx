import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn, getRequiredFieldClasses } from '@/lib/utils';
import type React from 'react';

interface TourInfoComboboxProps {
  label: string;
  required?: boolean;
  items: { id: string; name: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  canCreate?: boolean;
  onOpenNewDialog?: () => void;
  createButtonTitle?: string;
  children?: React.ReactNode;
}

export function TourInfoCombobox({
  label,
  required,
  items,
  selectedId,
  onSelect,
  open,
  onOpenChange,
  placeholder,
  searchPlaceholder,
  emptyText,
  canCreate,
  onOpenNewDialog,
  createButtonTitle,
  children,
}: TourInfoComboboxProps) {
  const selectedItem = items.find((i) => i.id === selectedId);

  return (
    <div className="space-y-2">
      <Label>{label}{required && ' *'}</Label>
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={onOpenChange}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              className={cn('min-w-0 flex-1 justify-between', required && getRequiredFieldClasses(!selectedId))}
            >
              <span className="truncate">{selectedItem ? selectedItem.name : placeholder}</span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0">
            <Command>
              <CommandInput placeholder={searchPlaceholder} />
              <CommandList>
                <CommandEmpty>{emptyText}</CommandEmpty>
                <CommandGroup>
                  {items.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={item.name}
                      onSelect={() => { onSelect(item.id); onOpenChange(false); }}
                    >
                      <Check className={cn('mr-2 h-4 w-4', selectedId === item.id ? 'opacity-100' : 'opacity-0')} />
                      {item.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {canCreate && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            title={createButtonTitle}
            aria-label={createButtonTitle}
            onClick={onOpenNewDialog}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>
      {children}
    </div>
  );
}
