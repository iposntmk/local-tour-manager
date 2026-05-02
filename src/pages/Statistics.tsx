import { useMemo, useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Columns3, Info, Lock } from 'lucide-react';
import { store } from '@/lib/datastore';
import { useHeaderMode } from '@/hooks/useHeaderMode';
import type { Tour } from '@/types/tour';
import { getSupabaseClient } from '@/lib/datastore/supabase-client';
import { formatCurrency } from '@/lib/currency-utils';
import type { DetailedExpense } from '@/types/master';

const UNKNOWN_GUIDE_ID = '__unknown_guide__';
const UNKNOWN_COMPANY_ID = '__unknown_company__';
const UNKNOWN_NATIONALITY_ID = '__unknown_nationality__';
const UNKNOWN_MONTH = 'Unknown';
const REQUIRED_PIN = '0829101188';
const CTP_CATEGORY_NAME = 'CTP';
const DEFAULT_GUIDE_NAME = 'Cao H\u1eefu T\u00fa';
const DEFAULT_COMPANY_NAME = 'Vi\u1ec7t-\u00c1';

type TourStatsColumnKey =
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

const tourStatsColumns: Array<{ key: TourStatsColumnKey; label: string }> = [
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
  { key: 'incomeWithoutCarHotel', label: 'Thu nhap -\nko tinh xe +\nngu' },
  { key: 'shopTipAllow', label: 'Total (S+T+A)' },
  { key: 'finalTotal', label: 'Final Total' },
];

const tourStatsTextColumnKeys: TourStatsColumnKey[] = ['tour', 'date', 'client', 'guide', 'company'];

