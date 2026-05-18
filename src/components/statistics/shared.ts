import type { Tour } from '@/types/tour';
import type { DetailedExpense } from '@/types/master';

export const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

// Bright, distinguishable palette for per-bar coloring (12-step so 12 months
// each get a unique hue without repeating). Tailwind 500-level brights.
export const BRIGHT_PALETTE = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#a855f7', // purple
  '#ec4899', // pink
  '#f43f5e', // rose
];

export const UNKNOWN_GUIDE_ID = '__unknown_guide__';
export const UNKNOWN_COMPANY_ID = '__unknown_company__';
export const UNKNOWN_NATIONALITY_ID = '__unknown_nationality__';
export const UNKNOWN_MONTH = 'Unknown';
export const REQUIRED_PIN = '0829101188';
export const CTP_CATEGORY_NAME = 'CTP';
export const DEFAULT_GUIDE_NAME = 'Cao Hữu Tú';
export const DEFAULT_COMPANY_NAME = 'Việt-Á';

export type TourStatsColumnKey =
  | 'tour'
  | 'date'
  | 'days'
  | 'client'
  | 'guide'
  | 'company'
  | 'allowances'
  | 'guestTip'
  | 'companyTip'
  | 'shopping'
  | 'ctpOnly'
  | 'incomeWithoutCarHotel'
  | 'shopTipAllow'
  | 'finalTotal';

export const tourStatsColumns: Array<{ key: TourStatsColumnKey; label: string }> = [
  { key: 'tour', label: 'Tour' },
  { key: 'date', label: 'Date' },
  { key: 'days', label: 'Days' },
  { key: 'client', label: 'Client' },
  { key: 'guide', label: 'Guide' },
  { key: 'company', label: 'Company' },
  { key: 'allowances', label: 'Allowances' },
  { key: 'guestTip', label: 'Guest Tip' },
  { key: 'companyTip', label: 'Company Tip' },
  { key: 'shopping', label: 'Shopping' },
  { key: 'ctpOnly', label: 'CTP only' },
  { key: 'incomeWithoutCarHotel', label: 'Thu nhập (-xe/ngủ)' },
  { key: 'shopTipAllow', label: 'Total (S+T+A)' },
  { key: 'finalTotal', label: 'Final Total' },
];

export const tourStatsTextColumnKeys: TourStatsColumnKey[] = ['tour', 'date', 'client', 'guide', 'company'];

export const defaultTourStatsColumnVisibility: Record<TourStatsColumnKey, boolean> = {
  tour: true,
  date: true,
  days: true,
  client: false,
  guide: false,
  company: false,
  allowances: true,
  guestTip: true,
  companyTip: true,
  shopping: true,
  ctpOnly: true,
  incomeWithoutCarHotel: true,
  shopTipAllow: true,
  finalTotal: true,
};

export const normalizeStatKey = (value: string) => value.trim().toLowerCase();

export const isCtpDetailedExpense = (expense: DetailedExpense) =>
  expense.categoryRef?.nameAtBooking?.trim().toUpperCase() === CTP_CATEGORY_NAME;

export type StatHelp = { label: string; title: string; description: string };

export const statColumnHelp: Record<string, StatHelp> = {
  totalTours: {
    label: 'Tours',
    title: 'Total tours',
    description: 'Count of tours matching the current filters.',
  },
  totalGuests: {
    label: 'Khách',
    title: 'Total guests',
    description: 'Sum of adults and children across tours matching the current filters.',
  },
  days: {
    label: 'Ngày',
    title: 'Tour days',
    description: 'Calculated per tour as end date minus start date plus 1. The total row sums these days.',
  },
  ctpOnly: {
    label: 'CTP only',
    title: 'CTP only',
    description:
      'Only includes tour allowance costs whose matching detailed expense has category exactly CTP. Other detailed expense categories are excluded.',
  },
  incomeWithoutCarHotel: {
    label: 'Thu nhập (-xe/ngủ)',
    title: 'Thu nhập (không tính xe + ngủ)',
    description:
      'Calculated as Guest Tip + Shopping + CTP only. It excludes car and hotel/sleeping costs.',
  },
  averageTipPerDay: {
    label: 'Tip/ngày',
    title: 'Average tip per tour day',
    description:
      'Calculated as (Guest Tip + Company Tip) divided by total tour days in the current filtered results.',
  },
  allowances: {
    label: 'Allowances',
    title: 'Allowances',
    description: 'Total of all tour allowance rows, including every allowance category used in tours.',
  },
  guestTip: {
    label: 'Guest Tip',
    title: 'Guest Tip',
    description: 'Total of tour shopping rows named TIP.',
  },
  companyTip: {
    label: 'Company Tip',
    title: 'Company Tip',
    description: 'Total company tip saved in each tour summary.',
  },
  shopping: {
    label: 'Shopping',
    title: 'Shopping',
    description: 'Total tour shopping rows except rows named TIP.',
  },
  finalTotal: {
    label: 'Final Total',
    title: 'Final Total',
    description: 'Total final amount saved in each tour summary for the current row or filtered set.',
  },
  grandTotal: {
    label: 'Grand Total',
    title: 'Grand Total',
    description: 'Sum of Final Total across all tours in the database, ignoring the current filters.',
  },
  shopTipAllow: {
    label: 'S+T+A',
    title: 'Total (Shopping + Tip + Allowances)',
    description:
      'S + T + A means Shopping + Tip + Allowances. It includes shopping, guest tip, company tip, and all tour allowances.',
  },
};

