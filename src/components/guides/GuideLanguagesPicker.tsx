import { useMemo, useState } from 'react';
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
import { cn } from '@/lib/utils';
import type { Language } from '@/types/master';

interface GuideLanguagesPickerProps {
  languages: Language[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

export function GuideLanguagesPicker({
  languages,
  value,
  onChange,
  placeholder = 'Chọn ngôn ngữ...',
}: GuideLanguagesPickerProps) {
  const [open, setOpen] = useState(false);
  const selectedIds = useMemo(() => new Set(value), [value]);

  const buttonLabel = (() => {
    if (value.length === 0) return placeholder;

    const selectedLanguages = value
      .map((id) => languages.find((language) => language.id === id))
      .filter((language): language is Language => Boolean(language));

    if (selectedLanguages.length <= 2) {
      return selectedLanguages.map((language) => language.name).join(', ');
    }

    return `${selectedLanguages.length} ngôn ngữ`;
  })();

  const toggleLanguage = (language: Language) => {
    if (selectedIds.has(language.id)) {
      onChange(value.filter((id) => id !== language.id));
      return;
    }

    onChange([...value, language.id]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          className="w-full justify-between"
        >
          <span className="truncate">{buttonLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Tìm ngôn ngữ..." />
          <CommandList>
            <CommandEmpty>Không tìm thấy ngôn ngữ.</CommandEmpty>
            <CommandGroup>
              {languages.map((language) => {
                const checked = selectedIds.has(language.id);
                const label = language.nativeName && language.nativeName !== language.name
                  ? `${language.name} - ${language.nativeName}`
                  : language.name;

                return (
                  <CommandItem
                    key={language.id}
                    value={`${language.name} ${language.code} ${language.nativeName || ''}`}
                    onSelect={() => toggleLanguage(language)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        checked ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span className="truncate">{label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
