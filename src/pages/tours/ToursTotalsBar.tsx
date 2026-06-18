import { RefreshCw } from 'lucide-react';
import { formatCurrency } from '@/lib/currency-utils';

type ToursTotalsBarProps = {
  grandTotalCount: number;
  grandTotalAmount: number;
  filteredCount: number;
  filteredTotal: number;
  showToursBackgroundRefresh: boolean;
};

export const ToursTotalsBar = ({
  grandTotalCount,
  grandTotalAmount,
  filteredCount,
  filteredTotal,
  showToursBackgroundRefresh,
}: ToursTotalsBarProps) => (
  <div className="border-t pt-2 sm:pt-3">
    <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:text-base">
      <div>
        <span className="text-muted-foreground">Tổng DB ({grandTotalCount} tour): </span>
        <span className="font-bold text-primary">{formatCurrency(grandTotalAmount)}</span>
      </div>
      <div>
        <span className="text-muted-foreground">Sau lọc ({filteredCount} tour): </span>
        <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(filteredTotal)}</span>
      </div>
      {showToursBackgroundRefresh && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          <span>Đang cập nhật...</span>
        </div>
      )}
    </div>
  </div>
);
