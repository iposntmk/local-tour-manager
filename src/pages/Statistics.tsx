import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { store } from '@/lib/datastore';
import { useHeaderMode } from '@/hooks/useHeaderMode';
import type { Tour } from '@/types/tour';

const UNKNOWN_GUIDE_ID = '__unknown_guide__';
const UNKNOWN_COMPANY_ID = '__unknown_company__';
const UNKNOWN_MONTH = 'Unknown';

const formatCurrency = (value: number) => `${value.toLocaleString()} ₫`;

const calculateAllowanceTotal = (tour: Tour) =>
  (tour.allowances || []).reduce(
    (sum, allowance) => sum + allowance.price * (allowance.quantity ?? 1),
    0
  );

const getTourMonth = (tour: Tour) => (tour.startDate ? tour.startDate.slice(0, 7) : UNKNOWN_MONTH);

const normalizeGuide = (tour: Tour) => ({
  id: tour.guideRef?.id || UNKNOWN_GUIDE_ID,
  name: tour.guideRef?.nameAtBooking?.trim() || 'Unknown guide',
});

const normalizeCompany = (tour: Tour) => ({
  id: tour.companyRef?.id || UNKNOWN_COMPANY_ID,
  name: tour.companyRef?.nameAtBooking?.trim() || 'Unknown company',
});

