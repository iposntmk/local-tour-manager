import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { ArrowUpDown, Calendar as CalendarIcon, Check, ChevronDown, ChevronUp, Filter, RefreshCw, X } from 'lucide-react';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SearchInput } from '@/components/master/SearchInput';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Nationality } from '@/types/master';

type MonthOption = {
  value: string;
  label: string;
};

type ToursFilterBarProps = {
  topControlsExpanded: boolean;
  searchExpanded: boolean;
  filtersExpanded: boolean;
  topCompanyFilterOpen: boolean;
  topLandOperatorFilterOpen: boolean;
  searchCode: string;
  dateRange: DateRange | undefined;
  searchCompany: string;
  searchLandOperator: string;
  settlementStatusFilter: string;
  paymentStatusFilter: string;
  shoppingCommissionFilter: string;
  nationalityFilter: string;
  selectedMonth: string;
  selectedYear: string;
  sortBy: string;
  topCompanyOptions: string[];
  topLandOperatorOptions: string[];
  nationalities: Nationality[];
  months: MonthOption[];
  availableYears: number[];
  toursCount: number;
  hasActiveFilters: boolean;
  showToursBackgroundRefresh: boolean;
  setSearchExpanded: Dispatch<SetStateAction<boolean>>;
  setFiltersExpanded: Dispatch<SetStateAction<boolean>>;
  setTopCompanyFilterOpen: Dispatch<SetStateAction<boolean>>;
  setTopLandOperatorFilterOpen: Dispatch<SetStateAction<boolean>>;
  setSearchCode: (value: string) => void;
  setDateRange: Dispatch<SetStateAction<DateRange | undefined>>;
  setSearchCompany: (value: string) => void;
  setSearchLandOperator: (value: string) => void;
  setSettlementStatusFilter: (value: string) => void;
  setPaymentStatusFilter: (value: string) => void;
  setShoppingCommissionFilter: (value: string) => void;
  setNationalityFilter: (value: string) => void;
  setSelectedMonth: (value: string) => void;
  setSelectedYear: (value: string) => void;
  setSortBy: (value: string) => void;
  clearFilters: () => void;
};

