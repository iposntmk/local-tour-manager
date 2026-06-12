import { memo, type Dispatch, type SetStateAction } from 'react';
import { Calendar as CalendarIcon, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SearchInput } from '@/components/master/SearchInput';

type Props = {
  searchCode: string;
  setSearchCode: (v: string) => void;
  dateRange: DateRange | undefined;
  setDateRange: Dispatch<SetStateAction<DateRange | undefined>>;
  searchCompany: string;
  setSearchCompany: (v: string) => void;
  topCompanyFilterOpen: boolean;
  setTopCompanyFilterOpen: Dispatch<SetStateAction<boolean>>;
  topCompanyOptions: string[];
  searchLandOperator: string;
  setSearchLandOperator: (v: string) => void;
  topLandOperatorFilterOpen: boolean;
  setTopLandOperatorFilterOpen: Dispatch<SetStateAction<boolean>>;
  topLandOperatorOptions: string[];
};

export const ToursFilterSearchGrid = memo(function ToursFilterSearchGrid({
  searchCode, setSearchCode, dateRange, setDateRange,
  searchCompany, setSearchCompany, topCompanyFilterOpen, setTopCompanyFilterOpen, topCompanyOptions,
  searchLandOperator, setSearchLandOperator, topLandOperatorFilterOpen, setTopLandOperatorFilterOpen, topLandOperatorOptions,
}: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
      <SearchInput value={searchCode} onChange={setSearchCode} placeholder="Tìm kiếm mã tour..." />
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={`w-full justify-start text-left font-normal h-10 ${!dateRange?.from && !dateRange?.to ? 'text-muted-foreground' : ''}`}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>{format(dateRange.from, 'dd/MM/yyyy')} - {format(dateRange.to, 'dd/MM/yyyy')}</>
              ) : (
                format(dateRange.from, 'dd/MM/yyyy')
              )
            ) : (
              <span>Chọn khoảng thời gian</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={1} initialFocus />
          {(dateRange?.from || dateRange?.to) && (
            <div className="border-t p-3">
              <Button variant="ghost" className="w-full" onClick={() => setDateRange(undefined)}>
                <X className="h-4 w-4 mr-2" />
                Xóa ngày
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
      <Popover open={topCompanyFilterOpen} onOpenChange={setTopCompanyFilterOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className={`w-full justify-start text-left font-normal h-10 ${!searchCompany ? 'text-muted-foreground' : ''}`} title={searchCompany || 'Tìm kiếm công ty...'}>
            <span className="truncate">{searchCompany || 'Tìm kiếm công ty...'}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[260px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Tìm công ty..." />
            <CommandList>
              <CommandEmpty>Không tìm thấy công ty.</CommandEmpty>
              <CommandGroup>
                <CommandItem value="__all_companies__" onSelect={() => { setSearchCompany(''); setTopCompanyFilterOpen(false); }}>
                  <Check className={`mr-2 h-4 w-4 ${searchCompany ? 'opacity-0' : 'opacity-100'}`} />
                  Tất cả công ty
                </CommandItem>
                {topCompanyOptions.map((company) => (
                  <CommandItem key={company} value={company} onSelect={() => { setSearchCompany(company); setTopCompanyFilterOpen(false); }}>
                    <Check className={`mr-2 h-4 w-4 ${searchCompany === company ? 'opacity-100' : 'opacity-0'}`} />
                    <span className="truncate">{company}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Popover open={topLandOperatorFilterOpen} onOpenChange={setTopLandOperatorFilterOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className={`w-full justify-start text-left font-normal h-10 ${!searchLandOperator ? 'text-muted-foreground' : ''}`} title={searchLandOperator || 'Tìm land tour...'}>
            <span className="truncate">{searchLandOperator || 'Tìm land tour...'}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[260px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Tìm land tour..." />
            <CommandList>
              <CommandEmpty>Không tìm thấy công ty land tour.</CommandEmpty>
              <CommandGroup>
                <CommandItem value="__all_land_operators__" onSelect={() => { setSearchLandOperator(''); setTopLandOperatorFilterOpen(false); }}>
                  <Check className={`mr-2 h-4 w-4 ${searchLandOperator ? 'opacity-0' : 'opacity-100'}`} />
                  Tất cả land tour
                </CommandItem>
                {topLandOperatorOptions.map((name) => (
                  <CommandItem key={name} value={name} onSelect={() => { setSearchLandOperator(name); setTopLandOperatorFilterOpen(false); }}>
                    <Check className={`mr-2 h-4 w-4 ${searchLandOperator === name ? 'opacity-100' : 'opacity-0'}`} />
                    <span className="truncate">{name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
});
