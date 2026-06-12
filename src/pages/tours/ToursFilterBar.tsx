import { memo, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { ChevronDown, ChevronUp, Filter, RefreshCw } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Nationality } from '@/types/master';
import type { Guide } from '@/types/master';
import { ToursFilterSearchGrid } from '@/pages/tours/ToursFilterSearchGrid';
import { ToursFilterAdvancedGrid } from '@/pages/tours/ToursFilterAdvancedGrid';
import { ToursGuideFilter } from '@/pages/tours/ToursGuideFilter';

type MonthOption = {
  value: string;
  label: string;
};

type ToursFilterBarProps = {
  topControlsExpanded: boolean;
  topCompanyFilterOpen: boolean;
  topLandOperatorFilterOpen: boolean;
  searchCode: string;
  dateRange: DateRange | undefined;
  searchCompany: string;
  searchLandOperator: string;
  guideFilter: string;
  setGuideFilter: (value: string) => void;
  guides: Guide[];
  isAdmin: boolean;
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

export const ToursFilterBar = memo(function ToursFilterBar({
  topControlsExpanded,
  topCompanyFilterOpen,
  topLandOperatorFilterOpen,
  searchCode,
  dateRange,
  searchCompany,
  searchLandOperator,
  guideFilter,
  setGuideFilter,
  guides,
  isAdmin,
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
}: ToursFilterBarProps) {
  const [searchExpanded, setSearchExpanded] = useState(() => {
    const saved = localStorage.getItem('tours.searchExpanded');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [filtersExpanded, setFiltersExpanded] = useState(() => {
    const saved = localStorage.getItem('tours.filtersExpanded');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => { localStorage.setItem('tours.searchExpanded', JSON.stringify(searchExpanded)); }, [searchExpanded]);
  useEffect(() => { localStorage.setItem('tours.filtersExpanded', JSON.stringify(filtersExpanded)); }, [filtersExpanded]);

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
    <div className="space-y-1.5 sm:space-y-3">
      {/* Search section — independently collapsible on mobile */}
      <div className="flex items-center gap-2 sm:hidden">
        <h2 className="text-xs font-semibold flex items-center gap-1">
          <Filter className="h-3 w-3" />
          Tìm kiếm
        </h2>
        <Button variant="ghost" size="sm" onClick={() => setSearchExpanded(!searchExpanded)} className="ml-auto h-7 w-7 p-0">
          {searchExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>
      </div>
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 ${searchExpanded ? '' : 'hidden sm:grid'}`}>
        <ToursFilterSearchGrid
          searchCode={searchCode} setSearchCode={setSearchCode}
          dateRange={dateRange} setDateRange={setDateRange}
          searchCompany={searchCompany} setSearchCompany={setSearchCompany}
          topCompanyFilterOpen={topCompanyFilterOpen} setTopCompanyFilterOpen={setTopCompanyFilterOpen} topCompanyOptions={topCompanyOptions}
          searchLandOperator={searchLandOperator} setSearchLandOperator={setSearchLandOperator}
          topLandOperatorFilterOpen={topLandOperatorFilterOpen} setTopLandOperatorFilterOpen={setTopLandOperatorFilterOpen} topLandOperatorOptions={topLandOperatorOptions}
        />
      </div>

      {/* Guide filter — admin only, respects search collapse on mobile */}
      {isAdmin && (
        <div className={`${searchExpanded ? '' : 'hidden sm:block'}`}>
          <ToursGuideFilter
            guideFilter={guideFilter}
            setGuideFilter={setGuideFilter}
            guides={guides}
          />
        </div>
      )}

      {/* Filter section — independently collapsible on mobile */}
      <div className="flex items-center gap-2 sm:hidden">
        <h2 className="text-xs font-semibold flex items-center gap-1">
          <Filter className="h-3 w-3" />
          Bộ lọc nâng cao
          {hasActiveFilters && <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">Đang lọc</Badge>}
        </h2>
        <Button variant="ghost" size="sm" onClick={() => setFiltersExpanded(!filtersExpanded)} className="ml-auto h-7 w-7 p-0">
          {filtersExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>
      </div>
      <div className={`${filtersExpanded ? 'max-h-[60vh] overflow-y-auto sm:max-h-none sm:overflow-visible pr-1' : 'hidden sm:block'}`}>
        <ToursFilterAdvancedGrid
          settlementStatusFilter={settlementStatusFilter} setSettlementStatusFilter={setSettlementStatusFilter}
          paymentStatusFilter={paymentStatusFilter} setPaymentStatusFilter={setPaymentStatusFilter}
          shoppingCommissionFilter={shoppingCommissionFilter} setShoppingCommissionFilter={setShoppingCommissionFilter}
          nationalityFilter={nationalityFilter} setNationalityFilter={setNationalityFilter} nationalities={nationalities}
          selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} months={months}
          selectedYear={selectedYear} setSelectedYear={setSelectedYear} availableYears={availableYears}
          sortBy={sortBy} setSortBy={setSortBy}
          toursCount={toursCount} hasActiveFilters={hasActiveFilters} clearFilters={clearFilters}
        />
      </div>
    </div>
  );
});