export const ToursFilterBar = ({
  topControlsExpanded,
  searchExpanded,
  filtersExpanded,
  topCompanyFilterOpen,
  topLandOperatorFilterOpen,
  searchCode,
  dateRange,
  searchCompany,
  searchLandOperator,
  settlementStatusFilter,
  paymentStatusFilter,
  shoppingCommissionFilter,
  nationalityFilter,
  selectedMonth,
  selectedYear,
  sortBy,
  topCompanyOptions,
  topLandOperatorOptions,
  nationalities,
  months,
  availableYears,
  toursCount,
  hasActiveFilters,
  showToursBackgroundRefresh,
  setSearchExpanded,
  setFiltersExpanded,
  setTopCompanyFilterOpen,
  setTopLandOperatorFilterOpen,
  setSearchCode,
  setDateRange,
  setSearchCompany,
  setSearchLandOperator,
  setSettlementStatusFilter,
  setPaymentStatusFilter,
  setShoppingCommissionFilter,
  setNationalityFilter,
  setSelectedMonth,
  setSelectedYear,
  setSortBy,
  clearFilters,
}: ToursFilterBarProps) => {
  if (!topControlsExpanded) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-md border bg-background/70 px-3 py-2 text-xs sm:text-sm">
        <span className="font-medium">Đang ẩn khu vực tìm kiếm, lọc và thao tác.</span>
        <span className="text-muted-foreground">{toursCount} tour đang hiển thị</span>
        {hasActiveFilters && <Badge variant="secondary">Có bộ lọc đang áp dụng</Badge>}
        {showToursBackgroundRefresh && (
          <span className="ml-auto flex items-center gap-1.5 text-muted-foreground">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            Đang cập nhật...
          </span>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 sm:hidden mb-2">
        <h2 className="text-xs font-semibold flex items-center gap-1">
          <Filter className="h-3 w-3" />
          Tìm kiếm & Lọc
        </h2>
        <Button variant="ghost" size="sm" onClick={() => setSearchExpanded(!searchExpanded)} className="ml-auto h-7 w-7 p-0">
          {searchExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>
      </div>

      <div className={`space-y-2 sm:space-y-3 ${searchExpanded ? 'sm:block' : 'hidden sm:block'}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <SearchInput value={searchCode} onChange={setSearchCode} placeholder="Tìm kiếm mã tour..." />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={`w-full justify-start text-left font-normal h-10 ${!dateRange?.from && !dateRange?.to ? 'text-muted-foreground' : ''}`}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, 'dd/MM/yyyy')} - {format(dateRange.to, 'dd/MM/yyyy')}
                    </>
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
                    <CommandItem
                      value="__all_companies__"
                      onSelect={() => {
                        setSearchCompany('');
                        setTopCompanyFilterOpen(false);
                      }}
                    >
                      <Check className={`mr-2 h-4 w-4 ${searchCompany ? 'opacity-0' : 'opacity-100'}`} />
                      Tất cả công ty
                    </CommandItem>
                    {topCompanyOptions.map((company) => (
                      <CommandItem
                        key={company}
                        value={company}
                        onSelect={() => {
                          setSearchCompany(company);
                          setTopCompanyFilterOpen(false);
                        }}
                      >
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
                    <CommandItem
                      value="__all_land_operators__"
                      onSelect={() => {
                        setSearchLandOperator('');
                        setTopLandOperatorFilterOpen(false);
                      }}
                    >
                      <Check className={`mr-2 h-4 w-4 ${searchLandOperator ? 'opacity-0' : 'opacity-100'}`} />
                      Tất cả land tour
                    </CommandItem>
                    {topLandOperatorOptions.map((name) => (
                      <CommandItem
                        key={name}
                        value={name}
                        onSelect={() => {
                          setSearchLandOperator(name);
                          setTopLandOperatorFilterOpen(false);
                        }}
                      >
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

        <div className="space-y-2 sm:space-y-3">
          <div className="flex items-center gap-2 sm:hidden">
            <h2 className="text-xs font-semibold flex items-center gap-1">
              <Filter className="h-3 w-3" />
              Bộ lọc nâng cao
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setFiltersExpanded(!filtersExpanded)} className="ml-auto h-7 w-7 p-0">
              {filtersExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          </div>

          <div className={`${filtersExpanded ? 'block' : 'hidden sm:block'}`}>
            <div className="overflow-y-auto max-h-[55dvh] sm:overflow-visible sm:max-h-none pb-1">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-3">
                  <FilterSelect label="Trạng thái QT" icon="filter" value={settlementStatusFilter} onValueChange={setSettlementStatusFilter}>
                    <SelectItem value="all">Tất cả trạng thái</SelectItem>
                    <SelectItem value="draft">Đang soạn</SelectItem>
                    <SelectItem value="submitted">Đã gửi kế toán</SelectItem>
                    <SelectItem value="need_changes">Cần bổ sung</SelectItem>
                    <SelectItem value="approved">Đã duyệt</SelectItem>
                    <SelectItem value="closed">Đã đóng</SelectItem>
                  </FilterSelect>
                  <FilterSelect label="Thanh toán" icon="filter" value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                    <SelectItem value="all">Tất cả thanh toán</SelectItem>
                    <SelectItem value="pending">Chờ thanh toán</SelectItem>
                    <SelectItem value="partial">Thanh toán một phần</SelectItem>
                    <SelectItem value="paid">Đã thanh toán</SelectItem>
                  </FilterSelect>
                  <FilterSelect label="Hoa hồng" icon="filter" value={shoppingCommissionFilter} onValueChange={setShoppingCommissionFilter}>
                    <SelectItem value="all">Tất cả hoa hồng</SelectItem>
                    <SelectItem value="unpaid">Còn chưa nhận</SelectItem>
                    <SelectItem value="paid">Đã nhận đủ</SelectItem>
                  </FilterSelect>
                  <FilterSelect label="Quốc tịch" icon="filter" value={nationalityFilter} onValueChange={setNationalityFilter}>
                    <SelectItem value="all">Tất cả quốc tịch</SelectItem>
                    {nationalities.map((nationality) => (
                      <SelectItem key={nationality.id} value={nationality.id}>
                        {nationality.emoji} {nationality.name}
                      </SelectItem>
                    ))}
                  </FilterSelect>
                  <FilterSelect label="Tháng" icon="calendar" value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectItem value="all">Tất cả</SelectItem>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </FilterSelect>
                  <FilterSelect label="Năm" icon="calendar" value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectItem value="all">Tất cả</SelectItem>
                    {availableYears.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </FilterSelect>
                  <FilterSelect label="Sắp xếp" icon="sort" value={sortBy} onValueChange={setSortBy}>
                    <SelectItem value="startDate-desc">Ngày bắt đầu (Mới nhất)</SelectItem>
                    <SelectItem value="startDate-asc">Ngày bắt đầu (Cũ nhất)</SelectItem>
                    <SelectItem value="endDate-desc">Ngày kết thúc (Mới nhất)</SelectItem>
                    <SelectItem value="endDate-asc">Ngày kết thúc (Cũ nhất)</SelectItem>
                    <SelectItem value="tourCode-asc">Mã tour (A-Z)</SelectItem>
                    <SelectItem value="tourCode-desc">Mã tour (Z-A)</SelectItem>
                    <SelectItem value="clientName-asc">Tên khách (A-Z)</SelectItem>
                    <SelectItem value="clientName-desc">Tên khách (Z-A)</SelectItem>
                    <SelectItem value="createdAt-desc">Ngày tạo (Mới nhất)</SelectItem>
                    <SelectItem value="createdAt-asc">Ngày tạo (Cũ nhất)</SelectItem>
                  </FilterSelect>
                </div>

                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters} className="h-8 sm:h-10 sm:self-end">
                    <X className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                    Xóa bộ lọc
                  </Button>
                )}
              </div>

              {hasActiveFilters && (
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span className="text-base sm:text-lg font-semibold">Hiển thị {toursCount} tour</span>
                  {nationalityFilter !== 'all' && (
                    <Badge variant="secondary" className="text-sm font-medium">
                      {nationalities.find((nationality) => nationality.id === nationalityFilter)?.name}
                    </Badge>
                  )}
                  {selectedMonth !== 'all' && selectedYear !== 'all' && (
                    <Badge variant="default" className="text-sm sm:text-base font-semibold px-3 py-1">
                      {months.find((month) => month.value === selectedMonth)?.label} {selectedYear}
                    </Badge>
                  )}
                  {shoppingCommissionFilter !== 'all' && (
                    <Badge variant="secondary" className="text-sm font-medium">
                      {shoppingCommissionFilter === 'unpaid' ? 'Hoa hồng chưa nhận' : 'Hoa hồng đã nhận đủ'}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

type FilterSelectProps = {
  label: string;
  icon: 'filter' | 'calendar' | 'sort';
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
};

const FilterSelect = ({ label, icon, value, onValueChange, children }: FilterSelectProps) => {
  const Icon = icon === 'calendar' ? CalendarIcon : icon === 'sort' ? ArrowUpDown : Filter;

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-8 sm:h-10">
          <SelectValue placeholder="Tất cả" />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  );
};
