import { memo, useState } from 'react';
import { Check, ChevronsUpDown, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Guide } from '@/types/master';

type Props = {
  guideFilter: string;
  setGuideFilter: (v: string) => void;
  guides: Guide[];
};

export const ToursGuideFilter = memo(function ToursGuideFilter({
  guideFilter,
  setGuideFilter,
  guides,
}: Props) {
  const [open, setOpen] = useState(false);
  const selectedGuide = guides.find((g) => g.id === guideFilter);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-start text-left font-normal h-10"
        >
          <User className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate">
            {selectedGuide ? selectedGuide.name : 'Tất cả hướng dẫn viên'}
          </span>
          <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[260px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Tìm hướng dẫn viên..." />
          <CommandList>
            <CommandEmpty>Không tìm thấy HDV.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__all_guides__"
                onSelect={() => {
                  setGuideFilter('all');
                  setOpen(false);
                }}
              >
                <Check className={`mr-2 h-4 w-4 ${guideFilter === 'all' ? 'opacity-100' : 'opacity-0'}`} />
                Tất cả hướng dẫn viên
              </CommandItem>
              {guides.map((guide) => (
                <CommandItem
                  key={guide.id}
                  value={guide.name}
                  onSelect={() => {
                    setGuideFilter(guide.id);
                    setOpen(false);
                  }}
                >
                  <Check className={`mr-2 h-4 w-4 ${guideFilter === guide.id ? 'opacity-100' : 'opacity-0'}`} />
                  <span className="truncate">{guide.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
});
