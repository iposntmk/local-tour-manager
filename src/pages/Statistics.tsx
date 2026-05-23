import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { getSupabaseClient } from '@/lib/datastore/supabase-client';
import { useHeaderMode } from '@/hooks/useHeaderMode';
import {
  DEFAULT_COMPANY_NAME,
  DEFAULT_GUIDE_NAME,
  UNKNOWN_MONTH,
  calculateAllowanceTotal,
  calculateCompanyTip,
  calculateCtpOnlyTotal,
  calculateShoppingTotal,
  calculateTipTotal,
  calculateTourDateDiff,
  defaultTourStatsColumnVisibility,
  getTourNationalities,
  getTourMonth,
  isCtpDetailedExpense,
  normalizeCompany,
  normalizeGuide,
  normalizeLandOperator,
  normalizeStatKey,
  type GroupStatsRow,
  type StatsTotals,
  type TourStatsColumnKey,
  type TourStatsRow,
} from '@/components/statistics/shared';
import { PinGate } from '@/components/statistics/PinGate';
import { StatsFilterBar } from '@/components/statistics/StatsFilterBar';
import { KpiStrip } from '@/components/statistics/KpiStrip';
import { MonthlyTrendChart } from '@/components/statistics/charts/MonthlyTrendChart';
import { TopRankChart } from '@/components/statistics/charts/TopRankChart';
import { ShareRowList } from '@/components/statistics/charts/ShareRowList';
import { TourStatsTable } from '@/components/statistics/tables/TourStatsTable';
import { GroupStatsTable } from '@/components/statistics/tables/GroupStatsTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Statistics = () => {
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  const [isUnlocked, setIsUnlocked] = useState(() => sessionStorage.getItem('statistics.unlocked') === 'true');

  const { data: toursResult, isLoading } = useQuery({
    queryKey: ['statistics', 'tours'],
    queryFn: () => store.listTours(undefined, { includeDetails: true }),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });
  const tours = useMemo(() => toursResult?.tours ?? [], [toursResult]);

  const { data: detailedExpenses = [] } = useQuery({
    queryKey: ['statistics', 'detailed-expenses'],
    queryFn: () => store.listDetailedExpenses({}),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });

  const [selectedGuide, setSelectedGuide] = useState('all');
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [selectedLandOperator, setSelectedLandOperator] = useState('all');
  const [selectedNationality, setSelectedNationality] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [hasAppliedDefaultFilters, setHasAppliedDefaultFilters] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState(defaultTourStatsColumnVisibility);

  // Realtime: invalidate queries on relevant table changes.
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tour_nationalities' }, () => {
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

  const ctpExpenseNames = useMemo(
    () => new Set(detailedExpenses.filter(isCtpDetailedExpense).map((e) => normalizeStatKey(e.name))),
    [detailedExpenses],
  );

  const availableGuides = useMemo(() => {
    const m = new Map<string, string>();
    tours.forEach((t) => {
      const g = normalizeGuide(t);
      m.set(g.id, g.name);
    });
    return Array.from(m.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [tours]);

  const availableCompanies = useMemo(() => {
    const m = new Map<string, string>();
    tours.forEach((t) => {
      const c = normalizeCompany(t);
      m.set(c.id, c.name);
    });
    return Array.from(m.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [tours]);

  const availableLandOperators = useMemo(() => {
    const m = new Map<string, string>();
    tours.forEach((t) => {
      const lo = normalizeLandOperator(t);
      m.set(lo.id, lo.name);
    });
    return Array.from(m.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [tours]);

  const availableNationalities = useMemo(() => {
    const m = new Map<string, string>();
    tours.forEach((t) => {
      getTourNationalities(t).forEach((n) => {
        m.set(n.id, n.name);
      });
    });
    return Array.from(m.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [tours]);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    tours.forEach((t) => {
      const m = getTourMonth(t);
      if (m !== UNKNOWN_MONTH) months.add(m);
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [tours]);

  // Apply default filters once both lookups are populated.
  useEffect(() => {
    if (hasAppliedDefaultFilters || availableGuides.length === 0 || availableCompanies.length === 0) return;
    const defaultGuide = availableGuides.find((g) => g.name === DEFAULT_GUIDE_NAME);
    const defaultCompany = availableCompanies.find((c) => c.name === DEFAULT_COMPANY_NAME);
    if (defaultGuide) setSelectedGuide(defaultGuide.id);
    if (defaultCompany) setSelectedCompany(defaultCompany.id);
    setHasAppliedDefaultFilters(true);
  }, [availableGuides, availableCompanies, hasAppliedDefaultFilters]);

  const filteredTours = useMemo(() => {
    return tours.filter((t) => {
      const g = normalizeGuide(t);
      const c = normalizeCompany(t);
      const lo = normalizeLandOperator(t);
      const nationalityIds = new Set(getTourNationalities(t).map((n) => n.id));
      const m = getTourMonth(t);
      return (
        (selectedGuide === 'all' || g.id === selectedGuide) &&
        (selectedCompany === 'all' || c.id === selectedCompany) &&
        (selectedLandOperator === 'all' || lo.id === selectedLandOperator) &&
        (selectedNationality === 'all' || nationalityIds.has(selectedNationality)) &&
        (selectedMonth === 'all' || m === selectedMonth)
      );
    });
  }, [tours, selectedGuide, selectedCompany, selectedLandOperator, selectedNationality, selectedMonth]);

  const totals = useMemo<StatsTotals>(() => {
    return filteredTours.reduce(
      (acc, tour) => {
        const allowances = calculateAllowanceTotal(tour);
        const tipFromGuests = calculateTipTotal(tour);
        const companyTip = calculateCompanyTip(tour);
        const shoppings = calculateShoppingTotal(tour);
        const ctpOnly = calculateCtpOnlyTotal(tour, ctpExpenseNames);
        const finalTotal = tour.summary?.finalTotal ?? 0;
        acc.allowances += allowances;
        acc.ctpOnly += ctpOnly;
        acc.incomeWithoutCarHotel += tipFromGuests + shoppings + ctpOnly;
        acc.tipFromGuests += tipFromGuests;
        acc.companyTip += companyTip;
        acc.shoppings += shoppings;
        acc.totalShopTipAllow += allowances + tipFromGuests + companyTip + shoppings;
        acc.finalTotal += finalTotal;
        acc.tours += 1;
        acc.guests += tour.totalGuests ?? 0;
        acc.days += calculateTourDateDiff(tour);
        return acc;
      },
      {
        allowances: 0,
        ctpOnly: 0,
        incomeWithoutCarHotel: 0,
        tipFromGuests: 0,
        companyTip: 0,
        shoppings: 0,
        totalShopTipAllow: 0,
        finalTotal: 0,
        tours: 0,
        guests: 0,
        days: 0,
      },
    );
  }, [filteredTours, ctpExpenseNames]);

  const averageTipPerDay = totals.days > 0 ? (totals.tipFromGuests + totals.companyTip) / totals.days : 0;

  const grandTotals = useMemo(() => {
    return tours.reduce(
      (acc, t) => {
        acc.finalTotal += t.summary?.finalTotal ?? 0;
        acc.tours += 1;
        return acc;
      },
      { finalTotal: 0, tours: 0 },
    );
  }, [tours]);

  // Build group stats with a shared shape so tables can reuse one component.
  const buildGroupStats = (key: 'guide' | 'company' | 'landOperator' | 'nationality' | 'month'): GroupStatsRow[] => {
    const map = new Map<string, GroupStatsRow>();
    filteredTours.forEach((tour) => {
      const allowances = calculateAllowanceTotal(tour);
      const tipFromGuests = calculateTipTotal(tour);
      const companyTip = calculateCompanyTip(tour);
      const shoppings = calculateShoppingTotal(tour);
      const ctpOnly = calculateCtpOnlyTotal(tour, ctpExpenseNames);
      const finalTotal = tour.summary?.finalTotal ?? 0;

      if (key === 'nationality') {
        const nationalities = getTourNationalities(tour);
        const paxTotal = nationalities.reduce((sum, n) => sum + n.paxCount, 0);
        nationalities.forEach((n) => {
          const ratio = paxTotal > 0 ? n.paxCount / paxTotal : 1 / Math.max(nationalities.length, 1);
          if (!map.has(n.id)) {
            map.set(n.id, {
              key: n.id,
              label: n.name,
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
          const entry = map.get(n.id)!;
          entry.totalTours += 1;
          entry.totalAllowances += allowances * ratio;
          entry.totalCtpOnly += ctpOnly * ratio;
          entry.totalIncomeWithoutCarHotel += (tipFromGuests + shoppings + ctpOnly) * ratio;
          entry.totalTipFromGuests += tipFromGuests * ratio;
          entry.totalCompanyTip += companyTip * ratio;
          entry.totalShoppings += shoppings * ratio;
          entry.totalShopTipAllow += (allowances + tipFromGuests + companyTip + shoppings) * ratio;
          entry.finalTotal += finalTotal * ratio;
        });
        return;
      }

      let k: string;
      let label: string;
      if (key === 'guide') {
        const g = normalizeGuide(tour);
        k = g.id;
        label = g.name;
      } else if (key === 'company') {
        const c = normalizeCompany(tour);
        k = c.id;
        label = c.name;
      } else if (key === 'landOperator') {
        const lo = normalizeLandOperator(tour);
        k = lo.id;
        label = lo.name;
      } else {
        k = getTourMonth(tour);
        label = k;
      }

      if (!map.has(k)) {
        map.set(k, {
          key: k,
          label,
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
      const entry = map.get(k)!;
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

    const arr = Array.from(map.values());
    if (key === 'month') {
      arr.sort((a, b) => {
        if (a.key === UNKNOWN_MONTH) return 1;
        if (b.key === UNKNOWN_MONTH) return -1;
        return b.key.localeCompare(a.key);
      });
    } else {
      arr.sort((a, b) => b.finalTotal - a.finalTotal);
    }
    return arr;
  };

  const guideStats = useMemo(() => buildGroupStats('guide'), [filteredTours, ctpExpenseNames]);
  const companyStats = useMemo(() => buildGroupStats('company'), [filteredTours, ctpExpenseNames]);
  const landOperatorStats = useMemo(() => buildGroupStats('landOperator'), [filteredTours, ctpExpenseNames]);
  const nationalityStats = useMemo(() => buildGroupStats('nationality'), [filteredTours, ctpExpenseNames]);
  const monthlyStats = useMemo(() => buildGroupStats('month'), [filteredTours, ctpExpenseNames]);

  const companyLandOperatorStats = useMemo<GroupStatsRow[]>(() => {
    const map = new Map<string, GroupStatsRow>();
    filteredTours.forEach((tour) => {
      const allowances = calculateAllowanceTotal(tour);
      const tipFromGuests = calculateTipTotal(tour);
      const companyTip = calculateCompanyTip(tour);
      const shoppings = calculateShoppingTotal(tour);
      const ctpOnly = calculateCtpOnlyTotal(tour, ctpExpenseNames);
      const finalTotal = tour.summary?.finalTotal ?? 0;

      const c = normalizeCompany(tour);
      const lo = normalizeLandOperator(tour);
      const k = `${c.id}__${lo.id}`;
      const label = `${c.name} → ${lo.name}`;

      if (!map.has(k)) {
        map.set(k, {
          key: k,
          label,
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
      const entry = map.get(k)!;
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

  const tourStats = useMemo<TourStatsRow[]>(() => {
    return filteredTours
      .map((tour) => {
        const allowances = calculateAllowanceTotal(tour);
        const tipFromGuests = calculateTipTotal(tour);
        const companyTip = calculateCompanyTip(tour);
        const shoppings = calculateShoppingTotal(tour);
        const ctpOnly = calculateCtpOnlyTotal(tour, ctpExpenseNames);
        return {
          id: tour.id,
          tourCode: tour.tourCode,
          startDate: tour.startDate,
          totalDays: calculateTourDateDiff(tour),
          clientName: tour.clientName,
          guideName: normalizeGuide(tour).name,
          companyName: normalizeCompany(tour).name,
          landOperatorName: normalizeLandOperator(tour).name,
          totalAllowances: allowances,
          totalCtpOnly: ctpOnly,
          totalTipFromGuests: tipFromGuests,
          totalCompanyTip: companyTip,
          totalShoppings: shoppings,
          totalShopTipAllow: allowances + tipFromGuests + companyTip + shoppings,
          incomeWithoutCarHotel: tipFromGuests + shoppings + ctpOnly,
          finalTotal: tour.summary?.finalTotal ?? 0,
        };
      })
      .sort((a, b) => {
        const dc = a.startDate.localeCompare(b.startDate);
        if (dc !== 0) return dc;
        return a.tourCode.localeCompare(b.tourCode);
      });
  }, [filteredTours, ctpExpenseNames]);

  const { classes: headerClasses } = useHeaderMode('statistics.headerMode');

  const resetFilters = () => {
    setSelectedGuide('all');
    setSelectedCompany('all');
    setSelectedLandOperator('all');
    setSelectedNationality('all');
    setSelectedMonth('all');
  };

  const handleColumnVisibility = (key: TourStatsColumnKey, visible: boolean) =>
    setColumnVisibility((prev) => ({ ...prev, [key]: visible }));

  if (!isUnlocked) {
    return (
      <>
        <PinGate onUnlock={() => setIsUnlocked(true)} />
      </>
    );
  }

  return (
    <>
      <div className="space-y-6 md:space-y-8">
        {/* Page heading */}
        <div className={headerClasses}>
          <div className="flex flex-col gap-2 md:gap-1">
            <h1 className="text-2xl font-bold md:text-3xl">Thống kê</h1>
            <p className="text-sm text-muted-foreground">
              Doanh thu, CTP, tip và mua sắm theo HDV, công ty mẹ, land tour, quốc tịch và tháng — cập nhật realtime.
            </p>
          </div>
        </div>

        {/* Filters */}
        <StatsFilterBar
          guides={availableGuides}
          companies={availableCompanies}
          landOperators={availableLandOperators}
          nationalities={availableNationalities}
          months={availableMonths}
          selectedGuide={selectedGuide}
          selectedCompany={selectedCompany}
          selectedLandOperator={selectedLandOperator}
          selectedNationality={selectedNationality}
          selectedMonth={selectedMonth}
          onGuideChange={setSelectedGuide}
          onCompanyChange={setSelectedCompany}
          onLandOperatorChange={setSelectedLandOperator}
          onNationalityChange={setSelectedNationality}
          onMonthChange={setSelectedMonth}
          onReset={resetFilters}
          matchedCount={filteredTours.length}
        />

        {/* KPI strip */}
        <KpiStrip
          totals={totals}
          averageTipPerDay={averageTipPerDay}
          grandTotalFinalTotal={grandTotals.finalTotal}
          grandTotalTours={grandTotals.tours}
        />

        <Tabs defaultValue="chart" className="w-full">
          <TabsList className="w-full grid grid-cols-2 md:inline-flex md:w-auto">
            <TabsTrigger value="chart">Biểu đồ</TabsTrigger>
            <TabsTrigger value="table">Bảng dữ liệu</TabsTrigger>
          </TabsList>

          <TabsContent value="chart" className="space-y-6 md:space-y-8">
            <div className="grid grid-cols-1 gap-6 md:gap-8 lg:grid-cols-2">
              <div className="lg:col-span-2">
                <MonthlyTrendChart data={monthlyStats} />
              </div>
              <TopRankChart title="Top HDV theo Final Total" description="5 HDV có doanh thu cao nhất" data={guideStats} />
              <TopRankChart title="Top công ty mẹ theo Final Total" description="5 công ty mẹ đóng góp doanh thu cao nhất" data={companyStats} />
            </div>

            <div className="space-y-6 md:space-y-8">
              <ShareRowList title="Phân bổ theo công ty mẹ" description="% Final Total mỗi công ty mẹ đóng góp — bấm sort để đảo chiều" data={companyStats} />
              <ShareRowList title="Phân bổ theo quốc tịch" description="% Final Total theo quốc tịch khách — bấm sort để đảo chiều" data={nationalityStats} />
            </div>
          </TabsContent>

          <TabsContent value="table" className="space-y-6 md:space-y-8">
            <TourStatsTable
              rows={tourStats}
              totals={totals}
              visibility={columnVisibility}
              onVisibilityChange={handleColumnVisibility}
              isLoading={isLoading}
            />
            <GroupStatsTable title="Thống kê theo HDV" firstColumnLabel="Hướng dẫn viên" rows={guideStats} isLoading={isLoading} />
            <GroupStatsTable title="Thống kê theo công ty mẹ (bán tour)" firstColumnLabel="Công ty mẹ" rows={companyStats} isLoading={isLoading} />
            <GroupStatsTable title="Thống kê theo công ty land tour" firstColumnLabel="Land operator" rows={landOperatorStats} isLoading={isLoading} />
            <GroupStatsTable title="Thống kê theo cặp Công ty mẹ × Land operator" firstColumnLabel="Công ty mẹ → Land" rows={companyLandOperatorStats} isLoading={isLoading} />
            <GroupStatsTable title="Thống kê theo tháng" firstColumnLabel="Tháng" rows={monthlyStats} isLoading={isLoading} />
            <GroupStatsTable title="Thống kê theo quốc tịch" firstColumnLabel="Quốc tịch" rows={nationalityStats} isLoading={isLoading} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default Statistics;
