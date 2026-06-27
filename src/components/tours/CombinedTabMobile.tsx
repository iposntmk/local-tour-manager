import { useState } from 'react';
import { ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { formatCurrency } from '@/lib/currency-utils';
import { formatDateDisplay } from '@/lib/date-utils';
import { formatNgayRangeForExcel } from '@/lib/excel/excel-helpers';
import {
  MOBILE_CARD, MOBILE_CARD_FLAGGED, MOBILE_CARD_NAME, MOBILE_CARD_NAME_FLAGGED,
  MOBILE_CARD_AMOUNT, MOBILE_CARD_META, MOBILE_SUBTOTAL, MOBILE_TOTAL_BAR,
  MOBILE_TOTAL_LABEL, MOBILE_TOTAL_AMOUNT, MOBILE_SECTION_BTN, MOBILE_SECTION_LABEL,
  MOBILE_SECTION_TOTAL, MOBILE_SUMMARY_TITLE, MOBILE_SUMMARY_ROW,
  MOBILE_SUMMARY_LABEL, MOBILE_SUMMARY_AMOUNT, MOBILE_NOTES, MOBILE_TOGGLE_BTN,
  MOBILE_CHEVRON_SIZE,
} from '@/lib/tab-styles';
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
    <div className={cn(MOBILE_CARD, item.price === 0 && MOBILE_CARD_FLAGGED)}>
      <div className="flex items-baseline justify-between gap-1.5">
        <p className={cn(MOBILE_CARD_NAME, item.price === 0 && MOBILE_CARD_NAME_FLAGGED)}>
          {item.name}
        </p>
        <p className={MOBILE_CARD_AMOUNT}>{formatCurrency(item.price * qty)}</p>
      </div>
      <p className={MOBILE_CARD_META}>{parts}</p>
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
    <div className={cn(MOBILE_CARD, allowance.price === 0 && MOBILE_CARD_FLAGGED)}>
      <div className="flex items-baseline justify-between gap-1.5">
        <p className={cn(MOBILE_CARD_NAME, allowance.price === 0 && MOBILE_CARD_NAME_FLAGGED)}>
          {allowance.name}
        </p>
        <p className={MOBILE_CARD_AMOUNT}>{formatCurrency(allowance.price * days)}</p>
      </div>
      <p className={MOBILE_CARD_META}>{parts}</p>
    </div>
  );
}

function SectionHeader({
  label, color, count, total, expanded, onToggle,
}: {
  label: string; color: string; count: number; total: number;
  expanded: boolean; onToggle: () => void;
}) {
  return (
    <button type="button" onClick={onToggle} className={MOBILE_SECTION_BTN}>
      <span className={cn(MOBILE_SECTION_LABEL, color)}>
        {label} <span className="font-normal opacity-60">({count})</span>
      </span>
      <div className="flex items-center gap-1.5">
        {!expanded && <span className={MOBILE_SECTION_TOTAL}>{formatCurrency(total)}</span>}
        {expanded
          ? <ChevronUp className={cn(MOBILE_CHEVRON_SIZE, 'text-muted-foreground')} />
          : <ChevronDown className={cn(MOBILE_CHEVRON_SIZE, 'text-muted-foreground')} />}
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{tour.tourCode}</span>
          <span className="mx-1">·</span>
          {totalGuests} khách
          <span className="mx-1">·</span>
          {formatNgayRangeForExcel(tour.startDate, tour.endDate)}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={() => { setShowService(false); setShowAllowance(false); }} className={MOBILE_TOGGLE_BTN}>
            <EyeOff className="h-3 w-3" /><span>Ẩn</span>
          </button>
          <button type="button" onClick={() => { setShowService(true); setShowAllowance(true); }} className={MOBILE_TOGGLE_BTN}>
            <Eye className="h-3 w-3" /><span>Hiện</span>
          </button>
        </div>
      </div>

      {serviceItems.length > 0 && (
        <section className="space-y-1.5">
          <SectionHeader label="Dịch vụ" color="text-sky-700" count={serviceItems.length} total={serviceTotal} expanded={showService} onToggle={() => setShowService((v) => !v)} />
          {showService && (
            <>
              {serviceItems.map((item, i) => <ServiceCard key={i} item={item} totalGuests={totalGuests} />)}
              <div className={MOBILE_SUBTOTAL}><span>Tổng DV</span><span className="tabular-nums">{formatCurrency(serviceTotal)}</span></div>
            </>
          )}
        </section>
      )}

      {allowanceItems.length > 0 && (
        <section className="space-y-1.5">
          <SectionHeader label="Công tác phí" color="text-emerald-700" count={allowanceItems.length} total={allowanceTotal} expanded={showAllowance} onToggle={() => setShowAllowance((v) => !v)} />
          {showAllowance && (
            <>
              {allowanceItems.map((item, i) => <AllowanceCard key={i} allowance={item} />)}
              <div className={MOBILE_SUBTOTAL}><span>Tổng CTP</span><span className="tabular-nums">{formatCurrency(allowanceTotal)}</span></div>
            </>
          )}
        </section>
      )}

      <div className={MOBILE_TOTAL_BAR}>
        <span className={MOBILE_TOTAL_LABEL}>TỔNG CHI PHÍ</span>
        <span className={MOBILE_TOTAL_AMOUNT}>{formatCurrency(totalTabs)}</span>
      </div>

      {summaryRows.length > 0 && (
        <section className="space-y-1">
          <p className={MOBILE_SUMMARY_TITLE}>Tổng kết</p>
          {summaryRows.map((row) => (
            <div key={row.label} className={cn(MOBILE_SUMMARY_ROW, row.rowClass ?? 'bg-muted/40')}>
              <span className={cn(MOBILE_SUMMARY_LABEL, row.labelClass)}>{row.label}</span>
              <span className={MOBILE_SUMMARY_AMOUNT}>{formatCurrency(row.value)}</span>
            </div>
          ))}
        </section>
      )}

      {tour.notes && (
        <div className={MOBILE_NOTES}>
          <span className="font-semibold">Ghi chú: </span>{tour.notes}
        </div>
      )}
    </div>
  );
}