const defaultTourStatsColumnVisibility: Record<TourStatsColumnKey, boolean> = {
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

const normalizeStatKey = (value: string) => value.trim().toLowerCase();

const isCtpDetailedExpense = (expense: DetailedExpense) =>
  expense.categoryRef?.nameAtBooking?.trim().toUpperCase() === CTP_CATEGORY_NAME;

const statColumnHelp = {
  totalTours: {
    label: 'Total tours',
    title: 'Total tours',
    description: 'Count of tours matching the current filters.',
  },
  totalGuests: {
    label: 'Total guests',
    title: 'Total guests',
    description: 'Sum of adults and children across tours matching the current filters.',
  },
  days: {
    label: 'Days',
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
    label: 'Thu nhap -\nko tinh xe +\nngu',
    title: 'Thu nhap - ko tinh xe + ngu',
    description:
      'Calculated as Guest Tip + Shopping + CTP only. It excludes car and hotel/sleeping costs.',
  },
  averageTipPerDay: {
    label: 'Avg tip/day',
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
    label: 'Total (S+T+A)',
    title: 'Total (S+T+A)',
    description:
      'S + T + A means Shopping + Tip + Allowances. It includes shopping, guest tip, company tip, and all tour allowances.',
  },
};

const StatColumnHelp = ({ label, title, description }: { label: string; title: string; description: string }) => (
  <Popover>
    <PopoverTrigger asChild>
      <button
        type="button"
        className="inline-flex items-center justify-center gap-1 rounded-sm text-center underline decoration-dotted underline-offset-4 hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <span className="whitespace-pre-line">{label}</span>
        <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      </button>
    </PopoverTrigger>
    <PopoverContent align="end" className="w-72 text-left">
      <div className="space-y-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </PopoverContent>
  </Popover>
);

const calculateAllowanceTotal = (tour: Tour) =>
  (tour.allowances || []).reduce(
    (sum, allowance) => sum + allowance.price * (allowance.quantity ?? 1),
    0
  );

const calculateCtpOnlyTotal = (tour: Tour, ctpExpenseNames: Set<string>) =>
  (tour.allowances || []).reduce((sum, allowance) => {
    if (!ctpExpenseNames.has(normalizeStatKey(allowance.name))) {
      return sum;
    }

    return sum + allowance.price * (allowance.quantity ?? 1);
  }, 0);

// (Stats grand totals revert to Shop+Tip+Allow model)

const calculateTipTotal = (tour: Tour) => {
  const tipItems = (tour.shoppings || []).filter(shopping => shopping.name === 'TIP');
  const total = tipItems.reduce((sum, shopping) => sum + shopping.price, 0);
  if (tipItems.length > 0) {
    console.log(`Tour ${tour.tourCode}: Found ${tipItems.length} TIP items, total: ${total}`, tipItems);
  }
  return total;
};

const calculateShoppingTotal = (tour: Tour) => {
  const shoppingItems = (tour.shoppings || []).filter(shopping => shopping.name !== 'TIP');
  return shoppingItems.reduce((sum, shopping) => sum + shopping.price, 0);
};

const calculateCompanyTip = (tour: Tour) => {
  return tour.summary?.companyTip || 0;
};

const calculateTourDateDiff = (tour: Tour) => {
  if (!tour.startDate || !tour.endDate) {
    return 0;
  }

  const [startYear, startMonth, startDay] = tour.startDate.split('-').map(Number);
  const [endYear, endMonth, endDay] = tour.endDate.split('-').map(Number);

  if (![startYear, startMonth, startDay, endYear, endMonth, endDay].every(Number.isFinite)) {
    return 0;
  }

  const start = Date.UTC(startYear, startMonth - 1, startDay);
  const end = Date.UTC(endYear, endMonth - 1, endDay);

  return Math.max(1, Math.round((end - start) / 86_400_000) + 1);
};

const getTourMonth = (tour: Tour) => (tour.startDate ? tour.startDate.slice(0, 7) : UNKNOWN_MONTH);

const normalizeGuide = (tour: Tour) => ({
  id: tour.guideRef?.id || UNKNOWN_GUIDE_ID,
  name: tour.guideRef?.nameAtBooking?.trim() || 'Unknown guide',
});

const normalizeCompany = (tour: Tour) => ({
  id: tour.companyRef?.id || UNKNOWN_COMPANY_ID,
  name: tour.companyRef?.nameAtBooking?.trim() || 'Unknown company',
});

const normalizeNationality = (tour: Tour) => ({
  id: tour.clientNationalityRef?.id || UNKNOWN_NATIONALITY_ID,
  name: tour.clientNationalityRef?.nameAtBooking?.trim() || 'Unknown nationality',
});

const Statistics = () => {
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  const [isUnlocked, setIsUnlocked] = useState(() => {
    const saved = sessionStorage.getItem('statistics.unlocked');
    return saved === 'true';
  });
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  const { data: toursResult, isLoading } = useQuery({
    queryKey: ['statistics', 'tours'],
    queryFn: () => store.listTours(undefined, { includeDetails: true }),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });

  const tours = toursResult?.tours ?? [];

  const { data: detailedExpenses = [] } = useQuery({
    queryKey: ['statistics', 'detailed-expenses'],
    queryFn: () => store.listDetailedExpenses({}),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });

  // Debug: Check if shoppings are loaded
  if (tours.length > 0) {
    console.log('Statistics - Sample tour data:', {
      tourCount: tours.length,
      firstTour: tours[0],
      hasShoppings: tours.some(t => t.shoppings && t.shoppings.length > 0),
      shoppingsExample: tours.find(t => t.shoppings && t.shoppings.length > 0)?.shoppings,
    });
  }

  const [selectedGuide, setSelectedGuide] = useState('all');
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [selectedNationality, setSelectedNationality] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [hasAppliedDefaultFilters, setHasAppliedDefaultFilters] = useState(false);
  const [tourStatsColumnVisibility, setTourStatsColumnVisibility] = useState(defaultTourStatsColumnVisibility);

  const setTourStatsColumnVisible = (key: TourStatsColumnKey, visible: boolean) => {
    setTourStatsColumnVisibility(prev => ({
      ...prev,
      [key]: visible,
    }));
  };

  // Realtime subscription for tour_shoppings, tour_allowances, and tours changes
  useEffect(() => {
    const channel = supabase
      .channel('statistics-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tour_shoppings' }, () => {
        queryClient.invalidateQueries({ queryKey: ['statistics', 'tours'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tour_allowances' }, () => {
        queryClient.invalidateQueries({ queryKey: ['statistics', 'tours'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tours' }, () => {
        queryClient.invalidateQueries({ queryKey: ['statistics', 'tours'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'detailed_expenses' }, () => {
        queryClient.invalidateQueries({ queryKey: ['statistics', 'detailed-expenses'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expense_categories' }, () => {
        queryClient.invalidateQueries({ queryKey: ['statistics', 'detailed-expenses'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient]);

  const ctpExpenseNames = useMemo(() => {
    return new Set(
      detailedExpenses
        .filter(isCtpDetailedExpense)
        .map(expense => normalizeStatKey(expense.name))
    );
  }, [detailedExpenses]);

  const availableGuides = useMemo(() => {
    const map = new Map<string, string>();
    tours.forEach(tour => {
      const guide = normalizeGuide(tour);
      map.set(guide.id, guide.name);
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [tours]);

  const availableCompanies = useMemo(() => {
    const map = new Map<string, string>();
    tours.forEach(tour => {
      const company = normalizeCompany(tour);
      map.set(company.id, company.name);
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [tours]);

  useEffect(() => {
    if (hasAppliedDefaultFilters || availableGuides.length === 0 || availableCompanies.length === 0) {
      return;
    }

    const defaultGuide = availableGuides.find(guide => guide.name === DEFAULT_GUIDE_NAME);
    const defaultCompany = availableCompanies.find(company => company.name === DEFAULT_COMPANY_NAME);

    if (defaultGuide) {
      setSelectedGuide(defaultGuide.id);
    }

    if (defaultCompany) {
      setSelectedCompany(defaultCompany.id);
    }

    setHasAppliedDefaultFilters(true);
  }, [availableGuides, availableCompanies, hasAppliedDefaultFilters]);

  const availableNationalities = useMemo(() => {
    const map = new Map<string, string>();
    tours.forEach(tour => {
      const nationality = normalizeNationality(tour);
      map.set(nationality.id, nationality.name);
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [tours]);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    tours.forEach(tour => {
      const month = getTourMonth(tour);
      if (month !== UNKNOWN_MONTH) {
        months.add(month);
      }
    });
    return Array.from(months)
      .sort((a, b) => b.localeCompare(a));
  }, [tours]);

  const filteredTours = useMemo(() => {
    return tours.filter(tour => {
      const guide = normalizeGuide(tour);
      const company = normalizeCompany(tour);
      const nationality = normalizeNationality(tour);
      const month = getTourMonth(tour);

      const matchesGuide = selectedGuide === 'all' || guide.id === selectedGuide;
      const matchesCompany = selectedCompany === 'all' || company.id === selectedCompany;
      const matchesNationality = selectedNationality === 'all' || nationality.id === selectedNationality;
      const matchesMonth = selectedMonth === 'all' || month === selectedMonth;

      return matchesGuide && matchesCompany && matchesNationality && matchesMonth;
    });
  }, [tours, selectedGuide, selectedCompany, selectedNationality, selectedMonth]);

  const totals = useMemo(() => {
    return filteredTours.reduce(
      (acc, tour) => {
        const allowances = calculateAllowanceTotal(tour);
        const tipFromGuests = calculateTipTotal(tour);
        const companyTip = calculateCompanyTip(tour);
        const shoppings = calculateShoppingTotal(tour);
        const ctpOnly = calculateCtpOnlyTotal(tour, ctpExpenseNames);
        const incomeWithoutCarHotel = tipFromGuests + shoppings + ctpOnly;
        const totalShopTipAllow = allowances + tipFromGuests + companyTip + shoppings;
        const finalTotal = tour.summary?.finalTotal ?? 0;

        acc.allowances += allowances;
        acc.ctpOnly += ctpOnly;
        acc.incomeWithoutCarHotel += incomeWithoutCarHotel;
        acc.tipFromGuests += tipFromGuests;
        acc.companyTip += companyTip;
        acc.shoppings += shoppings;
        acc.totalShopTipAllow += totalShopTipAllow;
        acc.finalTotal += finalTotal;
        acc.tours += 1;
        acc.guests += tour.totalGuests ?? 0;
        acc.days += calculateTourDateDiff(tour);
        return acc;
      },
      { allowances: 0, ctpOnly: 0, incomeWithoutCarHotel: 0, tipFromGuests: 0, companyTip: 0, shoppings: 0, totalShopTipAllow: 0, finalTotal: 0, tours: 0, guests: 0, days: 0 }
    );
  }, [filteredTours, ctpExpenseNames]);

  const averageTipPerDay = totals.days > 0
    ? (totals.tipFromGuests + totals.companyTip) / totals.days
    : 0;

  // Grand total of ALL tour trong cơ sở dữ liệu
  const grandTotals = useMemo(() => {
    return tours.reduce(
      (acc, tour) => {
        const finalTotal = tour.summary?.finalTotal ?? 0;
        acc.finalTotal += finalTotal;
        acc.tours += 1;
        return acc;
      },
      { finalTotal: 0, tours: 0 }
    );
  }, [tours]);

  const guideStats = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; totalTours: number; totalAllowances: number; totalCtpOnly: number; totalIncomeWithoutCarHotel: number; totalTipFromGuests: number; totalCompanyTip: number; totalShoppings: number; totalShopTipAllow: number; finalTotal: number }
    >();

    filteredTours.forEach(tour => {
      const guide = normalizeGuide(tour);
      const allowances = calculateAllowanceTotal(tour);
      const tipFromGuests = calculateTipTotal(tour);
      const companyTip = calculateCompanyTip(tour);
      const shoppings = calculateShoppingTotal(tour);
      const ctpOnly = calculateCtpOnlyTotal(tour, ctpExpenseNames);
      const finalTotal = tour.summary?.finalTotal ?? 0;

      if (!map.has(guide.id)) {
        map.set(guide.id, {
          id: guide.id,
          name: guide.name,
          totalTours: 0,
          totalAllowances: 0,
          totalCtpOnly: 0,
          totalIncomeWithoutCarHotel: 0,
          totalTipFromGuests: 0,
          totalCompanyTip: 0,
          totalShoppings: 0,
          totalShopTipAllow: 0,
          finalTotal: 0,
        });
      }

      const entry = map.get(guide.id)!;
      entry.totalTours += 1;
      entry.totalAllowances += allowances;
      entry.totalCtpOnly += ctpOnly;
      entry.totalIncomeWithoutCarHotel += tipFromGuests + shoppings + ctpOnly;
      entry.totalTipFromGuests += tipFromGuests;
      entry.totalCompanyTip += companyTip;
      entry.totalShoppings += shoppings;
      entry.totalShopTipAllow += allowances + tipFromGuests + companyTip + shoppings;
      entry.finalTotal += finalTotal;
    });

    return Array.from(map.values()).sort((a, b) => b.finalTotal - a.finalTotal);
  }, [filteredTours, ctpExpenseNames]);

  const companyStats = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; totalTours: number; totalAllowances: number; totalCtpOnly: number; totalIncomeWithoutCarHotel: number; totalTipFromGuests: number; totalCompanyTip: number; totalShoppings: number; totalShopTipAllow: number; finalTotal: number }
    >();

    filteredTours.forEach(tour => {
      const company = normalizeCompany(tour);
      const allowances = calculateAllowanceTotal(tour);
      const tipFromGuests = calculateTipTotal(tour);
      const companyTip = calculateCompanyTip(tour);
      const shoppings = calculateShoppingTotal(tour);
      const ctpOnly = calculateCtpOnlyTotal(tour, ctpExpenseNames);
      const finalTotal = tour.summary?.finalTotal ?? 0;

      if (!map.has(company.id)) {
        map.set(company.id, {
          id: company.id,
          name: company.name,
          totalTours: 0,
          totalAllowances: 0,
          totalCtpOnly: 0,
          totalIncomeWithoutCarHotel: 0,
          totalTipFromGuests: 0,
          totalCompanyTip: 0,
          totalShoppings: 0,
          totalShopTipAllow: 0,
          finalTotal: 0,
        });
      }

      const entry = map.get(company.id)!;
      entry.totalTours += 1;
      entry.totalAllowances += allowances;
      entry.totalCtpOnly += ctpOnly;
      entry.totalIncomeWithoutCarHotel += tipFromGuests + shoppings + ctpOnly;
      entry.totalTipFromGuests += tipFromGuests;
      entry.totalCompanyTip += companyTip;
      entry.totalShoppings += shoppings;
      entry.totalShopTipAllow += allowances + tipFromGuests + companyTip + shoppings;
      entry.finalTotal += finalTotal;
    });

    return Array.from(map.values()).sort((a, b) => b.finalTotal - a.finalTotal);
  }, [filteredTours, ctpExpenseNames]);

  const monthlyStats = useMemo(() => {
    const map = new Map<
      string,
      { month: string; totalTours: number; totalAllowances: number; totalCtpOnly: number; totalIncomeWithoutCarHotel: number; totalTipFromGuests: number; totalCompanyTip: number; totalShoppings: number; totalShopTipAllow: number; finalTotal: number }
    >();

    filteredTours.forEach(tour => {
      const month = getTourMonth(tour);
      const allowances = calculateAllowanceTotal(tour);
      const tipFromGuests = calculateTipTotal(tour);
      const companyTip = calculateCompanyTip(tour);
      const shoppings = calculateShoppingTotal(tour);
      const ctpOnly = calculateCtpOnlyTotal(tour, ctpExpenseNames);
      const finalTotal = tour.summary?.finalTotal ?? 0;

      if (!map.has(month)) {
        map.set(month, {
          month,
          totalTours: 0,
          totalAllowances: 0,
          totalCtpOnly: 0,
          totalIncomeWithoutCarHotel: 0,
          totalTipFromGuests: 0,
          totalCompanyTip: 0,
          totalShoppings: 0,
          totalShopTipAllow: 0,
          finalTotal: 0,
        });
      }

      const entry = map.get(month)!;
      entry.totalTours += 1;
      entry.totalAllowances += allowances;
      entry.totalCtpOnly += ctpOnly;
      entry.totalIncomeWithoutCarHotel += tipFromGuests + shoppings + ctpOnly;
      entry.totalTipFromGuests += tipFromGuests;
      entry.totalCompanyTip += companyTip;
      entry.totalShoppings += shoppings;
      entry.totalShopTipAllow += allowances + tipFromGuests + companyTip + shoppings;
      entry.finalTotal += finalTotal;
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.month === UNKNOWN_MONTH) return 1;
      if (b.month === UNKNOWN_MONTH) return -1;
      return b.month.localeCompare(a.month);
    });
  }, [filteredTours, ctpExpenseNames]);

  const nationalityStats = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; totalTours: number; totalAllowances: number; totalCtpOnly: number; totalIncomeWithoutCarHotel: number; totalTipFromGuests: number; totalCompanyTip: number; totalShoppings: number; totalShopTipAllow: number; finalTotal: number }
    >();

    filteredTours.forEach(tour => {
      const nationality = normalizeNationality(tour);
      const allowances = calculateAllowanceTotal(tour);
      const tipFromGuests = calculateTipTotal(tour);
      const companyTip = calculateCompanyTip(tour);
      const shoppings = calculateShoppingTotal(tour);
      const ctpOnly = calculateCtpOnlyTotal(tour, ctpExpenseNames);
      const finalTotal = tour.summary?.finalTotal ?? 0;

      if (!map.has(nationality.id)) {
        map.set(nationality.id, {
          id: nationality.id,
          name: nationality.name,
          totalTours: 0,
          totalAllowances: 0,
          totalCtpOnly: 0,
          totalIncomeWithoutCarHotel: 0,
          totalTipFromGuests: 0,
          totalCompanyTip: 0,
          totalShoppings: 0,
          totalShopTipAllow: 0,
          finalTotal: 0,
        });
      }

      const entry = map.get(nationality.id)!;
      entry.totalTours += 1;
      entry.totalAllowances += allowances;
      entry.totalCtpOnly += ctpOnly;
      entry.totalIncomeWithoutCarHotel += tipFromGuests + shoppings + ctpOnly;
      entry.totalTipFromGuests += tipFromGuests;
      entry.totalCompanyTip += companyTip;
      entry.totalShoppings += shoppings;
      entry.totalShopTipAllow += allowances + tipFromGuests + companyTip + shoppings;
      entry.finalTotal += finalTotal;
    });

    return Array.from(map.values()).sort((a, b) => b.finalTotal - a.finalTotal);
  }, [filteredTours, ctpExpenseNames]);

  const tourStats = useMemo(() => {
    return filteredTours
      .map(tour => {
        const allowances = calculateAllowanceTotal(tour);
        const tipFromGuests = calculateTipTotal(tour);
        const companyTip = calculateCompanyTip(tour);
        const shoppings = calculateShoppingTotal(tour);
        const ctpOnly = calculateCtpOnlyTotal(tour, ctpExpenseNames);
        const incomeWithoutCarHotel = tipFromGuests + shoppings + ctpOnly;

        return {
          id: tour.id,
          tourCode: tour.tourCode,
          startDate: tour.startDate,
          totalDays: calculateTourDateDiff(tour),
          clientName: tour.clientName,
          guideName: normalizeGuide(tour).name,
          companyName: normalizeCompany(tour).name,
          totalAllowances: allowances,
          totalCtpOnly: ctpOnly,
          totalTipFromGuests: tipFromGuests,
          totalCompanyTip: companyTip,
          totalShoppings: shoppings,
          totalShopTipAllow: allowances + tipFromGuests + companyTip + shoppings,
          incomeWithoutCarHotel,
          finalTotal: tour.summary?.finalTotal ?? 0,
        };
      })
      .sort((a, b) => {
        const dateCompare = a.startDate.localeCompare(b.startDate);
        if (dateCompare !== 0) return dateCompare;
        return a.tourCode.localeCompare(b.tourCode);
      });
  }, [filteredTours, ctpExpenseNames]);

  const firstVisibleTourStatsTextColumn = tourStatsTextColumnKeys.find(
    key => tourStatsColumnVisibility[key]
  );

  const renderTourStatsTotalLabel = (key: TourStatsColumnKey) =>
    firstVisibleTourStatsTextColumn === key ? 'Total' : '';

  const { classes: headerClasses } = useHeaderMode('statistics.headerMode');

  const resetFilters = () => {
    setSelectedGuide('all');
    setSelectedCompany('all');
    setSelectedNationality('all');
    setSelectedMonth('all');
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === REQUIRED_PIN) {
      setIsUnlocked(true);
      sessionStorage.setItem('statistics.unlocked', 'true');
      setPinError(false);
      setPinInput('');
    } else {
      setPinError(true);
      setPinInput('');
    }
  };

  if (!isUnlocked) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Statistics Access
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePinSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="pin" className="text-sm font-medium">
                    Nhập mã PIN (gợi ý: số điện thoại của bạn)
                  </label>
                  <Input
                    id="pin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={pinInput}
                    onChange={(e) => {
                      setPinInput(e.target.value);
                      setPinError(false);
                    }}
                    placeholder="Enter PIN"
                    className={pinError ? 'border-red-500' : ''}
                    autoFocus
                  />
                  {pinError && (
                    <p className="text-sm text-red-500">Mã PIN không đúng. Vui lòng thử lại.</p>
                  )}
                </div>
                <Button type="submit" className="w-full">
                  Unlock Statistics
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className={headerClasses}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Thống kê</h1>
              <p className="text-muted-foreground">
                Xem thống kê công tác phí, tip và mua sắm theo HDV, công ty, quốc tịch và tháng.
              </p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Bộ lọc</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 flex-1">
                <div>
                  <label className="mb-1 block text-sm font-medium text-muted-foreground">Guide</label>
                  <Select value={selectedGuide} onValueChange={setSelectedGuide}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tất cả HDV" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả HDV</SelectItem>
                      {availableGuides.map(guide => (
                        <SelectItem key={guide.id} value={guide.id}>
                          {guide.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-muted-foreground">Company</label>
                  <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tất cả công ty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả công ty</SelectItem>
                      {availableCompanies.map(company => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-muted-foreground">Nationality</label>
                  <Select value={selectedNationality} onValueChange={setSelectedNationality}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tất cả quốc tịch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả quốc tịch</SelectItem>
                      {availableNationalities.map(nationality => (
                        <SelectItem key={nationality.id} value={nationality.id}>
                          {nationality.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-muted-foreground">Month</label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tất cả tháng" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả tháng</SelectItem>
                      {availableMonths.map(month => (
                        <SelectItem key={month} value={month}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-muted-foreground">Actions</label>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={resetFilters}>
                      Reset filters
                    </Button>
                  </div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {filteredTours.length} tour phù hợp với bộ lọc hiện tại.
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Card className="bg-primary/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground"><StatColumnHelp {...statColumnHelp.totalTours} /></CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totals.tours}</div>
              <p className="text-xs text-muted-foreground">Tour được tính</p>
            </CardContent>
          </Card>
          <Card className="bg-primary/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground"><StatColumnHelp {...statColumnHelp.totalGuests} /></CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totals.guests}</div>
              <p className="text-xs text-muted-foreground">Adults + Children</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 dark:bg-blue-950">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground"><StatColumnHelp {...statColumnHelp.allowances} /></CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totals.allowances)}</div>
              <p className="text-xs text-muted-foreground">Tổng CTP</p>
            </CardContent>
          </Card>
          <Card className="bg-cyan-50 dark:bg-cyan-950">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground"><StatColumnHelp {...statColumnHelp.ctpOnly} /></CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totals.ctpOnly)}</div>
              <p className="text-xs text-muted-foreground">Category CTP only</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 dark:bg-green-950">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground"><StatColumnHelp {...statColumnHelp.guestTip} /></CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totals.tipFromGuests)}</div>
              <p className="text-xs text-muted-foreground">Mua sắm "TIP"</p>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 dark:bg-purple-950">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground"><StatColumnHelp {...statColumnHelp.companyTip} /></CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totals.companyTip)}</div>
              <p className="text-xs text-muted-foreground">Từ tổng kết</p>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 dark:bg-orange-950">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground"><StatColumnHelp {...statColumnHelp.shopping} /></CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totals.shoppings)}</div>
              <p className="text-xs text-muted-foreground">Không tính TIP</p>
            </CardContent>
          </Card>
          <Card className="bg-teal-50 dark:bg-teal-950">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                <StatColumnHelp {...statColumnHelp.incomeWithoutCarHotel} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totals.incomeWithoutCarHotel)}</div>
              <p className="text-xs text-muted-foreground">Guest Tip + Shopping + CTP only</p>
            </CardContent>
          </Card>
          <Card className="bg-amber-50 dark:bg-amber-950">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                <StatColumnHelp {...statColumnHelp.averageTipPerDay} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(averageTipPerDay)}</div>
              <p className="text-xs text-muted-foreground">(Guest + Company Tip) / days</p>
            </CardContent>
          </Card>
          <Card className="bg-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-primary break-words"><StatColumnHelp {...statColumnHelp.shopTipAllow} /></CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatCurrency(totals.totalShopTipAllow)}</div>
              <p className="text-xs text-muted-foreground">Shop+Tip+Allow</p>
            </CardContent>
          </Card>
        </div>

        {/* Final Total and Grand Total Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="bg-blue-100 dark:bg-blue-900 border-2 border-blue-400">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-100"><StatColumnHelp {...statColumnHelp.finalTotal} /></CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">{formatCurrency(totals.finalTotal)}</div>
              <p className="text-xs text-muted-foreground">{totals.tours} tour (bộ lọc hiện tại)</p>
            </CardContent>
          </Card>
          <Card className="bg-green-100 dark:bg-green-900 border-2 border-green-400">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-900 dark:text-green-100"><StatColumnHelp {...statColumnHelp.grandTotal} /></CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-900 dark:text-green-100">{formatCurrency(grandTotals.finalTotal)}</div>
              <p className="text-xs text-muted-foreground">{grandTotals.tours} tour trong cơ sở dữ liệu</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Statistics by Tour</CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full sm:w-auto">
                    <Columns3 className="mr-2 h-4 w-4" />
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Show columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {tourStatsColumns.map(column => (
                    <DropdownMenuCheckboxItem
                      key={column.key}
                      checked={tourStatsColumnVisibility[column.key]}
                      onCheckedChange={(checked) => setTourStatsColumnVisible(column.key, checked === true)}
                      onSelect={(event) => event.preventDefault()}
                    >
                      {column.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading statistics...</div>
            ) : tourStats.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No tours found for the selected filters.
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {tourStatsColumnVisibility.tour && <TableHead>Tour</TableHead>}
                      {tourStatsColumnVisibility.date && <TableHead>Date</TableHead>}
                      {tourStatsColumnVisibility.days && (
                        <TableHead className="text-right"><StatColumnHelp {...statColumnHelp.days} /></TableHead>
                      )}
                      {tourStatsColumnVisibility.client && <TableHead>Client</TableHead>}
                      {tourStatsColumnVisibility.guide && <TableHead>Guide</TableHead>}
                      {tourStatsColumnVisibility.company && <TableHead>Company</TableHead>}
                      {tourStatsColumnVisibility.allowances && <TableHead className="text-right"><StatColumnHelp {...statColumnHelp.allowances} /></TableHead>}
                      {tourStatsColumnVisibility.guestTip && <TableHead className="text-right"><StatColumnHelp {...statColumnHelp.guestTip} /></TableHead>}
                      {tourStatsColumnVisibility.companyTip && <TableHead className="text-right"><StatColumnHelp {...statColumnHelp.companyTip} /></TableHead>}
                      {tourStatsColumnVisibility.shopping && <TableHead className="text-right"><StatColumnHelp {...statColumnHelp.shopping} /></TableHead>}
                      {tourStatsColumnVisibility.ctpOnly && (
                        <TableHead className="text-right">
                          <StatColumnHelp {...statColumnHelp.ctpOnly} />
                        </TableHead>
                      )}
                      {tourStatsColumnVisibility.incomeWithoutCarHotel && (
                        <TableHead className="text-right"><StatColumnHelp {...statColumnHelp.incomeWithoutCarHotel} /></TableHead>
                      )}
                      {tourStatsColumnVisibility.shopTipAllow && (
                        <TableHead className="text-right font-semibold">
                          <StatColumnHelp {...statColumnHelp.shopTipAllow} />
                        </TableHead>
                      )}
                      {tourStatsColumnVisibility.finalTotal && (
                        <TableHead className="text-right font-bold bg-blue-100 dark:bg-blue-900"><StatColumnHelp {...statColumnHelp.finalTotal} /></TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tourStats.map(tour => (
                      <TableRow key={tour.id}>
                        {tourStatsColumnVisibility.tour && (
                          <TableCell className="font-medium">
                            <Link
                              to={`/tours/${tour.id}`}
                              className="text-primary underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                            >
                              {tour.tourCode}
                            </Link>
                          </TableCell>
                        )}
                        {tourStatsColumnVisibility.date && <TableCell>{tour.startDate}</TableCell>}
                        {tourStatsColumnVisibility.days && <TableCell className="text-right">{tour.totalDays}</TableCell>}
                        {tourStatsColumnVisibility.client && <TableCell>{tour.clientName}</TableCell>}
                        {tourStatsColumnVisibility.guide && <TableCell>{tour.guideName}</TableCell>}
                        {tourStatsColumnVisibility.company && <TableCell>{tour.companyName}</TableCell>}
                        {tourStatsColumnVisibility.allowances && <TableCell className="text-right">{formatCurrency(tour.totalAllowances)}</TableCell>}
                        {tourStatsColumnVisibility.guestTip && <TableCell className="text-right">{formatCurrency(tour.totalTipFromGuests)}</TableCell>}
                        {tourStatsColumnVisibility.companyTip && <TableCell className="text-right">{formatCurrency(tour.totalCompanyTip)}</TableCell>}
                        {tourStatsColumnVisibility.shopping && <TableCell className="text-right">{formatCurrency(tour.totalShoppings)}</TableCell>}
                        {tourStatsColumnVisibility.ctpOnly && <TableCell className="text-right">{formatCurrency(tour.totalCtpOnly)}</TableCell>}
                        {tourStatsColumnVisibility.incomeWithoutCarHotel && (
                          <TableCell className="text-right font-medium">{formatCurrency(tour.incomeWithoutCarHotel)}</TableCell>
                        )}
                        {tourStatsColumnVisibility.shopTipAllow && (
                          <TableCell className="text-right font-semibold text-primary">{formatCurrency(tour.totalShopTipAllow)}</TableCell>
                        )}
                        {tourStatsColumnVisibility.finalTotal && (
                          <TableCell className="text-right font-bold text-blue-600 dark:text-blue-400">{formatCurrency(tour.finalTotal)}</TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      {tourStatsColumnVisibility.tour && (
                        <TableCell className="font-bold">{renderTourStatsTotalLabel('tour')}</TableCell>
                      )}
                      {tourStatsColumnVisibility.date && (
                        <TableCell className="font-bold">{renderTourStatsTotalLabel('date')}</TableCell>
                      )}
                      {tourStatsColumnVisibility.days && (
                        <TableCell className="text-right font-bold">{totals.days}</TableCell>
                      )}
                      {tourStatsColumnVisibility.client && (
                        <TableCell className="font-bold">{renderTourStatsTotalLabel('client')}</TableCell>
                      )}
                      {tourStatsColumnVisibility.guide && (
                        <TableCell className="font-bold">{renderTourStatsTotalLabel('guide')}</TableCell>
                      )}
                      {tourStatsColumnVisibility.company && (
                        <TableCell className="font-bold">{renderTourStatsTotalLabel('company')}</TableCell>
                      )}
                      {tourStatsColumnVisibility.allowances && (
                        <TableCell className="text-right font-bold">{formatCurrency(totals.allowances)}</TableCell>
                      )}
                      {tourStatsColumnVisibility.guestTip && (
                        <TableCell className="text-right font-bold">{formatCurrency(totals.tipFromGuests)}</TableCell>
                      )}
                      {tourStatsColumnVisibility.companyTip && (
                        <TableCell className="text-right font-bold">{formatCurrency(totals.companyTip)}</TableCell>
                      )}
                      {tourStatsColumnVisibility.shopping && (
                        <TableCell className="text-right font-bold">{formatCurrency(totals.shoppings)}</TableCell>
                      )}
                      {tourStatsColumnVisibility.ctpOnly && (
                        <TableCell className="text-right font-bold">{formatCurrency(totals.ctpOnly)}</TableCell>
                      )}
                      {tourStatsColumnVisibility.incomeWithoutCarHotel && (
                        <TableCell className="text-right font-bold">{formatCurrency(totals.incomeWithoutCarHotel)}</TableCell>
                      )}
                      {tourStatsColumnVisibility.shopTipAllow && (
                        <TableCell className="text-right font-bold text-primary">{formatCurrency(totals.totalShopTipAllow)}</TableCell>
                      )}
                      {tourStatsColumnVisibility.finalTotal && (
                        <TableCell className="text-right font-bold text-blue-600 dark:text-blue-400">{formatCurrency(totals.finalTotal)}</TableCell>
                      )}
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Thống kê theo Hướng dẫn viên</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Đang tải thống kê...</div>
            ) : guideStats.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No tours found for the selected filters.
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hướng dẫn viên</TableHead>
                      <TableHead className="text-right"><StatColumnHelp {...statColumnHelp.totalTours} /></TableHead>
                      <TableHead className="text-right"><StatColumnHelp {...statColumnHelp.allowances} /></TableHead>
                      <TableHead className="text-right"><StatColumnHelp {...statColumnHelp.guestTip} /></TableHead>
                      <TableHead className="text-right"><StatColumnHelp {...statColumnHelp.companyTip} /></TableHead>
                      <TableHead className="text-right"><StatColumnHelp {...statColumnHelp.shopping} /></TableHead>
                      <TableHead className="text-right">
                        <StatColumnHelp {...statColumnHelp.ctpOnly} />
                      </TableHead>
                      <TableHead className="text-right">
                        <StatColumnHelp {...statColumnHelp.incomeWithoutCarHotel} />
                      </TableHead>
                      <TableHead className="text-right font-semibold">
                        <StatColumnHelp {...statColumnHelp.shopTipAllow} />
                      </TableHead>
                      <TableHead className="text-right font-bold bg-blue-100 dark:bg-blue-900"><StatColumnHelp {...statColumnHelp.finalTotal} /></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {guideStats.map(guide => (
                      <TableRow key={guide.id}>
                        <TableCell>{guide.name}</TableCell>
                        <TableCell className="text-right">{guide.totalTours}</TableCell>
                        <TableCell className="text-right">{formatCurrency(guide.totalAllowances)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(guide.totalTipFromGuests)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(guide.totalCompanyTip)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(guide.totalShoppings)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(guide.totalCtpOnly)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(guide.totalIncomeWithoutCarHotel)}</TableCell>
                        <TableCell className="text-right font-semibold text-primary">{formatCurrency(guide.totalShopTipAllow)}</TableCell>
                        <TableCell className="text-right font-bold text-blue-600 dark:text-blue-400">{formatCurrency(guide.finalTotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Thống kê theo Công ty</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Đang tải thống kê...</div>
            ) : companyStats.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No tours found for the selected filters.
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Công ty</TableHead>
                      <TableHead className="text-right"><StatColumnHelp {...statColumnHelp.totalTours} /></TableHead>
                      <TableHead className="text-right"><StatColumnHelp {...statColumnHelp.allowances} /></TableHead>
                      <TableHead className="text-right"><StatColumnHelp {...statColumnHelp.guestTip} /></TableHead>
                      <TableHead className="text-right"><StatColumnHelp {...statColumnHelp.companyTip} /></TableHead>
                      <TableHead className="text-right"><StatColumnHelp {...statColumnHelp.shopping} /></TableHead>
                      <TableHead className="text-right">
                        <StatColumnHelp {...statColumnHelp.ctpOnly} />
                      </TableHead>
                      <TableHead className="text-right">
                        <StatColumnHelp {...statColumnHelp.incomeWithoutCarHotel} />
                      </TableHead>
                      <TableHead className="text-right font-semibold">
                        <StatColumnHelp {...statColumnHelp.shopTipAllow} />
                      </TableHead>
                      <TableHead className="text-right font-bold bg-blue-100 dark:bg-blue-900"><StatColumnHelp {...statColumnHelp.finalTotal} /></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companyStats.map(company => (
                      <TableRow key={company.id}>
                        <TableCell>{company.name}</TableCell>
                        <TableCell className="text-right">{company.totalTours}</TableCell>
                        <TableCell className="text-right">{formatCurrency(company.totalAllowances)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(company.totalTipFromGuests)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(company.totalCompanyTip)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(company.totalShoppings)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(company.totalCtpOnly)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(company.totalIncomeWithoutCarHotel)}</TableCell>
                        <TableCell className="text-right font-semibold text-primary">{formatCurrency(company.totalShopTipAllow)}</TableCell>
                        <TableCell className="text-right font-bold text-blue-600 dark:text-blue-400">{formatCurrency(company.finalTotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Thống kê theo Tháng</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Đang tải thống kê...</div>
            ) : monthlyStats.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No tours found for the selected filters.
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tháng</TableHead>
                      <TableHead className="text-right"><StatColumnHelp {...statColumnHelp.totalTours} /></TableHead>
                      <TableHead className="text-right"><StatColumnHelp {...statColumnHelp.allowances} /></TableHead>
                      <TableHead className="text-right"><StatColumnHelp {...statColumnHelp.guestTip} /></TableHead>
                      <TableHead className="text-right"><StatColumnHelp {...statColumnHelp.companyTip} /></TableHead>
                      <TableHead className="text-right"><StatColumnHelp {...statColumnHelp.shopping} /></TableHead>
                      <TableHead className="text-right">
                        <StatColumnHelp {...statColumnHelp.ctpOnly} />
                      </TableHead>
                      <TableHead className="text-right">
                        <StatColumnHelp {...statColumnHelp.incomeWithoutCarHotel} />
                      </TableHead>
                      <TableHead className="text-right font-semibold">
                        <StatColumnHelp {...statColumnHelp.shopTipAllow} />
                      </TableHead>
                      <TableHead className="text-right font-bold bg-blue-100 dark:bg-blue-900"><StatColumnHelp {...statColumnHelp.finalTotal} /></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyStats.map(month => (
                      <TableRow key={month.month}>
                        <TableCell>{month.month}</TableCell>
                        <TableCell className="text-right">{month.totalTours}</TableCell>
                        <TableCell className="text-right">{formatCurrency(month.totalAllowances)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(month.totalTipFromGuests)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(month.totalCompanyTip)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(month.totalShoppings)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(month.totalCtpOnly)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(month.totalIncomeWithoutCarHotel)}</TableCell>
                        <TableCell className="text-right font-semibold text-primary">{formatCurrency(month.totalShopTipAllow)}</TableCell>
                        <TableCell className="text-right font-bold text-blue-600 dark:text-blue-400">{formatCurrency(month.finalTotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Thống kê theo Quốc tịch</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Đang tải thống kê...</div>
            ) : nationalityStats.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No tours found for the selected filters.
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Quốc tịch</TableHead>
                      <TableHead className="text-right"><StatColumnHelp {...statColumnHelp.totalTours} /></TableHead>
                      <TableHead className="text-right"><StatColumnHelp {...statColumnHelp.allowances} /></TableHead>
                      <TableHead className="text-right"><StatColumnHelp {...statColumnHelp.guestTip} /></TableHead>
                      <TableHead className="text-right"><StatColumnHelp {...statColumnHelp.companyTip} /></TableHead>
                      <TableHead className="text-right"><StatColumnHelp {...statColumnHelp.shopping} /></TableHead>
                      <TableHead className="text-right">
                        <StatColumnHelp {...statColumnHelp.ctpOnly} />
                      </TableHead>
                      <TableHead className="text-right">
                        <StatColumnHelp {...statColumnHelp.incomeWithoutCarHotel} />
                      </TableHead>
                      <TableHead className="text-right font-semibold">
                        <StatColumnHelp {...statColumnHelp.shopTipAllow} />
                      </TableHead>
                      <TableHead className="text-right font-bold bg-blue-100 dark:bg-blue-900"><StatColumnHelp {...statColumnHelp.finalTotal} /></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nationalityStats.map(nationality => (
                      <TableRow key={nationality.id}>
                        <TableCell>{nationality.name}</TableCell>
                        <TableCell className="text-right">{nationality.totalTours}</TableCell>
                        <TableCell className="text-right">{formatCurrency(nationality.totalAllowances)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(nationality.totalTipFromGuests)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(nationality.totalCompanyTip)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(nationality.totalShoppings)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(nationality.totalCtpOnly)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(nationality.totalIncomeWithoutCarHotel)}</TableCell>
                        <TableCell className="text-right font-semibold text-primary">{formatCurrency(nationality.totalShopTipAllow)}</TableCell>
                        <TableCell className="text-right font-bold text-blue-600 dark:text-blue-400">{formatCurrency(nationality.finalTotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Statistics;


