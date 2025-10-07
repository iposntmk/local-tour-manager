import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { formatDate } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency-utils';
import type { Tour, TourSummary } from '@/types/tour';
import { useState, useEffect } from 'react';

interface SummaryTabProps {
  tour: Tour;
  onSummaryUpdate?: (summary: TourSummary) => void;
}

export function SummaryTab({ tour, onSummaryUpdate }: SummaryTabProps) {
  // Bước 1: Tính 4 tổng cơ bản (nhân với số lượng)
  const totalDestinations = tour.destinations.reduce((sum, d) => sum + (d.price * tour.totalGuests), 0);
  const totalExpenses = tour.expenses.reduce((sum, e) => sum + (e.price * tour.totalGuests), 0);
  const totalMeals = tour.meals.reduce((sum, m) => sum + (m.price * tour.totalGuests), 0);
  const totalAllowances = tour.allowances.reduce((sum, a) => sum + (a.price * (a.quantity || 1)), 0);

  // Bước 2: Tổng các tabs
  const calculatedTotal = totalDestinations + totalExpenses + totalMeals + totalAllowances;

  const [summary, setSummary] = useState<TourSummary>(() => {
    const existingSummary = tour.summary as TourSummary | undefined;
    return {
      totalTabs: calculatedTotal,
      advancePayment: existingSummary?.advancePayment ?? 0,
      totalAfterAdvance: 0,
      companyTip: existingSummary?.companyTip ?? 0,
      totalAfterTip: 0,
      collectionsForCompany: existingSummary?.collectionsForCompany ?? 0,
      totalAfterCollections: 0,
      finalTotal: 0,
    };
  });

  // Auto-update totalTabs when items change
  useEffect(() => {
    setSummary(prev => ({ ...prev, totalTabs: calculatedTotal }));
  }, [calculatedTotal]);

  // Bước 4: Tính toán tuần tự
  useEffect(() => {
    const totalAfterAdvance = summary.totalTabs - (summary.advancePayment || 0);
    const totalAfterCollections = totalAfterAdvance + (summary.collectionsForCompany || 0);
    const totalAfterTip = totalAfterCollections + (summary.companyTip || 0);
    const finalTotal = totalAfterTip;

    const updated = {
      ...summary,
      totalAfterAdvance,
      totalAfterTip,
      totalAfterCollections,
      finalTotal,
    };

    // Only update if calculated values have changed
    if (
      updated.totalAfterAdvance !== summary.totalAfterAdvance ||
      updated.totalAfterTip !== summary.totalAfterTip ||
      updated.totalAfterCollections !== summary.totalAfterCollections ||
      updated.finalTotal !== summary.finalTotal
    ) {
      setSummary(updated);
      if (onSummaryUpdate) {
        onSummaryUpdate(updated);
      }
    }
  }, [summary.totalTabs, summary.advancePayment, summary.companyTip, summary.collectionsForCompany, onSummaryUpdate]);

  const handleInputChange = (field: keyof TourSummary, value: number) => {
    setSummary(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="animate-scale-in">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Destinations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalDestinations)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {tour.destinations.length} item(s)
            </p>
          </CardContent>
        </Card>

        <Card className="animate-scale-in" style={{ animationDelay: '0.1s' }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {tour.expenses.length} item(s)
            </p>
          </CardContent>
        </Card>

        <Card className="animate-scale-in" style={{ animationDelay: '0.2s' }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Meals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalMeals)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {tour.meals.length} item(s)
            </p>
          </CardContent>
        </Card>

        <Card className="animate-scale-in" style={{ animationDelay: '0.3s' }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Allowances
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalAllowances)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {tour.allowances.length} item(s)
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Calculation: price × quantity
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle>Financial Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center py-2 bg-primary/10 px-3 rounded">
            <span className="font-medium">Total Tabs (Auto-calculated)</span>
            <span className="font-bold text-primary">{formatCurrency(summary.totalTabs)}</span>
          </div>
          <Separator />

          <div className="space-y-2">
            <Label htmlFor="advancePayment">Advance Payment (Input)</Label>
            <CurrencyInput
              id="advancePayment"
              value={summary.advancePayment || 0}
              onChange={(value) => handleInputChange('advancePayment', value)}
            />
          </div>

          <div className="flex justify-between items-center py-2 bg-muted/50 px-3 rounded">
            <span className="font-medium">Total After Advance</span>
            <span className="font-bold">{formatCurrency(summary.totalAfterAdvance)}</span>
          </div>
          <Separator />

          <div className="space-y-2">
            <Label htmlFor="collectionsForCompany">Collections for Company (Input)</Label>
            <CurrencyInput
              id="collectionsForCompany"
              value={summary.collectionsForCompany || 0}
              onChange={(value) => handleInputChange('collectionsForCompany', value)}
            />
          </div>

          <div className="flex justify-between items-center py-2 bg-muted/50 px-3 rounded">
            <span className="font-medium">Total After Collections</span>
            <span className="font-bold">{formatCurrency(summary.totalAfterCollections)}</span>
          </div>
          <Separator />

          <div className="space-y-2">
            <Label htmlFor="companyTip">Company Tip (Input)</Label>
            <CurrencyInput
              id="companyTip"
              value={summary.companyTip || 0}
              onChange={(value) => handleInputChange('companyTip', value)}
            />
          </div>

          <div className="flex justify-between items-center py-2 bg-muted/50 px-3 rounded">
            <span className="font-medium">Total After Tip</span>
            <span className="font-bold">{formatCurrency(summary.totalAfterTip)}</span>
          </div>
          <Separator />

          <div className="flex justify-between items-center py-3 bg-primary/10 px-4 rounded-lg mt-4">
            <span className="text-lg font-bold">Final Total</span>
            <span className="text-lg font-bold text-primary">{formatCurrency(summary.finalTotal)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
