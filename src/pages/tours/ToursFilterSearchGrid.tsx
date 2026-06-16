import { memo, type Dispatch, type SetStateAction } from 'react';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SearchInput } from '@/components/master/SearchInput';
import { TourFilterOptionCombobox } from '@/pages/tours/TourFilterOptionCombobox';

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
      <TourFilterOptionCombobox
        value={searchCompany}
        onChange={setSearchCompany}
        open={topCompanyFilterOpen}
        onOpenChange={setTopCompanyFilterOpen}
        options={topCompanyOptions}
        placeholder="Tìm kiếm công ty..."
        searchPlaceholder="Tìm công ty..."
        emptyLabel="Không tìm thấy công ty."
        allLabel="Tất cả công ty"
        allValue="__all_companies__"
      />
      <TourFilterOptionCombobox
        value={searchLandOperator}
        onChange={setSearchLandOperator}
        open={topLandOperatorFilterOpen}
        onOpenChange={setTopLandOperatorFilterOpen}
        options={topLandOperatorOptions}
        placeholder="Tìm land tour..."
        searchPlaceholder="Tìm land tour..."
        emptyLabel="Không tìm thấy công ty land tour."
        allLabel="Tất cả land tour"
        allValue="__all_land_operators__"
      />
    </div>
  );
});
