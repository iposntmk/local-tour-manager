import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Cell, LabelList, Tooltip } from 'recharts';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';
import { formatCurrency } from '@/lib/currency-utils';
import { BRIGHT_PALETTE, formatCompact, type GroupStatsRow } from '../shared';
import { SectionHeader } from './SectionHeader';

interface TopRankChartProps {
  title: string;
  description?: string;
  data: GroupStatsRow[];
  topN?: number;
}

const config = {
  finalTotal: { label: 'Final Total', color: BRIGHT_PALETTE[7] },
} satisfies ChartConfig;

interface TooltipPayloadEntry {
  payload: GroupStatsRow;
  value: number;
  color: string;
}

const TooltipContent = ({ active, payload }: { active?: boolean; payload?: TooltipPayloadEntry[] }) => {
  if (!active || !payload || payload.length === 0) return null;
  const entry = payload[0];
  const row = entry.payload;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
      <div className="mb-1 flex items-center gap-2 font-semibold text-popover-foreground">
        <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
        {row.label}
      </div>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-0.5 text-xs">
        <dt className="text-muted-foreground">Final Total</dt>
        <dd className="text-right font-semibold">{formatCurrency(row.finalTotal)}</dd>
        <dt className="text-muted-foreground">Số tour</dt>
        <dd className="text-right">{row.totalTours}</dd>
      </dl>
    </div>
  );
};

export const TopRankChart = ({ title, description, data, topN = 5 }: TopRankChartProps) => {
  const top = data.slice(0, topN);
  return (
    <section>
      <SectionHeader title={title} description={description} />
      {top.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Không có dữ liệu</p>
      ) : (
        <ChartContainer config={config} className="h-[220px] w-full md:h-[260px]">
          <BarChart data={top} layout="vertical" margin={{ left: 0, right: 56, top: 4, bottom: 0 }}>
            <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" hide />
            <YAxis
              dataKey="label"
              type="category"
              width={110}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip cursor={{ fill: 'hsl(var(--muted) / 0.4)' }} content={<TooltipContent />} />
            <Bar dataKey="finalTotal" radius={[0, 6, 6, 0]} name="Final Total">
              {top.map((row, idx) => (
                <Cell key={row.key} fill={BRIGHT_PALETTE[idx % BRIGHT_PALETTE.length]} />
              ))}
              <LabelList
                dataKey="finalTotal"
                position="right"
                fontSize={10}
                fill="hsl(var(--muted-foreground))"
                formatter={(val: number) => formatCompact(val)}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      )}
    </section>
  );
};
