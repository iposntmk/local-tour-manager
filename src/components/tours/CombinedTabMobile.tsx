import { useState } from 'react';
import { ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { formatCurrency } from '@/lib/currency-utils';
import { formatDateDisplay } from '@/lib/date-utils';
import { formatNgayRangeForExcel } from '@/lib/excel/excel-helpers';
import { cn } from '@/lib/utils';
import type { Allowance, Tour } from '@/types/tour';
import type { ServiceItem } from '@/lib/excel/excel-helpers';

interface Props {
  tour: Tour;
  totalGuests: number;
  serviceItems: ServiceItem[];
  allowanceItems: Allowance[];
  serviceTotal: number;
  allowanceTotal: number;
  totalTabs: number;
  summaryRows: Array<{ label: string; value: number; labelClass?: string; rowClass?: string }>;
}

const getAllowanceDays = (a: Allowance) => (a.quantity && a.quantity > 0 ? a.quantity : 1);

function ServiceCard({ item, totalGuests }: { item: ServiceItem; totalGuests: number }) {
  const qty = item.guests ?? totalGuests;
  const parts = [
    item.date && formatDateDisplay(item.date),
    `${formatCurrency(item.price)} × ${qty}`,
    item.vatRate ? `VAT ${item.vatRate}%` : null,
    item.guideNote || null,
  ].filter(Boolean).join(' · ');

  return (
    <div className={cn('rounded-md border bg-card px-2.5 py-1.5', item.price === 0 && 'border-red-300 bg-red-50')}>
      <div className="flex items-baseline justify-between gap-1.5">
        <p className={cn('flex-1 text-xs font-medium leading-snug', item.price === 0 && 'text-red-600')}>
          {item.name}
        </p>
        <p className="shrink-0 text-xs font-bold tabular-nums">{formatCurrency(item.price * qty)}</p>
      </div>
      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{parts}</p>
    </div>
  );
}

function AllowanceCard({ allowance }: { allowance: Allowance }) {
  const days = getAllowanceDays(allowance);
  const parts = [
    allowance.date && formatDateDisplay(allowance.date),
    `${formatCurrency(allowance.price)} × ${days}n`,
  ].filter(Boolean).join(' · ');

  return (
    <div className={cn('rounded-md border bg-card px-2.5 py-1.5', allowance.price === 0 && 'border-red-300 bg-red-50')}>
      <div className="flex items-baseline justify-between gap-1.5">
        <p className={cn('flex-1 text-xs font-medium leading-snug', allowance.price === 0 && 'text-red-600')}>
          {allowance.name}
        </p>
        <p className="shrink-0 text-xs font-bold tabular-nums">{formatCurrency(allowance.price * days)}</p>
      </div>
      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{parts}</p>
    </div>
  );
}

function SectionHeader({
  label,
  color,
  count,
  total,
  expanded,
  onToggle,
}: {
  label: string;
  color: string;
  count: number;
  total: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between gap-2 rounded-md px-1 py-0.5"
    >
      <span className={cn('text-xs font-bold uppercase tracking-wide', color)}>
        {label} <span className="font-normal opacity-60">({count})</span>
      </span>
      <div className="flex items-center gap-1.5">
        {!expanded && (
          <span className="text-[11px] font-bold tabular-nums text-muted-foreground">
            {formatCurrency(total)}
          </span>
        )}
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </div>
    </button>
  );
}

export function CombinedTabMobile({
  tour, totalGuests, serviceItems, allowanceItems,
  serviceTotal, allowanceTotal, totalTabs, summaryRows,
}: Props) {
  const [showService, setShowService] = useState(true);
  const [showAllowance, setShowAllowance] = useState(true);

  const hasService = serviceItems.length > 0;
  const hasAllowance = allowanceItems.length > 0;
  const allExpanded = showService && showAllowance;

  return (
    <div className="space-y-3">
      {/* Header + global controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{tour.tourCode}</span>
          <span className="mx-1">·</span>
          {totalGuests} khách
          <span className="mx-1">·</span>
          {formatNgayRangeForExcel(tour.startDate, tour.endDate)}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => { setShowService(false); setShowAllowance(false); }}
            className="flex items-center gap-0.5 rounded px-1.5 py-1 text-[11px] text-muted-foreground hover:bg-muted"
          >
            <EyeOff className="h-3 w-3" />
            <span>Ẩn</span>
          </button>
          <button
            type="button"
            onClick={() => { setShowService(true); setShowAllowance(true); }}
            className="flex items-center gap-0.5 rounded px-1.5 py-1 text-[11px] text-muted-foreground hover:bg-muted"
          >
            <Eye className="h-3 w-3" />
            <span>Hiện</span>
          </button>
        </div>
      </div>

      {hasService && (
        <section className="space-y-1.5">
          <SectionHeader
            label="Dịch vụ"
            color="text-sky-700"
            count={serviceItems.length}
            total={serviceTotal}
            expanded={showService}
            onToggle={() => setShowService((v) => !v)}
          />
          {showService && (
            <>
              {serviceItems.map((item, i) => (
                <ServiceCard key={i} item={item} totalGuests={totalGuests} />
              ))}
              <div className="flex items-center justify-between rounded-md bg-yellow-100 px-2.5 py-1.5 text-xs font-bold">
                <span>Tổng DV</span>
                <span className="tabular-nums">{formatCurrency(serviceTotal)}</span>
              </div>
            </>
          )}
        </section>
      )}

      {hasAllowance && (
        <section className="space-y-1.5">
          <SectionHeader
            label="Công tác phí"
            color="text-emerald-700"
            count={allowanceItems.length}
            total={allowanceTotal}
            expanded={showAllowance}
            onToggle={() => setShowAllowance((v) => !v)}
          />
          {showAllowance && (
            <>
              {allowanceItems.map((item, i) => (
                <AllowanceCard key={i} allowance={item} />
              ))}
              <div className="flex items-center justify-between rounded-md bg-yellow-100 px-2.5 py-1.5 text-xs font-bold">
                <span>Tổng CTP</span>
                <span className="tabular-nums">{formatCurrency(allowanceTotal)}</span>
              </div>
            </>
          )}
        </section>
      )}

      <div className="flex items-center justify-between rounded-lg bg-blue-100 px-2.5 py-2 font-bold">
        <span className="text-xs">TỔNG CHI PHÍ</span>
        <span className="text-sm tabular-nums">{formatCurrency(totalTabs)}</span>
      </div>

      {summaryRows.length > 0 && (
        <section className="space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Tổng kết</p>
          {summaryRows.map((row) => (
            <div
              key={row.label}
              className={cn(
                'flex items-center justify-between rounded-md px-2.5 py-1.5',
                row.rowClass ?? 'bg-muted/40',
              )}
            >
              <span className={cn('text-xs font-medium', row.labelClass)}>{row.label}</span>
              <span className="text-xs font-bold tabular-nums">{formatCurrency(row.value)}</span>
            </div>
          ))}
        </section>
      )}

      {tour.notes && (
        <div className="rounded-md border border-red-200 bg-red-50 px-2.5 py-2 text-xs text-red-700">
          <span className="font-semibold">Ghi chú: </span>{tour.notes}
        </div>
      )}
    </div>
  );
}