export const calculateAllowanceTotal = (tour: Tour) =>
  (tour.allowances || []).reduce(
    (sum, allowance) => sum + allowance.price * (allowance.quantity ?? 1),
    0,
  );

export const calculateCtpOnlyTotal = (tour: Tour, ctpExpenseNames: Set<string>) =>
  (tour.allowances || []).reduce((sum, allowance) => {
    if (!ctpExpenseNames.has(normalizeStatKey(allowance.name))) return sum;
    return sum + allowance.price * (allowance.quantity ?? 1);
  }, 0);

export const calculateTipTotal = (tour: Tour) =>
  (tour.shoppings || []).filter((s) => s.name === 'TIP').reduce((sum, s) => sum + s.price, 0);

export const calculateShoppingTotal = (tour: Tour) =>
  (tour.shoppings || []).filter((s) => s.name !== 'TIP').reduce((sum, s) => sum + s.price, 0);

export const calculateCompanyTip = (tour: Tour) => tour.summary?.companyTip || 0;

export const calculateTourDateDiff = (tour: Tour) => {
  if (!tour.startDate || !tour.endDate) return 0;
  const [sy, sm, sd] = tour.startDate.split('-').map(Number);
  const [ey, em, ed] = tour.endDate.split('-').map(Number);
  if (![sy, sm, sd, ey, em, ed].every(Number.isFinite)) return 0;
  const start = Date.UTC(sy, sm - 1, sd);
  const end = Date.UTC(ey, em - 1, ed);
  return Math.max(1, Math.round((end - start) / 86_400_000) + 1);
};

export const getTourMonth = (tour: Tour) => (tour.startDate ? tour.startDate.slice(0, 7) : UNKNOWN_MONTH);

export const normalizeGuide = (tour: Tour) => ({
  id: tour.guideRef?.id || UNKNOWN_GUIDE_ID,
  name: tour.guideRef?.nameAtBooking?.trim() || 'Unknown guide',
});

export const normalizeCompany = (tour: Tour) => ({
  id: tour.companyRef?.id || UNKNOWN_COMPANY_ID,
  name: tour.companyRef?.nameAtBooking?.trim() || 'Unknown company',
});

export const normalizeNationality = (tour: Tour) => ({
  id: tour.clientNationalityRef?.id || UNKNOWN_NATIONALITY_ID,
  name: tour.clientNationalityRef?.nameAtBooking?.trim() || 'Unknown nationality',
});

export interface GroupStatsRow {
  key: string;
  label: string;
  totalTours: number;
  totalAllowances: number;
  totalCtpOnly: number;
  totalIncomeWithoutCarHotel: number;
  totalTipFromGuests: number;
  totalCompanyTip: number;
  totalShoppings: number;
  totalShopTipAllow: number;
  finalTotal: number;
}

export interface TourStatsRow {
  id: string;
  tourCode: string;
  startDate: string;
  totalDays: number;
  clientName: string;
  guideName: string;
  companyName: string;
  totalAllowances: number;
  totalCtpOnly: number;
  totalTipFromGuests: number;
  totalCompanyTip: number;
  totalShoppings: number;
  totalShopTipAllow: number;
  incomeWithoutCarHotel: number;
  finalTotal: number;
}

export interface StatsTotals {
  allowances: number;
  ctpOnly: number;
  incomeWithoutCarHotel: number;
  tipFromGuests: number;
  companyTip: number;
  shoppings: number;
  totalShopTipAllow: number;
  finalTotal: number;
  tours: number;
  guests: number;
  days: number;
}

export const formatCompact = (value: number) => {
  if (Math.abs(value) >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(value);
};
