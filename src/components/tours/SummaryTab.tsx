import { useEffect, useRef, useState } from 'react';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/currency-utils';
import { getLineTotal } from '@/lib/tour-line-utils';
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

function SummarySection({
  title,
  description,
  total,
  children,
}: {
  title: string;
  description?: string;
  total?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 border-t pt-3 first:border-t-0 sm:pt-4">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="min-w-0 flex-1 text-sm font-semibold sm:text-lg">{title}</h3>
          {total !== undefined && (
            <span className="shrink-0 rounded bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
              {formatCurrency(total)}
            </span>
          )}
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
  const totalDestinations = tour.destinations.reduce((sum, line) => sum + getLineTotal(line, tourGuests), 0);
  const totalExpenses = tour.expenses.reduce((sum, line) => sum + getLineTotal(line, tourGuests), 0);
  const totalMeals = tour.meals.reduce((sum, line) => sum + getLineTotal(line, tourGuests), 0);
  const totalAllowances = tour.allowances.reduce((sum, line) => sum + line.price * (line.quantity || 1), 0);
  const calculatedTotal = totalDestinations + totalExpenses + totalMeals + totalAllowances;
  const tourSummary = tour.summary as TourSummary | undefined;
  const tourAdvancePayment = tourSummary?.advancePayment ?? 0;
  const tourCompanyTip = tourSummary?.companyTip ?? 0;
  const tourCollectionsForCompany = tourSummary?.collectionsForCompany ?? 0;
  const summarySaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSummary = useRef<TourSummary | null>(null);
  const onSummaryUpdateRef = useRef(onSummaryUpdate);

  const [summary, setSummary] = useState<TourSummary>(() => {
    return {
      totalTabs: calculatedTotal,
      advancePayment: tourAdvancePayment,
      totalAfterAdvance: 0,
      companyTip: tourCompanyTip,
      totalAfterTip: 0,
      collectionsForCompany: tourCollectionsForCompany,
      totalAfterCollections: 0,
      finalTotal: 0,
    };
  });

  useEffect(() => {
    onSummaryUpdateRef.current = onSummaryUpdate;
  }, [onSummaryUpdate]);

  useEffect(() => {
    setSummary((prev) => ({
      ...prev,
      advancePayment: tourAdvancePayment,
      companyTip: tourCompanyTip,
      collectionsForCompany: tourCollectionsForCompany,
    }));
  }, [tourAdvancePayment, tourCompanyTip, tourCollectionsForCompany]);

  useEffect(() => {
    setSummary((prev) => ({ ...prev, totalTabs: calculatedTotal }));
  }, [calculatedTotal]);

  useEffect(() => {
    setSummary((prev) => {
      const totalAfterAdvance = prev.totalTabs - (prev.advancePayment || 0);
      const totalAfterCollections = totalAfterAdvance - (prev.collectionsForCompany || 0);
      const totalAfterTip = totalAfterCollections + (prev.companyTip || 0);
      const finalTotal = totalAfterTip;
      if (
        totalAfterAdvance === prev.totalAfterAdvance &&
        totalAfterCollections === prev.totalAfterCollections &&
        totalAfterTip === prev.totalAfterTip &&
        finalTotal === prev.finalTotal
      ) {
        return prev;
      }
      return {
        ...prev,
        totalAfterAdvance,
        totalAfterCollections,
        totalAfterTip,
        finalTotal,
      };
    });
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
    pendingSummary.current = fullUpdate;
    if (summarySaveTimer.current) clearTimeout(summarySaveTimer.current);
    summarySaveTimer.current = setTimeout(() => {
      pendingSummary.current = null;
      onSummaryUpdateRef.current?.(fullUpdate);
    }, 500);
  };

  useEffect(() => () => {
    if (summarySaveTimer.current) clearTimeout(summarySaveTimer.current);
    if (pendingSummary.current) onSummaryUpdateRef.current?.(pendingSummary.current);
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6">
      <SummarySection
        title="1. Thông tin chi phí tour"
        description="Gồm điểm đến, chi phí/dịch vụ và bữa ăn. Mỗi dòng có VAT, chứng từ, ghi chú HDV và trạng thái duyệt."
        total={totalDestinations + totalExpenses + totalMeals}
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
        total={totalAllowances}
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

      <SummarySection title="3. Thông tin tổng kết" total={summary.finalTotal}>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded bg-primary/10 px-3 py-2 text-sm">
            <span className="font-medium">Tổng các tab</span>
            <span className="font-bold text-primary">{formatCurrency(summary.totalTabs)}</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="advancePayment" className="font-semibold text-red-600">- Tạm ứng</Label>
              <CurrencyInput
                id="advancePayment"
                value={summary.advancePayment || 0}
                onChange={(value) => handleInputChange('advancePayment', value)}
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="collectionsForCompany" className="font-semibold text-red-600">- Thu hộ công ty</Label>
              <CurrencyInput
                id="collectionsForCompany"
                value={summary.collectionsForCompany || 0}
                onChange={(value) => handleInputChange('collectionsForCompany', value)}
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyTip" className="font-semibold text-blue-600">+ Tip công ty</Label>
              <CurrencyInput
                id="companyTip"
                value={summary.companyTip || 0}
                onChange={(value) => handleInputChange('companyTip', value)}
                disabled={readOnly}
              />
            </div>
          </div>

          <div className="grid gap-2 text-sm sm:grid-cols-3">
            <div className="flex items-center justify-between rounded bg-muted/50 px-3 py-2">
              <span>Còn lại sau tạm ứng</span>
              <span className="font-bold">{formatCurrency(summary.totalAfterAdvance)}</span>
            </div>
            <div className="flex items-center justify-between rounded bg-muted/50 px-3 py-2">
              <span>Còn lại sau thu hộ</span>
              <span className="font-bold">{formatCurrency(summary.totalAfterCollections)}</span>
            </div>
            <div className="flex items-center justify-between rounded bg-muted/50 px-3 py-2">
              <span>Tổng sau tip</span>
              <span className="font-bold">{formatCurrency(summary.totalAfterTip)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between rounded bg-primary/10 px-4 py-3">
            <span className="text-base font-bold sm:text-lg">Tổng kết cuối</span>
            <span className="text-base font-bold text-primary sm:text-lg">{formatCurrency(summary.finalTotal)}</span>
          </div>
        </div>
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
