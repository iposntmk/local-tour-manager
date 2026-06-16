import type { Tour, TourQuery } from '@/types/tour';
import { getTourNationalityIds, getTourWarningInfo } from '@/pages/tours/tour-table-config';

type MonthYearFilter = {
  selectedMonth: string;
  selectedYear: string;
  hasDateRangeFilter: boolean;
};

type TourListFilters = MonthYearFilter & {
  settlementStatusFilter: string;
  paymentStatusFilter: string;
  nationalityFilter: string;
  shoppingCommissionFilter: string;
};

const parseSelectedNumber = (value: string) => {
  if (value === 'all') return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

export const getTourMonthYearDateQuery = ({
  selectedMonth,
  selectedYear,
  hasDateRangeFilter,
}: MonthYearFilter): Pick<TourQuery, 'startDate' | 'endDate'> => {
  if (hasDateRangeFilter) return {};

  const year = parseSelectedNumber(selectedYear);
  if (!year) return {};

  const month = parseSelectedNumber(selectedMonth);
  if (!month) {
    return {
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`,
    };
  }

  const monthStr = String(month).padStart(2, '0');
  const lastDay = new Date(year, month, 0).getDate();
  return {
    startDate: `${year}-${monthStr}-01`,
    endDate: `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`,
  };
};

export const isTourInMonthYearFilter = (tour: Tour, filters: MonthYearFilter) => {
  if (filters.hasDateRangeFilter) return true;

  const { startDate, endDate } = getTourMonthYearDateQuery(filters);
  if (startDate && endDate) {
    return tour.endDate >= startDate && tour.startDate <= endDate;
  }

  const month = parseSelectedNumber(filters.selectedMonth);
  if (!month) return true;

  return Number(tour.startDate.substring(5, 7)) === month;
};

export const filterToursByMonthYear = (tours: Tour[], filters: MonthYearFilter) =>
  tours.filter((tour) => isTourInMonthYearFilter(tour, filters));

export const isTourInListFilters = (tour: Tour, filters: TourListFilters) => {
  if (filters.settlementStatusFilter !== 'all' && tour.settlementStatus !== filters.settlementStatusFilter) {
    return false;
  }

  if (filters.paymentStatusFilter !== 'all' && tour.paymentStatus !== filters.paymentStatusFilter) {
    return false;
  }

  if (filters.shoppingCommissionFilter !== 'all') {
    const hasUnpaidShoppingCommission = getTourWarningInfo(tour).hasUnpaidCommission;
    if (filters.shoppingCommissionFilter === 'unpaid' && !hasUnpaidShoppingCommission) return false;
    if (filters.shoppingCommissionFilter === 'paid' && hasUnpaidShoppingCommission) return false;
  }

  if (filters.nationalityFilter !== 'all' && !getTourNationalityIds(tour).has(filters.nationalityFilter)) {
    return false;
  }

  return isTourInMonthYearFilter(tour, filters);
};

export const filterToursForList = (tours: Tour[], filters: TourListFilters) =>
  tours.filter((tour) => isTourInListFilters(tour, filters));

export const getTourStartYears = (tours: Tour[]) => {
  const years = new Set<number>();
  tours.forEach((tour) => {
    const year = Number(tour.startDate.substring(0, 4));
    if (!Number.isNaN(year)) years.add(year);
  });
  return Array.from(years).sort((a, b) => b - a);
};
