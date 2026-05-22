import { RefreshCw } from 'lucide-react';
import { formatCurrency } from '@/lib/currency-utils';

type ToursTotalsBarProps = {
  toursCount: number;
  filteredToursTotal: number;
  allToursData?: {
    count: number;
    grandTotal: number;
  };
  showToursBackgroundRefresh: boolean;
};

export const ToursTotalsBar = ({
  toursCount,
  filteredToursTotal,
  allToursData,
  showToursBackgroundRefresh,
}: ToursTotalsBarProps) => (
  <div className="flex flex-wrap items-center justify-between gap-4 text-sm sm:text-base border-y py-3 bg-muted/30">
    {filteredToursTotal !== 0 && (
      <div>
        <span className="text-muted-foreground">Tổng cuối ({toursCount} tour): </span>
        <span className="font-bold text-primary">{formatCurrency(filteredToursTotal)}</span>
      </div>
    )}
    {allToursData && allToursData.grandTotal !== 0 && (
      <div>
        <span className="text-muted-foreground">Tổng lớn (Tất cả {allToursData.count} tour): </span>
        <span className="font-bold text-green-600">{formatCurrency(allToursData.grandTotal)}</span>
      </div>
    )}
    {showToursBackgroundRefresh && (
      <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        <span>Đang cập nhật...</span>
      </div>
    )}
  </div>
);
