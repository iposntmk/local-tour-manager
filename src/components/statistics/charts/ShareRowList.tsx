import { useMemo, useState } from 'react';
import { ArrowDownNarrowWide, ArrowDownWideNarrow } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/currency-utils';
import { BRIGHT_PALETTE, type GroupStatsRow } from '../shared';
import { SectionHeader } from './SectionHeader';

interface ShareRowListProps {
  title: string;
  description?: string;
  data: GroupStatsRow[];
}

type SortDir = 'desc' | 'asc';

export const ShareRowList = ({ title, description, data }: ShareRowListProps) => {
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const { rows, total, max } = useMemo(() => {
    const filtered = data.filter((d) => d.finalTotal > 0);
    const sorted = [...filtered].sort((a, b) =>
      sortDir === 'desc' ? b.finalTotal - a.finalTotal : a.finalTotal - b.finalTotal,
    );
    const t = filtered.reduce((s, r) => s + r.finalTotal, 0);
    const m = filtered.reduce((s, r) => Math.max(s, r.finalTotal), 0);
    return { rows: sorted, total: t, max: m };
  }, [data, sortDir]);

  const toggleSort = () => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));

  return (
    <section>
      <SectionHeader
        title={title}
        description={description}
        action={
          <Button variant="outline" size="sm" onClick={toggleSort} className="gap-1.5">
            {sortDir === 'desc' ? (
              <>
                <ArrowDownWideNarrow className="h-4 w-4" />
                Giảm dần
              </>
            ) : (
              <>
                <ArrowDownNarrowWide className="h-4 w-4" />
                Tăng dần
              </>
            )}
          </Button>
        }
      />

      {rows.length === 0 || total === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Không có dữ liệu</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r, i) => {
            const pct = (r.finalTotal / total) * 100;
            const barPct = max > 0 ? (r.finalTotal / max) * 100 : 0;
            // Stable color: hash on key so sort order doesn't change colors.
            const color = BRIGHT_PALETTE[Math.abs(hash(r.key)) % BRIGHT_PALETTE.length];
            return (
              <li key={r.key} className="grid grid-cols-[1fr_minmax(0,2fr)_max-content] items-center gap-2 sm:gap-3">
                <span className="min-w-0 truncate text-sm" title={r.label}>
                  {r.label}
                </span>
                <div className="h-5 w-full overflow-hidden rounded-sm bg-muted">
                  <div
                    className="h-full rounded-sm transition-all"
                    style={{ width: `${barPct}%`, backgroundColor: color }}
                    title={`${r.label}: ${formatCurrency(r.finalTotal)} (${pct.toFixed(1)}%)`}
                  />
                </div>
                <div className="text-right text-xs tabular-nums">
                  <div className="font-medium">{formatCurrency(r.finalTotal)}</div>
                  <div className="text-muted-foreground">{pct.toFixed(1)}%</div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

// djb2 — deterministic, so a given key always maps to the same color.
const hash = (s: string): number => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
  }
  return h;
};
