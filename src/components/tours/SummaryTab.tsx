import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/currency-utils';
import { cn } from '@/lib/utils';
import type { Tour, TourSummary } from '@/types/tour';
import { TourPaymentsPanel } from './TourPaymentsPanel';
import { SummaryLineReviewTable, type SummaryLineType } from './SummaryLineReviewTable';
import { SummaryWorkflowFooter } from './SummaryWorkflowFooter';
import type { Access, TourLineFieldKey } from '@/lib/tour-detail-permissions';

interface SummaryTabProps {
  tour: Tour;
  onSummaryUpdate?: (summary: TourSummary) => void;
  readOnly?: boolean;
  onEditLine?: (lineType: SummaryLineType, index: number) => void;
  canEditLine?: (lineType: SummaryLineType) => boolean;
  lineFieldAccess?: Partial<Record<TourLineFieldKey, Access>>;
  canExport?: boolean;
  onExport?: () => void;
}

type SectionTone = 'blue' | 'amber' | 'violet' | 'green';

const SECTION_TONES: Record<SectionTone, string> = {
  blue: 'sm:border-sky-200 sm:bg-sky-50/70 sm:dark:border-sky-900 sm:dark:bg-sky-950/40',
  amber: 'sm:border-amber-200 sm:bg-amber-50/70 sm:dark:border-amber-900 sm:dark:bg-amber-950/40',
  violet: 'sm:border-violet-200 sm:bg-violet-50/70 sm:dark:border-violet-900 sm:dark:bg-violet-950/40',
  green: 'sm:border-emerald-200 sm:bg-emerald-50/70 sm:dark:border-emerald-900 sm:dark:bg-emerald-950/40',
};

function SummarySection({
  title,
  description,
  tone,
  children,
}: {
  title: string;
  description?: string;
  tone: SectionTone;
  children: React.ReactNode;
}) {
  return (
    <section className={cn('space-y-3 sm:rounded-xl sm:border sm:p-4', SECTION_TONES[tone])}>
      <div>
        <div className="flex items-center gap-2 sm:block">
          <span className="h-px flex-1 bg-border sm:hidden" />
          <h3 className="whitespace-nowrap text-sm font-semibold sm:text-lg">{title}</h3>
          <span className="h-px flex-1 bg-border sm:hidden" />
        </div>
        {description && <p className="mt-1 hidden text-xs text-muted-foreground sm:block sm:text-sm">{description}</p>}
      </div>
      {children}
    </section>
  );
}


