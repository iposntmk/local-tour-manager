import { BarChart, Bar, CartesianGrid, XAxis, YAxis, LabelList, Tooltip, Legend } from 'recharts';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';
import { formatCurrency } from '@/lib/currency-utils';
import { useCanViewShoppingSensitive } from '@/hooks/useCanViewShoppingSensitive';
import { formatCompact, type GroupStatsRow } from '../shared';
import { SectionHeader } from './SectionHeader';

interface MonthlyTrendChartProps {
  data: GroupStatsRow[];
}

const SERIES = [
  { key: 'finalTotal', label: 'Final Total', color: '#3b82f6' }, // blue
  { key: 'totalShopTipAllow', label: 'S+T+A', color: '#f97316', shoppingSensitive: true }, // orange
  { key: 'totalIncomeWithoutCarHotel', label: 'Thu nhập (-xe/ngủ)', color: '#22c55e', shoppingSensitive: true }, // green
] as const;

const config = Object.fromEntries(
  SERIES.map((s) => [s.key, { label: s.label, color: s.color }]),
) satisfies ChartConfig;
type SeriesItem = (typeof SERIES)[number];

interface TooltipPayloadEntry {
  payload: GroupStatsRow;
  dataKey: string;
  value: number;
}

const TooltipContent = ({ active, payload, series }: { active?: boolean; payload?: TooltipPayloadEntry[]; series: readonly SeriesItem[] }) => {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
      <div className="mb-1.5 font-semibold text-popover-foreground">Tháng {row.label}</div>
      <ul className="space-y-1">
        {series.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
            <span className="text-xs text-muted-foreground">{s.label}</span>
            <span className="ml-auto pl-3 text-xs font-semibold tabular-nums text-popover-foreground">
              {formatCurrency(row[s.key as keyof GroupStatsRow] as number)}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-1.5 border-t pt-1.5 text-xs text-muted-foreground">
        {row.totalTours} tour
      </div>
    </div>
  );
};

const LegendContent = ({ series }: { series: readonly SeriesItem[] }) => (
  <ul className="mb-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs">
    {series.map((s) => (
      <li key={s.key} className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
        <span className="text-muted-foreground">{s.label}</span>
      </li>
    ))}
  </ul>
);

export const MonthlyTrendChart = ({ data }: MonthlyTrendChartProps) => {
  const canViewShoppingSensitive = useCanViewShoppingSensitive();
  const visibleSeries = SERIES.filter((s) => canViewShoppingSensitive || !('shoppingSensitive' in s));
  const ordered = [...data].reverse();
  return (
    <section>
      <SectionHeader
        title="Diễn biến theo tháng"
        description={canViewShoppingSensitive ? 'So sánh Final Total, S+T+A, Thu nhập (-xe/ngủ) theo tháng — rê chuột để xem chi tiết' : 'So sánh Final Total theo tháng — rê chuột để xem chi tiết'}
      />
      <ChartContainer config={config} className="h-[280px] w-full md:h-[360px]">
        <BarChart data={ordered} barGap={4} margin={{ left: 0, right: 8, top: 18, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickFormatter={formatCompact}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            width={42}
          />
          <Tooltip cursor={{ fill: 'hsl(var(--muted) / 0.4)' }} content={<TooltipContent series={visibleSeries} />} />
          <Legend content={<LegendContent series={visibleSeries} />} verticalAlign="top" />
          {visibleSeries.map((s, idx) => (
            <Bar key={s.key} dataKey={s.key} fill={s.color} radius={[4, 4, 0, 0]} name={s.label}>
              {idx === 0 && (
                <LabelList
                  dataKey={s.key}
                  position="top"
                  fontSize={10}
                  fill="hsl(var(--muted-foreground))"
                  formatter={(val: number) => (val > 0 ? formatCompact(val) : '')}
                />
              )}
            </Bar>
          ))}
        </BarChart>
      </ChartContainer>
    </section>
  );
};
