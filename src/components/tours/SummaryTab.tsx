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
  // Tính tổng giống như các cột "Total Amount" của từng tab (không dựa vào totalGuests toàn tour)
  const tourGuests = tour.totalGuests || 0;
  const clampGuests = (g: number | undefined) => {
    if (typeof g !== 'number') return tourGuests;
    if (!tourGuests) return g; // nếu tourGuests = 0, giữ g
    return Math.min(Math.max(g, 0), tourGuests);
  };

  const totalDestinations = tour.destinations.reduce((sum, d) => {
    const g = clampGuests(d.guests as any);
    return sum + (d.price * g);
  }, 0);

  const totalExpenses = tour.expenses.reduce((sum, e) => {
    const g = clampGuests(e.guests as any);
    return sum + (e.price * g);
  }, 0);

  const totalMeals = tour.meals.reduce((sum, m) => {
    const g = clampGuests(m.guests as any);
    return sum + (m.price * g);
  }, 0);

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

  // Bước 4: Tính toán tuần tự (only recalculate display values, don't save to DB)
  useEffect(() => {
    const totalAfterAdvance = summary.totalTabs - (summary.advancePayment || 0);
    const totalAfterCollections = totalAfterAdvance - (summary.collectionsForCompany || 0);
    const totalAfterTip = totalAfterCollections + (summary.companyTip || 0);
    const finalTotal = totalAfterTip;

    const updated = {
      ...summary,
      totalAfterAdvance,
      totalAfterTip,
      totalAfterCollections,
      finalTotal,
    };

    // Only update state if calculated values have changed (don't save to DB)
    if (
      updated.totalAfterAdvance !== summary.totalAfterAdvance ||
      updated.totalAfterTip !== summary.totalAfterTip ||
      updated.totalAfterCollections !== summary.totalAfterCollections ||
      updated.finalTotal !== summary.finalTotal
    ) {
      setSummary(updated);
      // Note: Don't call onSummaryUpdate here - it's only called when user edits inputs
    }
  }, [summary.totalTabs, summary.advancePayment, summary.companyTip, summary.collectionsForCompany]);

  const handleInputChange = (field: keyof TourSummary, value: number) => {
    const updated = { ...summary, [field]: value };

    // Recalculate dependent values
    const totalAfterAdvance = updated.totalTabs - (updated.advancePayment || 0);
    const totalAfterCollections = totalAfterAdvance - (updated.collectionsForCompany || 0);
    const totalAfterTip = totalAfterCollections + (updated.companyTip || 0);
    const finalTotal = totalAfterTip;

    const fullUpdate = {
      ...updated,
      totalAfterAdvance,
      totalAfterCollections,
      totalAfterTip,
      finalTotal,
    };

    setSummary(fullUpdate);

    // Immediately save to database when user edits a field
    if (onSummaryUpdate) {
      onSummaryUpdate(fullUpdate);
    }
  };

  return (
    <div className="space-y-6">
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
            <Label htmlFor="advancePayment" className="text-red-600 font-semibold">- Advance Payment (Input)</Label>
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
            <Label htmlFor="collectionsForCompany" className="text-red-600 font-semibold">- Collections for Company (Input)</Label>
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
            <Label htmlFor="companyTip" className="text-blue-600 font-semibold">+ Company Tip (Input)</Label>
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
