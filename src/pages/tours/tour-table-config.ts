import { differenceInDays, format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import type { Tour } from '@/types/tour';
import { formatDateRangeDisplay } from '@/lib/date-utils';

// Truncate helper with ellipsis included in `max` length
export const truncateText = (text: string | undefined | null, max = 15): string => {
  if (!text) return '';
  if (text.length <= max) return text;
  if (max <= 3) return text.slice(0, max);
  return text.slice(0, max - 3) + '...';
};

export const WATER_EXPENSE_NAMES = [
  'nước uống cho khách 10k/1 khách / 1 ngày',
  'nước uống cho khách 15k/1 khách / 1 ngày',
];

export const getTourDays = (tour: Tour) =>
  tour.totalDays || (tour.startDate && tour.endDate ? Math.max(0, differenceInDays(new Date(tour.endDate), new Date(tour.startDate)) + 1) : 0);

export const getTourGuests = (tour: Tour) => tour.totalGuests || ((tour.adults || 0) + (tour.children || 0));

export const getTourNationalityIds = (tour: Tour) => {
  const ids = new Set<string>();
  if (tour.clientNationalityRef?.id) ids.add(tour.clientNationalityRef.id);
  (tour.clientNationalities || []).forEach((nationality) => {
    if (nationality.id) ids.add(nationality.id);
  });
  return ids;
};

export const formatTourNationalities = (tour: Tour) => {
  const nationalities = tour.clientNationalities?.length
    ? tour.clientNationalities
    : tour.clientNationalityRef?.id
      ? [{ ...tour.clientNationalityRef, paxCount: getTourGuests(tour) }]
      : [];

  return nationalities
    .map((nationality) => `${nationality.nameAtBooking}${nationality.paxCount ? ` (${nationality.paxCount}p)` : ''}`)
    .join(', ');
};

export const getAllowanceTotal = (tour: Tour) =>
  (tour.allowances || []).reduce((sum, allowance) => sum + (allowance.price * (allowance.quantity || 1)), 0);

export const getTourWarningInfo = (tour: Tour) => {
  const hasZeroPrice = !!(
    (tour.destinations || []).some(d => (d.price ?? 0) === 0) ||
    (tour.expenses || []).some(e => (e.price ?? 0) === 0) ||
    (tour.meals || []).some(m => (m.price ?? 0) === 0) ||
    (tour.allowances || []).some(a => (a.price ?? 0) === 0)
  );

  const destNames = (tour.destinations || []).map(d => (d.name || '').trim().toLowerCase()).filter(Boolean);
  const nameCount = new Map<string, number>();
  for (const name of destNames) nameCount.set(name, (nameCount.get(name) || 0) + 1);
  const hasDuplicateDestNames = Array.from(nameCount.values()).some(count => count > 1);

  const hasWaterExpense = (tour.expenses || []).some(expense =>
    WATER_EXPENSE_NAMES.includes((expense.name || '').trim().toLowerCase())
  );
  const missingWaterExpense = !hasWaterExpense && !tour.waterExpenseDismissed;

  const hasUnpaidCommission = (tour.shoppings || []).some((s) => {
    if ((s.price ?? 0) <= 0) return false;
    const netCommission = s.netCommission ?? s.price;
    const paidTotal = (s.payments || []).reduce((sum, p) => sum + p.amount, 0);
    return paidTotal < netCommission;
  });

  const warningTitle = [
    hasUnpaidCommission && 'Hoa hồng chưa nhận đủ',
    hasDuplicateDestNames && 'Tên điểm đến trùng lặp',
    hasZeroPrice && 'Có mục giá 0',
    missingWaterExpense && 'Thiếu chi phí nước uống',
  ].filter(Boolean).join(' • ') || 'Cần kiểm tra';

  return {
    hasZeroPrice,
    hasDuplicateDestNames,
    missingWaterExpense,
    hasUnpaidCommission,
    showRedFlag: hasZeroPrice || hasDuplicateDestNames || missingWaterExpense || hasUnpaidCommission,
    warningTitle,
  };
};

export type TourTableColumnKey =
  | 'stt'
  | 'tourCode'
  | 'date'
  | 'days'
  | 'guests'
  | 'company'
  | 'landOperator'
  | 'guide'
  | 'nationality'
  | 'clientName'
  | 'clientPhone'
  | 'driverName'
  | 'ctp'
  | 'total'
  | 'settlement'
  | 'payment'
  | 'commission'
  | 'warning'
  | 'actions';

export type TourTableFilterKey = Exclude<TourTableColumnKey, 'stt' | 'actions' | 'payment' | 'settlement' | 'commission'>;

export type TourTableFilters = Record<TourTableFilterKey, string> & {
  warning: 'all' | 'warning' | 'ok';
};

export interface TourTableColumn {
  key: TourTableColumnKey;
  label: string;
  title?: string;
  width: number;
  headerClassName?: string;
  cellClassName?: string;
  filterType: 'text' | 'date' | 'company' | 'landOperator' | 'warning' | 'none';
  filterPlaceholder?: string;
}

export const TOUR_TABLE_COLUMNS: TourTableColumn[] = [
  { key: 'stt', label: 'STT', width: 52, headerClassName: 'text-center', cellClassName: 'text-center text-muted-foreground tabular-nums', filterType: 'none' },
  { key: 'tourCode', label: 'Mã tour', width: 96, cellClassName: 'font-semibold', filterType: 'text', filterPlaceholder: 'Lọc mã' },
  { key: 'date', label: 'Ngày', width: 122, cellClassName: 'whitespace-nowrap', filterType: 'date' },
  { key: 'days', label: 'Ngày đi', width: 70, cellClassName: 'whitespace-nowrap', filterType: 'text', filterPlaceholder: 'Số ngày' },
  { key: 'guests', label: 'Khách', width: 72, cellClassName: 'whitespace-nowrap', filterType: 'text', filterPlaceholder: 'Số khách' },
  { key: 'company', label: 'Công ty', width: 136, filterType: 'company' },
  { key: 'landOperator', label: 'Land tour', width: 128, filterType: 'landOperator' },
  { key: 'guide', label: 'HDV', width: 116, filterType: 'text', filterPlaceholder: 'Lọc HDV' },
  { key: 'nationality', label: 'Quốc tịch', width: 136, filterType: 'text', filterPlaceholder: 'Lọc quốc tịch' },
  { key: 'clientName', label: 'Khách hàng', width: 126, filterType: 'text', filterPlaceholder: 'Lọc khách' },
  { key: 'clientPhone', label: 'SĐT khách', width: 110, filterType: 'text', filterPlaceholder: 'Lọc SĐT' },
  { key: 'driverName', label: 'Tài xế', width: 110, filterType: 'text', filterPlaceholder: 'Lọc tài xế' },
  { key: 'ctp', label: 'CTP', width: 92, headerClassName: 'text-right', cellClassName: 'whitespace-nowrap text-right font-medium', filterType: 'text', filterPlaceholder: 'Lọc CTP' },
  { key: 'total', label: 'Tổng', width: 102, headerClassName: 'text-right', cellClassName: 'whitespace-nowrap text-right font-semibold text-primary', filterType: 'text', filterPlaceholder: 'Lọc tổng' },
  { key: 'settlement', label: 'Quyết toán', width: 116, cellClassName: 'whitespace-nowrap', filterType: 'none' },
  { key: 'payment', label: 'Thanh toán', width: 122, cellClassName: 'whitespace-nowrap', filterType: 'none' },
  { key: 'commission', label: 'Hoa hồng', width: 112, cellClassName: 'whitespace-nowrap', filterType: 'none' },
  { key: 'warning', label: 'Cảnh báo', title: 'Cảnh báo, tour thiếu nước uống', width: 108, cellClassName: 'whitespace-nowrap', filterType: 'warning' },
  { key: 'actions', label: 'Hành động', width: 98, headerClassName: 'text-right', cellClassName: 'whitespace-nowrap text-right', filterType: 'none' },
];

export const TOUR_TABLE_COLUMN_KEYS = TOUR_TABLE_COLUMNS.map(column => column.key);

export const createDefaultTourTableColumnVisibility = () =>
  TOUR_TABLE_COLUMN_KEYS.reduce((visibility, key) => {
    visibility[key] = true;
    return visibility;
  }, {} as Record<TourTableColumnKey, boolean>);

export const createDefaultTourTableFilters = (): TourTableFilters => ({
  tourCode: '',
  date: '',
  days: '',
  guests: '',
  company: '',
  landOperator: '',
  guide: '',
  nationality: '',
  clientName: '',
  clientPhone: '',
  driverName: '',
  ctp: '',
  total: '',
  warning: 'all',
});

export const loadTourTableColumnVisibility = () => {
  const saved = localStorage.getItem('tours.table.columnVisibility');
  if (!saved) return createDefaultTourTableColumnVisibility();

  try {
    const parsed = JSON.parse(saved) as Partial<Record<TourTableColumnKey, boolean>>;
    return TOUR_TABLE_COLUMN_KEYS.reduce((visibility, key) => {
      visibility[key] = typeof parsed[key] === 'boolean' ? parsed[key]! : true;
      return visibility;
    }, {} as Record<TourTableColumnKey, boolean>);
  } catch (error) {
    console.warn('Invalid tour table column visibility settings', error);
    return createDefaultTourTableColumnVisibility();
  }
};

export const loadTourTableFilters = (): TourTableFilters => {
  const saved = localStorage.getItem('tours.table.filters');
  if (!saved) return createDefaultTourTableFilters();

  try {
    const parsed = JSON.parse(saved) as Partial<Record<TourTableFilterKey, string>>;
    return {
      tourCode: parsed.tourCode || '',
      date: parsed.date || '',
      days: parsed.days || '',
      guests: parsed.guests || '',
      company: parsed.company || '',
      landOperator: parsed.landOperator || '',
      guide: parsed.guide || '',
      nationality: parsed.nationality || '',
      clientName: parsed.clientName || '',
      clientPhone: parsed.clientPhone || '',
      driverName: parsed.driverName || '',
      ctp: parsed.ctp || '',
      total: parsed.total || '',
      warning: parsed.warning === 'warning' || parsed.warning === 'ok' ? parsed.warning : 'all',
    };
  } catch (error) {
    console.warn('Invalid tour table filter settings', error);
    return createDefaultTourTableFilters();
  }
};

export const normalizeTableFilterText = (value: string | number | undefined | null) =>
  String(value ?? '').trim().toLowerCase();

export const includesTableFilter = (value: string | number | undefined | null, filter: string) => {
  const normalizedFilter = normalizeTableFilterText(filter);
  if (!normalizedFilter) return true;
  return normalizeTableFilterText(value).includes(normalizedFilter);
};

export const parseTableDateFilter = (value: string): DateRange | undefined => {
  if (!value.includes('|')) return undefined;

  const [fromValue, toValue] = value.split('|');
  const from = fromValue ? new Date(fromValue) : undefined;
  const to = toValue ? new Date(toValue) : undefined;

  return {
    from: from && !Number.isNaN(from.getTime()) ? from : undefined,
    to: to && !Number.isNaN(to.getTime()) ? to : undefined,
  };
};

export const serializeTableDateFilter = (range: DateRange | undefined) => {
  if (!range?.from && !range?.to) return '';
  return `${range?.from ? format(range.from, 'yyyy-MM-dd') : ''}|${range?.to ? format(range.to, 'yyyy-MM-dd') : ''}`;
};

export const formatTableDateFilterLabel = (value: string) => {
  const selected = parseTableDateFilter(value);
  if (!selected?.from && !selected?.to) {
    return value || 'Chọn ngày';
  }

  if (selected.from && selected.to) {
    return `${format(selected.from, 'dd/MM/yyyy')} - ${format(selected.to, 'dd/MM/yyyy')}`;
  }

  const singleDate = selected.from || selected.to;
  return singleDate ? format(singleDate, 'dd/MM/yyyy') : 'Chọn ngày';
};

export const tourMatchesTableDateFilter = (tour: Tour, value: string) => {
  const selected = parseTableDateFilter(value);
  if (!selected?.from && !selected?.to) {
    return includesTableFilter(`${tour.startDate} ${tour.endDate} ${formatDateRangeDisplay(tour.startDate, tour.endDate)}`, value);
  }

  const from = selected.from || selected.to;
  const to = selected.to || selected.from;
  if (!from || !to) return true;

  const filterStart = format(from, 'yyyy-MM-dd');
  const filterEnd = format(to, 'yyyy-MM-dd');
  return tour.startDate <= filterEnd && tour.endDate >= filterStart;
};
