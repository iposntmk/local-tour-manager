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
  return (
    <div className={cn('rounded-lg border bg-card px-3 py-2.5 shadow-sm', item.price === 0 && 'border-red-300 bg-red-50')}>
      <div className="flex items-start justify-between gap-2">
        <p className={cn('flex-1 text-sm font-medium leading-snug', item.price === 0 && 'text-red-600')}>
          {item.name}
        </p>
        <p className="text-sm font-bold tabular-nums">{formatCurrency(item.price * qty)}</p>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
        {item.date && <span>{formatDateDisplay(item.date)}</span>}
        <span>
          {formatCurrency(item.price)} × {qty} khách
        </span>
        {!!item.vatRate && <span className="text-amber-600">VAT {item.vatRate}%</span>}
      </div>
      {item.guideNote && (
        <p className="mt-1 text-xs italic text-slate-500">{item.guideNote}</p>
      )}
    </div>
  );
}

function AllowanceCard({ allowance }: { allowance: Allowance }) {
  const days = getAllowanceDays(allowance);
  return (
    <div className={cn('rounded-lg border bg-card px-3 py-2.5 shadow-sm', allowance.price === 0 && 'border-red-300 bg-red-50')}>
      <div className="flex items-start justify-between gap-2">
        <p className={cn('flex-1 text-sm font-medium leading-snug', allowance.price === 0 && 'text-red-600')}>
          {allowance.name}
        </p>
        <p className="text-sm font-bold tabular-nums">{formatCurrency(allowance.price * days)}</p>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
        {allowance.date && <span>{formatDateDisplay(allowance.date)}</span>}
        <span>
          {formatCurrency(allowance.price)} × {days} ngày
        </span>
      </div>
    </div>
  );
}

function SectionTotal({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-yellow-100 px-3 py-2 text-sm font-bold">
      <span>{label}</span>
      <span className="tabular-nums">{formatCurrency(value)}</span>
    </div>
  );
}

export function CombinedTabMobile({ tour, totalGuests, serviceItems, allowanceItems, serviceTotal, allowanceTotal, totalTabs, summaryRows }: Props) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
        <span className="font-semibold">{tour.tourCode}</span>
        <span className="mx-1 text-muted-foreground">·</span>
        <span>{totalGuests} khách</span>
        <span className="mx-1 text-muted-foreground">·</span>
        <span className="text-muted-foreground">{formatNgayRangeForExcel(tour.startDate, tour.endDate)}</span>
      </div>

      {serviceItems.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wide text-sky-700">Dịch vụ</h3>
          {serviceItems.map((item, i) => (
            <ServiceCard key={i} item={item} totalGuests={totalGuests} />
          ))}
          <SectionTotal label="Tổng dịch vụ" value={serviceTotal} />
        </section>
      )}

      {allowanceItems.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wide text-emerald-700">Công tác phí</h3>
          {allowanceItems.map((item, i) => (
            <AllowanceCard key={i} allowance={item} />
          ))}
          <SectionTotal label="Tổng công tác phí" value={allowanceTotal} />
        </section>
      )}

      <div className="flex items-center justify-between rounded-lg bg-blue-100 px-3 py-3 font-bold">
        <span className="text-sm">TỔNG CHI PHÍ</span>
        <span className="text-base tabular-nums">{formatCurrency(totalTabs)}</span>
      </div>

      {summaryRows.length > 0 && (
        <section className="space-y-1.5">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Tổng kết</h3>
          {summaryRows.map((row) => (
            <div
              key={row.label}
              className={cn(
                'flex items-center justify-between rounded-md px-3 py-2 text-sm',
                row.rowClass ?? 'bg-muted/40',
              )}
            >
              <span className={cn('font-medium', row.labelClass)}>{row.label}</span>
              <span className="tabular-nums font-bold">{formatCurrency(row.value)}</span>
            </div>
          ))}
        </section>
      )}

      {tour.notes && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <span className="font-semibold">Ghi chú: </span>{tour.notes}
        </div>
      )}
    </div>
  );
}