const Statistics = () => {
  const { data: toursResult, isLoading } = useQuery({
    queryKey: ['statistics', 'tours'],
    queryFn: () => store.listTours(undefined, { includeDetails: true }),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });

  const tours = toursResult?.tours ?? [];

  const [selectedGuide, setSelectedGuide] = useState('all');
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');

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
      const month = getTourMonth(tour);

      const matchesGuide = selectedGuide === 'all' || guide.id === selectedGuide;
      const matchesCompany = selectedCompany === 'all' || company.id === selectedCompany;
      const matchesMonth = selectedMonth === 'all' || month === selectedMonth;

      return matchesGuide && matchesCompany && matchesMonth;
    });
  }, [tours, selectedGuide, selectedCompany, selectedMonth]);

  const totals = useMemo(() => {
    return filteredTours.reduce(
      (acc, tour) => {
        const revenue = calculateAllowanceTotal(tour);
        const tip = tour.summary?.companyTip ?? 0;
        acc.revenue += revenue;
        acc.tip += tip;
        acc.tours += 1;
        acc.guests += tour.totalGuests ?? 0;
        return acc;
      },
      { revenue: 0, tip: 0, tours: 0, guests: 0 }
    );
  }, [filteredTours]);

  const guideStats = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; totalTours: number; totalRevenue: number; totalTip: number }
    >();

    filteredTours.forEach(tour => {
      const guide = normalizeGuide(tour);
      const revenue = calculateAllowanceTotal(tour);
      const tip = tour.summary?.companyTip ?? 0;

      if (!map.has(guide.id)) {
        map.set(guide.id, {
          id: guide.id,
          name: guide.name,
          totalTours: 0,
          totalRevenue: 0,
          totalTip: 0,
        });
      }

      const entry = map.get(guide.id)!;
      entry.totalTours += 1;
      entry.totalRevenue += revenue;
      entry.totalTip += tip;
    });

    return Array.from(map.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [filteredTours]);

  const companyStats = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; totalTours: number; totalRevenue: number; totalTip: number }
    >();

    filteredTours.forEach(tour => {
      const company = normalizeCompany(tour);
      const revenue = calculateAllowanceTotal(tour);
      const tip = tour.summary?.companyTip ?? 0;

      if (!map.has(company.id)) {
        map.set(company.id, {
          id: company.id,
          name: company.name,
          totalTours: 0,
          totalRevenue: 0,
          totalTip: 0,
        });
      }

      const entry = map.get(company.id)!;
      entry.totalTours += 1;
      entry.totalRevenue += revenue;
      entry.totalTip += tip;
    });

    return Array.from(map.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [filteredTours]);

  const monthlyStats = useMemo(() => {
    const map = new Map<
      string,
      { month: string; totalTours: number; totalRevenue: number; totalTip: number }
    >();

    filteredTours.forEach(tour => {
      const month = getTourMonth(tour);
      const revenue = calculateAllowanceTotal(tour);
      const tip = tour.summary?.companyTip ?? 0;

      if (!map.has(month)) {
        map.set(month, {
          month,
          totalTours: 0,
          totalRevenue: 0,
          totalTip: 0,
        });
      }

      const entry = map.get(month)!;
      entry.totalTours += 1;
      entry.totalRevenue += revenue;
      entry.totalTip += tip;
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.month === UNKNOWN_MONTH) return 1;
      if (b.month === UNKNOWN_MONTH) return -1;
      return b.month.localeCompare(a.month);
    });
  }, [filteredTours]);

  const { classes: headerClasses } = useHeaderMode('statistics.headerMode');

  const resetFilters = () => {
    setSelectedGuide('all');
    setSelectedCompany('all');
    setSelectedMonth('all');
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className={headerClasses}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Statistics</h1>
              <p className="text-muted-foreground">
                Review revenue (allowances) and tip performance by guide, month, and company.
              </p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 flex-1">
                <div>
                  <label className="mb-1 block text-sm font-medium text-muted-foreground">Guide</label>
                  <Select value={selectedGuide} onValueChange={setSelectedGuide}>
                    <SelectTrigger>
                      <SelectValue placeholder="All guides" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All guides</SelectItem>
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
                      <SelectValue placeholder="All companies" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All companies</SelectItem>
                      {availableCompanies.map(company => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-muted-foreground">Month</label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger>
                      <SelectValue placeholder="All months" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All months</SelectItem>
                      {availableMonths.map(month => (
                        <SelectItem key={month} value={month}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-muted-foreground">Overview</label>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={resetFilters}>
                      Reset filters
                    </Button>
                  </div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {filteredTours.length} tour(s) match the current filters.
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="bg-primary/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Tours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totals.tours}</div>
              <p className="text-xs text-muted-foreground">Tours included in the report</p>
            </CardContent>
          </Card>
          <Card className="bg-primary/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Guests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totals.guests}</div>
              <p className="text-xs text-muted-foreground">Combined adults and children</p>
            </CardContent>
          </Card>
          <Card className="bg-primary/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Allowance (CTP)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatCurrency(totals.revenue)}</div>
              <p className="text-xs text-muted-foreground">Sum of allowance entries</p>
            </CardContent>
          </Card>
          <Card className="bg-primary/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Tip</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatCurrency(totals.tip)}</div>
              <p className="text-xs text-muted-foreground">Sum of company tip amounts</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Statistics by Guide</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading statistics...</div>
            ) : guideStats.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No tours found for the selected filters.
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Guide</TableHead>
                      <TableHead className="text-right">Tours</TableHead>
                      <TableHead className="text-right">Allowance (CTP)</TableHead>
                      <TableHead className="text-right">Total Tip</TableHead>
                      <TableHead className="text-right">Avg. Tip / Tour</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {guideStats.map(guide => (
                      <TableRow key={guide.id}>
                        <TableCell>{guide.name}</TableCell>
                        <TableCell className="text-right">{guide.totalTours}</TableCell>
                        <TableCell className="text-right">{formatCurrency(guide.totalRevenue)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(guide.totalTip)}</TableCell>
                        <TableCell className="text-right">
                          {guide.totalTours > 0 ? formatCurrency(Math.round(guide.totalTip / guide.totalTours)) : formatCurrency(0)}
                        </TableCell>
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
            <CardTitle>Statistics by Company</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading statistics...</div>
            ) : companyStats.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No tours found for the selected filters.
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead className="text-right">Tours</TableHead>
                      <TableHead className="text-right">Allowance (CTP)</TableHead>
                      <TableHead className="text-right">Total Tip</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companyStats.map(company => (
                      <TableRow key={company.id}>
                        <TableCell>{company.name}</TableCell>
                        <TableCell className="text-right">{company.totalTours}</TableCell>
                        <TableCell className="text-right">{formatCurrency(company.totalRevenue)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(company.totalTip)}</TableCell>
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
            <CardTitle>Monthly Revenue & Tips</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading statistics...</div>
            ) : monthlyStats.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No tours found for the selected filters.
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Tours</TableHead>
                      <TableHead className="text-right">Allowance (CTP)</TableHead>
                      <TableHead className="text-right">Total Tip</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyStats.map(month => (
                      <TableRow key={month.month}>
                        <TableCell>{month.month}</TableCell>
                        <TableCell className="text-right">{month.totalTours}</TableCell>
                        <TableCell className="text-right">{formatCurrency(month.totalRevenue)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(month.totalTip)}</TableCell>
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
