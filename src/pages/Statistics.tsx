import { useMemo, useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { getSupabaseClient } from '@/lib/datastore/supabase-client';

const UNKNOWN_GUIDE_ID = '__unknown_guide__';
const UNKNOWN_COMPANY_ID = '__unknown_company__';
const UNKNOWN_NATIONALITY_ID = '__unknown_nationality__';
const UNKNOWN_MONTH = 'Unknown';

const formatCurrency = (value: number) => `${value.toLocaleString()} ₫`;

const calculateAllowanceTotal = (tour: Tour) =>
  (tour.allowances || []).reduce(
    (sum, allowance) => sum + allowance.price * (allowance.quantity ?? 1),
    0
  );

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

  const { data: toursResult, isLoading } = useQuery({
    queryKey: ['statistics', 'tours'],
    queryFn: () => store.listTours(undefined, { includeDetails: true }),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });

  const tours = toursResult?.tours ?? [];

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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient]);

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
        const totalShopTipAllow = allowances + tipFromGuests + companyTip + shoppings;

        acc.allowances += allowances;
        acc.tipFromGuests += tipFromGuests;
        acc.companyTip += companyTip;
        acc.shoppings += shoppings;
        acc.totalShopTipAllow += totalShopTipAllow;
        acc.tours += 1;
        acc.guests += tour.totalGuests ?? 0;
        return acc;
      },
      { allowances: 0, tipFromGuests: 0, companyTip: 0, shoppings: 0, totalShopTipAllow: 0, tours: 0, guests: 0 }
    );
  }, [filteredTours]);

  const guideStats = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; totalTours: number; totalAllowances: number; totalTipFromGuests: number; totalCompanyTip: number; totalShoppings: number; totalShopTipAllow: number }
    >();

    filteredTours.forEach(tour => {
      const guide = normalizeGuide(tour);
      const allowances = calculateAllowanceTotal(tour);
      const tipFromGuests = calculateTipTotal(tour);
      const companyTip = calculateCompanyTip(tour);
      const shoppings = calculateShoppingTotal(tour);

      if (!map.has(guide.id)) {
        map.set(guide.id, {
          id: guide.id,
          name: guide.name,
          totalTours: 0,
          totalAllowances: 0,
          totalTipFromGuests: 0,
          totalCompanyTip: 0,
          totalShoppings: 0,
          totalShopTipAllow: 0,
        });
      }

      const entry = map.get(guide.id)!;
      entry.totalTours += 1;
      entry.totalAllowances += allowances;
      entry.totalTipFromGuests += tipFromGuests;
      entry.totalCompanyTip += companyTip;
      entry.totalShoppings += shoppings;
      entry.totalShopTipAllow += allowances + tipFromGuests + companyTip + shoppings;
    });

    return Array.from(map.values()).sort((a, b) => b.totalShopTipAllow - a.totalShopTipAllow);
  }, [filteredTours]);

  const companyStats = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; totalTours: number; totalAllowances: number; totalTipFromGuests: number; totalCompanyTip: number; totalShoppings: number; totalShopTipAllow: number }
    >();

    filteredTours.forEach(tour => {
      const company = normalizeCompany(tour);
      const allowances = calculateAllowanceTotal(tour);
      const tipFromGuests = calculateTipTotal(tour);
      const companyTip = calculateCompanyTip(tour);
      const shoppings = calculateShoppingTotal(tour);

      if (!map.has(company.id)) {
        map.set(company.id, {
          id: company.id,
          name: company.name,
          totalTours: 0,
          totalAllowances: 0,
          totalTipFromGuests: 0,
          totalCompanyTip: 0,
          totalShoppings: 0,
          totalShopTipAllow: 0,
        });
      }

      const entry = map.get(company.id)!;
      entry.totalTours += 1;
      entry.totalAllowances += allowances;
      entry.totalTipFromGuests += tipFromGuests;
      entry.totalCompanyTip += companyTip;
      entry.totalShoppings += shoppings;
      entry.totalShopTipAllow += allowances + tipFromGuests + companyTip + shoppings;
    });

    return Array.from(map.values()).sort((a, b) => b.totalShopTipAllow - a.totalShopTipAllow);
  }, [filteredTours]);

  const monthlyStats = useMemo(() => {
    const map = new Map<
      string,
      { month: string; totalTours: number; totalAllowances: number; totalTipFromGuests: number; totalCompanyTip: number; totalShoppings: number; totalShopTipAllow: number }
    >();

    filteredTours.forEach(tour => {
      const month = getTourMonth(tour);
      const allowances = calculateAllowanceTotal(tour);
      const tipFromGuests = calculateTipTotal(tour);
      const companyTip = calculateCompanyTip(tour);
      const shoppings = calculateShoppingTotal(tour);

      if (!map.has(month)) {
        map.set(month, {
          month,
          totalTours: 0,
          totalAllowances: 0,
          totalTipFromGuests: 0,
          totalCompanyTip: 0,
          totalShoppings: 0,
          totalShopTipAllow: 0,
        });
      }

      const entry = map.get(month)!;
      entry.totalTours += 1;
      entry.totalAllowances += allowances;
      entry.totalTipFromGuests += tipFromGuests;
      entry.totalCompanyTip += companyTip;
      entry.totalShoppings += shoppings;
      entry.totalShopTipAllow += allowances + tipFromGuests + companyTip + shoppings;
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.month === UNKNOWN_MONTH) return 1;
      if (b.month === UNKNOWN_MONTH) return -1;
      return b.month.localeCompare(a.month);
    });
  }, [filteredTours]);

  const nationalityStats = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; totalTours: number; totalAllowances: number; totalTipFromGuests: number; totalCompanyTip: number; totalShoppings: number; totalShopTipAllow: number }
    >();

    filteredTours.forEach(tour => {
      const nationality = normalizeNationality(tour);
      const allowances = calculateAllowanceTotal(tour);
      const tipFromGuests = calculateTipTotal(tour);
      const companyTip = calculateCompanyTip(tour);
      const shoppings = calculateShoppingTotal(tour);

      if (!map.has(nationality.id)) {
        map.set(nationality.id, {
          id: nationality.id,
          name: nationality.name,
          totalTours: 0,
          totalAllowances: 0,
          totalTipFromGuests: 0,
          totalCompanyTip: 0,
          totalShoppings: 0,
          totalShopTipAllow: 0,
        });
      }

      const entry = map.get(nationality.id)!;
      entry.totalTours += 1;
      entry.totalAllowances += allowances;
      entry.totalTipFromGuests += tipFromGuests;
      entry.totalCompanyTip += companyTip;
      entry.totalShoppings += shoppings;
      entry.totalShopTipAllow += allowances + tipFromGuests + companyTip + shoppings;
    });

    return Array.from(map.values()).sort((a, b) => b.totalShopTipAllow - a.totalShopTipAllow);
  }, [filteredTours]);

  const { classes: headerClasses } = useHeaderMode('statistics.headerMode');

  const resetFilters = () => {
    setSelectedGuide('all');
    setSelectedCompany('all');
    setSelectedNationality('all');
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
                Review allowances, tips, and shopping statistics by guide, company, nationality, and month.
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 flex-1">
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
                  <label className="mb-1 block text-sm font-medium text-muted-foreground">Nationality</label>
                  <Select value={selectedNationality} onValueChange={setSelectedNationality}>
                    <SelectTrigger>
                      <SelectValue placeholder="All nationalities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All nationalities</SelectItem>
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
                  <label className="mb-1 block text-sm font-medium text-muted-foreground">Actions</label>
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

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
          <Card className="bg-primary/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Tours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totals.tours}</div>
              <p className="text-xs text-muted-foreground">Tours included</p>
            </CardContent>
          </Card>
          <Card className="bg-primary/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Guests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totals.guests}</div>
              <p className="text-xs text-muted-foreground">Adults + Children</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 dark:bg-blue-950">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Allowances</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totals.allowances)}</div>
              <p className="text-xs text-muted-foreground">CTP total</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 dark:bg-green-950">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tips from Guests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totals.tipFromGuests)}</div>
              <p className="text-xs text-muted-foreground">Shopping "TIP"</p>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 dark:bg-purple-950">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Company Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totals.companyTip)}</div>
              <p className="text-xs text-muted-foreground">From summary</p>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 dark:bg-orange-950">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Shoppings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totals.shoppings)}</div>
              <p className="text-xs text-muted-foreground">Excluding TIP</p>
            </CardContent>
          </Card>
          <Card className="bg-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-primary">Total (Shop+Tip+Allow)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatCurrency(totals.totalShopTipAllow)}</div>
              <p className="text-xs text-muted-foreground">Grand total</p>
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
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Guide</TableHead>
                      <TableHead className="text-right">Tours</TableHead>
                      <TableHead className="text-right">Allowances</TableHead>
                      <TableHead className="text-right">Tips (Guests)</TableHead>
                      <TableHead className="text-right">Tips (Company)</TableHead>
                      <TableHead className="text-right">Shoppings</TableHead>
                      <TableHead className="text-right font-semibold">Total (S+T+A)</TableHead>
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
                        <TableCell className="text-right font-semibold text-primary">{formatCurrency(guide.totalShopTipAllow)}</TableCell>
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
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead className="text-right">Tours</TableHead>
                      <TableHead className="text-right">Allowances</TableHead>
                      <TableHead className="text-right">Tips (Guests)</TableHead>
                      <TableHead className="text-right">Tips (Company)</TableHead>
                      <TableHead className="text-right">Shoppings</TableHead>
                      <TableHead className="text-right font-semibold">Total (S+T+A)</TableHead>
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
                        <TableCell className="text-right font-semibold text-primary">{formatCurrency(company.totalShopTipAllow)}</TableCell>
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
            <CardTitle>Monthly Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading statistics...</div>
            ) : monthlyStats.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No tours found for the selected filters.
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Tours</TableHead>
                      <TableHead className="text-right">Allowances</TableHead>
                      <TableHead className="text-right">Tips (Guests)</TableHead>
                      <TableHead className="text-right">Tips (Company)</TableHead>
                      <TableHead className="text-right">Shoppings</TableHead>
                      <TableHead className="text-right font-semibold">Total (S+T+A)</TableHead>
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
                        <TableCell className="text-right font-semibold text-primary">{formatCurrency(month.totalShopTipAllow)}</TableCell>
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
            <CardTitle>Statistics by Nationality</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading statistics...</div>
            ) : nationalityStats.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No tours found for the selected filters.
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nationality</TableHead>
                      <TableHead className="text-right">Tours</TableHead>
                      <TableHead className="text-right">Allowances</TableHead>
                      <TableHead className="text-right">Tips (Guests)</TableHead>
                      <TableHead className="text-right">Tips (Company)</TableHead>
                      <TableHead className="text-right">Shoppings</TableHead>
                      <TableHead className="text-right font-semibold">Total (S+T+A)</TableHead>
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
                        <TableCell className="text-right font-semibold text-primary">{formatCurrency(nationality.totalShopTipAllow)}</TableCell>
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
