import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import type { Tour, TourQuery } from '@/types/tour';

type CompanyOption = {
  name?: string | null;
};

const loadDateRange = (): DateRange | undefined => {
  const saved = localStorage.getItem('tours.search.dateRange');
  if (!saved) return undefined;

  try {
    const parsed = JSON.parse(saved) as { from?: string; to?: string };
    return {
      from: parsed.from ? new Date(parsed.from) : undefined,
      to: parsed.to ? new Date(parsed.to) : undefined,
    };
  } catch (error) {
    console.warn('Invalid tour date range filter', error);
    return undefined;
  }
};

export const TOUR_MONTHS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

export const useTourFilters = (tours: Tour[], companies: CompanyOption[]) => {
  const [searchCode, setSearchCode] = useState(() => localStorage.getItem('tours.search.code') || '');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(loadDateRange);
  const [searchCompany, setSearchCompany] = useState(() => localStorage.getItem('tours.search.company') || '');
  const [nationalityFilter, setNationalityFilter] = useState<string>(() => localStorage.getItem('tours.nationalityFilter') || 'all');
  const [settlementStatusFilter, setSettlementStatusFilter] = useState<string>(() => localStorage.getItem('tours.settlementStatusFilter') || 'all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>(() => localStorage.getItem('tours.paymentStatusFilter') || 'all');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => localStorage.getItem('tours.selectedMonth') || 'all');
  const [selectedYear, setSelectedYear] = useState<string>(() => {
    const saved = localStorage.getItem('tours.selectedYear');
    if (!saved || saved === 'all') {
      const currentYear = new Date().getFullYear().toString();
      localStorage.setItem('tours.selectedYear', currentYear);
      return currentYear;
    }
    return saved;
  });
  const [sortBy, setSortBy] = useState<string>(() => localStorage.getItem('tours.sortBy') || 'startDate-asc');
  const [filtersExpanded, setFiltersExpanded] = useState(() => {
    const saved = localStorage.getItem('tours.filtersExpanded');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [searchExpanded, setSearchExpanded] = useState(() => {
    const saved = localStorage.getItem('tours.searchExpanded');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [topControlsExpanded, setTopControlsExpanded] = useState(() => {
    const saved = localStorage.getItem('tours.topControlsExpanded');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [topCompanyFilterOpen, setTopCompanyFilterOpen] = useState(false);

  useEffect(() => { localStorage.setItem('tours.search.code', searchCode); }, [searchCode]);
  useEffect(() => { localStorage.setItem('tours.search.dateRange', JSON.stringify(dateRange || {})); }, [dateRange]);
  useEffect(() => { localStorage.setItem('tours.search.company', searchCompany); }, [searchCompany]);
  useEffect(() => { localStorage.setItem('tours.nationalityFilter', nationalityFilter); }, [nationalityFilter]);
  useEffect(() => { localStorage.setItem('tours.settlementStatusFilter', settlementStatusFilter); }, [settlementStatusFilter]);
  useEffect(() => { localStorage.setItem('tours.paymentStatusFilter', paymentStatusFilter); }, [paymentStatusFilter]);
  useEffect(() => { localStorage.setItem('tours.selectedMonth', selectedMonth); }, [selectedMonth]);
  useEffect(() => { localStorage.setItem('tours.selectedYear', selectedYear); }, [selectedYear]);
  useEffect(() => { localStorage.setItem('tours.sortBy', sortBy); }, [sortBy]);
  useEffect(() => { localStorage.setItem('tours.filtersExpanded', JSON.stringify(filtersExpanded)); }, [filtersExpanded]);
  useEffect(() => { localStorage.setItem('tours.searchExpanded', JSON.stringify(searchExpanded)); }, [searchExpanded]);
  useEffect(() => { localStorage.setItem('tours.topControlsExpanded', JSON.stringify(topControlsExpanded)); }, [topControlsExpanded]);

  const baseTourQuery = useMemo((): TourQuery => {
    const query: TourQuery = {};
    const code = searchCode.trim();
    const company = searchCompany.trim();

    if (code) query.tourCodeLike = code;
    if (dateRange?.from) query.startDate = format(dateRange.from, 'yyyy-MM-dd');
    if (dateRange?.to) query.endDate = format(dateRange.to, 'yyyy-MM-dd');
    if (company) query.companyNameLike = company;
    if (nationalityFilter !== 'all') query.nationalityId = nationalityFilter;
    if (settlementStatusFilter !== 'all') query.settlementStatus = settlementStatusFilter as TourQuery['settlementStatus'];
    if (paymentStatusFilter !== 'all') query.paymentStatus = paymentStatusFilter as TourQuery['paymentStatus'];

    if (!dateRange?.from && !dateRange?.to && selectedMonth !== 'all' && selectedYear !== 'all') {
      const year = Number(selectedYear);
      const month = Number(selectedMonth);
      if (!Number.isNaN(year) && !Number.isNaN(month)) {
        const monthStr = String(month).padStart(2, '0');
        query.startDate = `${year}-${monthStr}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        query.endDate = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;
      }
    }

    const [field, order] = sortBy.split('-');
    query.sortBy = field as TourQuery['sortBy'];
    query.sortOrder = order as 'asc' | 'desc';

    return query;
  }, [searchCode, dateRange, searchCompany, nationalityFilter, settlementStatusFilter, paymentStatusFilter, selectedMonth, selectedYear, sortBy]);

  const topCompanyOptions = useMemo(() => {
    const companyNames = new Set<string>();
    companies.forEach((company) => {
      const companyName = company.name?.trim();
      if (companyName) companyNames.add(companyName);
    });
    if (searchCompany.trim()) companyNames.add(searchCompany.trim());
    return Array.from(companyNames).sort((a, b) => a.localeCompare(b));
  }, [companies, searchCompany]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    tours.forEach((tour) => {
      const year = parseInt(tour.startDate.substring(0, 4));
      years.add(year);
    });
    return Array.from(years).sort().reverse();
  }, [tours]);

  const clearFilters = () => {
    setNationalityFilter('all');
    setSelectedMonth('all');
    setSelectedYear('all');
  };

  const hasActiveFilters = nationalityFilter !== 'all' || (selectedMonth !== 'all' && selectedYear !== 'all');

  return {
    searchCode,
    setSearchCode,
    dateRange,
    setDateRange,
    searchCompany,
    setSearchCompany,
    nationalityFilter,
    setNationalityFilter,
    settlementStatusFilter,
    setSettlementStatusFilter,
    paymentStatusFilter,
    setPaymentStatusFilter,
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    sortBy,
    setSortBy,
    filtersExpanded,
    setFiltersExpanded,
    searchExpanded,
    setSearchExpanded,
    topControlsExpanded,
    setTopControlsExpanded,
    topCompanyFilterOpen,
    setTopCompanyFilterOpen,
    baseTourQuery,
    topCompanyOptions,
    availableYears,
    months: TOUR_MONTHS,
    clearFilters,
    hasActiveFilters,
  };
};
