import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { formatDate } from '@/lib/utils';
import type { Tour, TourSummary } from '@/types/tour';
import { useState, useEffect } from 'react';

interface SummaryTabProps {
  tour: Tour;
  onSummaryUpdate?: (summary: TourSummary) => void;
}

export function SummaryTab({ tour, onSummaryUpdate }: SummaryTabProps) {
  const totalDestinations = tour.destinations.reduce((sum, d) => sum + d.price, 0);
  const totalExpenses = tour.expenses.reduce((sum, e) => sum + e.price, 0);
  const totalMeals = tour.meals.reduce((sum, m) => sum + m.price, 0);
  const totalAllowances = tour.allowances.reduce((sum, a) => sum + a.amount, 0);
  const calculatedTotal = totalDestinations + totalExpenses + totalMeals + totalAllowances;

  const [summary, setSummary] = useState<TourSummary>(tour.summary || {
    totalTabs: 0,
    advancePayment: 0,
    totalAfterAdvance: 0,
    companyTip: 0,
    totalAfterTip: 0,
    collectionsForCompany: 0,
    totalAfterCollections: 0,
    finalTotal: 0,
  });

  // Auto-calculate derived values
  useEffect(() => {
    const totalAfterAdvance = summary.totalTabs - (summary.advancePayment || 0);
    const totalAfterTip = totalAfterAdvance - (summary.companyTip || 0);
    const totalAfterCollections = totalAfterTip - (summary.collectionsForCompany || 0);
    const finalTotal = totalAfterCollections;

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
            <div className="text-2xl font-bold">{totalDestinations.toLocaleString()} ₫</div>
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
            <div className="text-2xl font-bold">{totalExpenses.toLocaleString()} ₫</div>
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
            <div className="text-2xl font-bold">{totalMeals.toLocaleString()} ₫</div>
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
            <div className="text-2xl font-bold">{totalAllowances.toLocaleString()} ₫</div>
            <p className="text-xs text-muted-foreground mt-1">
              {tour.allowances.length} item(s)
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle>Tour Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Company</div>
              <div className="font-medium">{tour.companyRef.nameAtBooking}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Guide</div>
              <div className="font-medium">{tour.guideRef.nameAtBooking}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Client</div>
              <div className="font-medium">{tour.clientName}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Nationality</div>
              <div className="font-medium">{tour.clientNationalityRef.nameAtBooking}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Duration</div>
              <div className="font-medium">
                {formatDate(tour.startDate)} to {formatDate(tour.endDate)} ({tour.totalDays} days)
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Guests</div>
              <div className="font-medium">
                {tour.adults} adult(s), {tour.children} child(ren) = {tour.totalGuests} total
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Calculated Total</span>
              <span className="font-semibold">{calculatedTotal.toLocaleString()} ₫</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <CardHeader>
          <CardTitle>Financial Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="totalTabs">Total Tabs</Label>
            <CurrencyInput
              id="totalTabs"
              value={summary.totalTabs}
              onChange={(value) => handleInputChange('totalTabs', value)}
            />
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
            <span className="font-bold">{summary.totalAfterAdvance?.toLocaleString() || 0} ₫</span>
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
            <span className="font-bold">{summary.totalAfterTip?.toLocaleString() || 0} ₫</span>
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
            <span className="font-bold">{summary.totalAfterCollections?.toLocaleString() || 0} ₫</span>
          </div>
          <Separator />
          
          <div className="flex justify-between items-center py-3 bg-primary/10 px-4 rounded-lg mt-4">
            <span className="text-lg font-bold">Final Total</span>
            <span className="text-lg font-bold text-primary">{summary.finalTotal?.toLocaleString() || 0} ₫</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