export function SummaryTab({
  tour,
  onSummaryUpdate,
  readOnly = false,
  onEditLine,
  canEditLine,
  lineFieldAccess,
  canExport = false,
  onExport,
}: SummaryTabProps) {
  const tourGuests = tour.totalGuests || 0;
  const clampGuests = (guests: number | undefined) => {
    if (typeof guests !== 'number') return tourGuests;
    if (!tourGuests) return guests;
    return Math.min(Math.max(guests, 0), tourGuests);
  };

  const totalDestinations = tour.destinations.reduce((sum, line) => sum + line.price * clampGuests(line.guests), 0);
  const totalExpenses = tour.expenses.reduce((sum, line) => sum + line.price * clampGuests(line.guests), 0);
  const totalMeals = tour.meals.reduce((sum, line) => sum + line.price * clampGuests(line.guests), 0);
  const totalAllowances = tour.allowances.reduce((sum, line) => sum + line.price * (line.quantity || 1), 0);
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

  useEffect(() => {
    const existingSummary = tour.summary as TourSummary | undefined;
    setSummary((prev) => ({
      ...prev,
      advancePayment: existingSummary?.advancePayment ?? 0,
      companyTip: existingSummary?.companyTip ?? 0,
      collectionsForCompany: existingSummary?.collectionsForCompany ?? 0,
    }));
  }, [tour.summary?.advancePayment, tour.summary?.companyTip, tour.summary?.collectionsForCompany]);

  useEffect(() => {
    setSummary((prev) => ({ ...prev, totalTabs: calculatedTotal }));
  }, [calculatedTotal]);

  useEffect(() => {
    const totalAfterAdvance = summary.totalTabs - (summary.advancePayment || 0);
    const totalAfterCollections = totalAfterAdvance - (summary.collectionsForCompany || 0);
    const totalAfterTip = totalAfterCollections + (summary.companyTip || 0);
    const finalTotal = totalAfterTip;

    if (
      totalAfterAdvance !== summary.totalAfterAdvance ||
      totalAfterCollections !== summary.totalAfterCollections ||
      totalAfterTip !== summary.totalAfterTip ||
      finalTotal !== summary.finalTotal
    ) {
      setSummary((prev) => ({
        ...prev,
        totalAfterAdvance,
        totalAfterCollections,
        totalAfterTip,
        finalTotal,
      }));
    }
  }, [summary.totalTabs, summary.advancePayment, summary.companyTip, summary.collectionsForCompany]);

  const handleInputChange = (field: keyof TourSummary, value: number) => {
    if (readOnly) return;

    const updated = { ...summary, [field]: value };
    const totalAfterAdvance = updated.totalTabs - (updated.advancePayment || 0);
    const totalAfterCollections = totalAfterAdvance - (updated.collectionsForCompany || 0);
    const totalAfterTip = totalAfterCollections + (updated.companyTip || 0);
    const fullUpdate = {
      ...updated,
      totalAfterAdvance,
      totalAfterCollections,
      totalAfterTip,
      finalTotal: totalAfterTip,
    };

    setSummary(fullUpdate);
    onSummaryUpdate?.(fullUpdate);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <SummarySection
        title="1. Thông tin chi phí tour"
        description="Gồm điểm đến, chi phí/dịch vụ và bữa ăn. Mỗi dòng có VAT, chứng từ, ghi chú HDV và trạng thái duyệt."
        tone="amber"
      >
        <SummaryLineReviewTable
          tour={tour}
          onEditLine={onEditLine}
          canEditLine={canEditLine}
          evidenceAccess={lineFieldAccess?.evidence}
          lineFieldAccess={lineFieldAccess}
          lineTypes={['destination', 'expense', 'meal']}
          title="Chi phí tour cần đối chiếu"
        />
      </SummarySection>

      <SummarySection
        title="2. Thông tin công tác phí"
        description="Công tác phí được duyệt theo từng dòng và có nút sửa quay lại đúng tab nguồn."
        tone="violet"
      >
        <SummaryLineReviewTable
          tour={tour}
          onEditLine={onEditLine}
          canEditLine={canEditLine}
          evidenceAccess={lineFieldAccess?.evidence}
          lineFieldAccess={lineFieldAccess}
          lineTypes={['allowance']}
          title="Công tác phí cần đối chiếu"
        />
      </SummarySection>

      <SummarySection title="3. Thông tin tổng kết" tone="green">
        <Card className="border-0 bg-transparent shadow-none sm:border sm:bg-background/90">
          <CardContent className="space-y-4 p-0 sm:p-4">
            <div className="flex items-center justify-between rounded bg-primary/10 px-3 py-2">
              <span className="font-medium">Tổng các tab (tự động tính)</span>
              <span className="font-bold text-primary">{formatCurrency(summary.totalTabs)}</span>
            </div>
            <Separator />

            <div className="space-y-2">
              <Label htmlFor="advancePayment" className="font-semibold text-red-600">- Tạm ứng</Label>
              <CurrencyInput
                id="advancePayment"
                value={summary.advancePayment || 0}
                onChange={(value) => handleInputChange('advancePayment', value)}
                disabled={readOnly}
              />
            </div>

            <div className="flex items-center justify-between rounded bg-muted/50 px-3 py-2">
              <span className="font-medium">Còn lại sau tạm ứng</span>
              <span className="font-bold">{formatCurrency(summary.totalAfterAdvance)}</span>
            </div>
            <Separator />

            <div className="space-y-2">
              <Label htmlFor="collectionsForCompany" className="font-semibold text-red-600">- Thu hộ công ty</Label>
              <CurrencyInput
                id="collectionsForCompany"
                value={summary.collectionsForCompany || 0}
                onChange={(value) => handleInputChange('collectionsForCompany', value)}
                disabled={readOnly}
              />
            </div>

            <div className="flex items-center justify-between rounded bg-muted/50 px-3 py-2">
              <span className="font-medium">Còn lại sau thu hộ</span>
              <span className="font-bold">{formatCurrency(summary.totalAfterCollections)}</span>
            </div>
            <Separator />

            <div className="space-y-2">
              <Label htmlFor="companyTip" className="font-semibold text-blue-600">+ Tip công ty</Label>
              <CurrencyInput
                id="companyTip"
                value={summary.companyTip || 0}
                onChange={(value) => handleInputChange('companyTip', value)}
                disabled={readOnly}
              />
            </div>

            <div className="flex items-center justify-between rounded bg-muted/50 px-3 py-2">
              <span className="font-medium">Tổng sau tip</span>
              <span className="font-bold">{formatCurrency(summary.totalAfterTip)}</span>
            </div>
            <Separator />

            <div className="flex items-center justify-between rounded-lg bg-primary/10 px-4 py-3">
              <span className="text-lg font-bold">Tổng kết cuối</span>
              <span className="text-lg font-bold text-primary">{formatCurrency(summary.finalTotal)}</span>
            </div>
          </CardContent>
        </Card>
        <div className="mt-4">
          <TourPaymentsPanel tour={tour} />
        </div>
      </SummarySection>

      {tour.id && (
        <SummaryWorkflowFooter
          tour={tour}
          canExport={canExport}
          onExport={onExport || (() => undefined)}
        />
      )}
    </div>
  );
}
