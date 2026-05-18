import { formatCurrency } from '@/lib/currency-utils';
import { StatColumnHelp } from './StatColumnHelp';
import { statColumnHelp, type StatsTotals } from './shared';

interface KpiStripProps {
  totals: StatsTotals;
  averageTipPerDay: number;
  grandTotalFinalTotal: number;
  grandTotalTours: number;
}

export const KpiStrip = ({ totals, averageTipPerDay, grandTotalFinalTotal, grandTotalTours }: KpiStripProps) => {
  const items = [
    { help: statColumnHelp.totalTours, value: totals.tours.toString(), variant: 'plain' as const },
    { help: statColumnHelp.totalGuests, value: totals.guests.toString(), variant: 'plain' as const },
    { help: statColumnHelp.days, value: totals.days.toString(), variant: 'plain' as const },
    { help: statColumnHelp.allowances, value: formatCurrency(totals.allowances), variant: 'plain' as const },
    { help: statColumnHelp.ctpOnly, value: formatCurrency(totals.ctpOnly), variant: 'plain' as const },
    { help: statColumnHelp.guestTip, value: formatCurrency(totals.tipFromGuests), variant: 'plain' as const },
    { help: statColumnHelp.companyTip, value: formatCurrency(totals.companyTip), variant: 'plain' as const },
    { help: statColumnHelp.shopping, value: formatCurrency(totals.shoppings), variant: 'plain' as const },
    { help: statColumnHelp.averageTipPerDay, value: formatCurrency(averageTipPerDay), variant: 'plain' as const },
    { help: statColumnHelp.incomeWithoutCarHotel, value: formatCurrency(totals.incomeWithoutCarHotel), variant: 'plain' as const },
    { help: statColumnHelp.shopTipAllow, value: formatCurrency(totals.totalShopTipAllow), variant: 'accent' as const },
    { help: statColumnHelp.finalTotal, value: formatCurrency(totals.finalTotal), variant: 'primary' as const, subtitle: `${totals.tours} tour (đã lọc)` },
    { help: statColumnHelp.grandTotal, value: formatCurrency(grandTotalFinalTotal), variant: 'success' as const, subtitle: `${grandTotalTours} tour tổng` },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8">
      {items.map((it, idx) => (
        <KpiCell key={idx} {...it} />
      ))}
    </div>
  );
};

interface KpiCellProps {
  help: { label: string; title: string; description: string };
  value: string;
  variant: 'plain' | 'accent' | 'primary' | 'success';
  subtitle?: string;
}

const KpiCell = ({ help, value, variant, subtitle }: KpiCellProps) => {
  const variantClass =
    variant === 'primary'
      ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/30'
      : variant === 'success'
      ? 'border-emerald-500/40 bg-emerald-500/5 ring-1 ring-emerald-500/30'
      : variant === 'accent'
      ? 'border-primary/20 bg-primary/[0.03]'
      : 'border-border bg-card';

  const valueClass =
    variant === 'primary'
      ? 'text-primary'
      : variant === 'success'
      ? 'text-emerald-700 dark:text-emerald-300'
      : 'text-foreground';

  return (
    <div className={`rounded-md border p-2.5 md:p-3 ${variantClass}`}>
      <div className="text-[10px] font-medium text-muted-foreground md:text-xs">
        <StatColumnHelp {...help} />
      </div>
      <div className={`mt-1 truncate text-base font-bold md:text-lg ${valueClass}`} title={value}>
        {value}
      </div>
      {subtitle && <div className="mt-0.5 text-[10px] text-muted-foreground md:text-xs">{subtitle}</div>}
    </div>
  );
};
