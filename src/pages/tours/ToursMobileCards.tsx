import type { MouseEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Baby, Copy, FileDown, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PaymentStatusBadge } from '@/components/tours/PaymentStatusBadge';
import { SettlementStatusBadge } from '@/components/tours/SettlementStatusBadge';
import { formatDateRangeDisplay } from '@/lib/date-utils';
import { store } from '@/lib/datastore';
import { t } from '@/lib/i18n';
import { TOUR_DETAIL_GC_TIME, TOUR_DETAIL_STALE_TIME } from '@/lib/query-cache';
import { useCanViewShoppingSensitive } from '@/hooks/useCanViewShoppingSensitive';
import type { Tour } from '@/types/tour';
import {
  formatTourNationalities,
  getAllowanceTotal,
  getShoppingCommissionInfo,
  getTabsCostTotal,
  getTourDays,
  getTourGuests,
  getTourWarningInfo,
  truncateText,
} from './tour-table-config';

type ToursMobileCardsProps = {
  tours: Tour[];
  canExportTours: boolean;
  canDuplicateTours: boolean;
  canDeleteTours: boolean;
  deletePending: boolean;
  onOpenTour: (tourId: string) => void;
  onExportSingle: (tour: Tour, event: MouseEvent) => void;
  onDuplicate: (tourId: string, event: MouseEvent) => void;
  onDelete: (tourId: string, event: MouseEvent) => void;
};

const getMobileWarningItems = (warningInfo: ReturnType<typeof getTourWarningInfo>) => {
  const items: string[] = [];
  if (warningInfo.missingWaterExpense) items.push(t('tours.mobileWarnings.missingWaterExpense'));
  if (warningInfo.hasZeroPrice) items.push(t('tours.mobileWarnings.zeroPrice'));
  if (warningInfo.hasDuplicateDestNames) items.push(t('tours.mobileWarnings.duplicateDestinationNames'));
  return items;
};

export const ToursMobileCards = ({
  tours,
  canExportTours,
  canDuplicateTours,
  canDeleteTours,
  deletePending,
  onOpenTour,
  onExportSingle,
  onDuplicate,
  onDelete,
}: ToursMobileCardsProps) => {
  const canViewShoppingSensitive = useCanViewShoppingSensitive();
  const queryClient = useQueryClient();
  const prefetchTour = (tourId: string) => {
    void queryClient.prefetchQuery({
      queryKey: ['tour', tourId],
      queryFn: () => store.getTour(tourId),
      staleTime: TOUR_DETAIL_STALE_TIME,
      gcTime: TOUR_DETAIL_GC_TIME,
    });
  };

  return (
  <div className="grid grid-cols-1 gap-4 mt-6 md:hidden">
    {tours.map((tour) => {
      const warningInfo = getTourWarningInfo(tour);
      const warningItems = getMobileWarningItems(warningInfo);
      const hasChildren = (tour.children || 0) > 0;
      const totalDays = getTourDays(tour);
      const totalGuests = getTourGuests(tour);
      const allowanceTotal = getAllowanceTotal(tour);
      const tabsCostTotal = getTabsCostTotal(tour);
      const totalTabs = tour.summary?.totalTabs ?? 0;
      const shoppingInfo = getShoppingCommissionInfo(tour);
      const nationalities = formatTourNationalities(tour);

      return (
        <div
          key={tour.id}
          className="relative cursor-pointer rounded-lg border-2 border-slate-300 bg-card p-4 shadow-sm transition-all hover:shadow-md sm:p-6 dark:border-slate-700 [content-visibility:auto] [contain-intrinsic-size:260px]"
          onClick={() => onOpenTour(tour.id)}
          onPointerEnter={() => prefetchTour(tour.id)}
          onTouchStart={() => prefetchTour(tour.id)}
        >
          {hasChildren && (
            <div className="absolute top-2 right-2 bg-blue-500 dark:bg-blue-600 text-white rounded-full p-1.5 shadow-lg" title={`${tour.children} trẻ em`}>
              <Baby className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          )}
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 overflow-hidden flex-nowrap">
                  <h3 className="font-bold text-sm sm:text-base truncate" title={tour.tourCode}>{truncateText(tour.tourCode, 15)}</h3>
                  <Badge variant="outline" className="text-xs shrink-0 whitespace-nowrap">
                    {formatDateRangeDisplay(tour.startDate, tour.endDate)}
                  </Badge>
                  <Badge variant="outline" className="text-xs shrink-0 whitespace-nowrap">
                    {totalDays}d
                  </Badge>
                  <Badge variant="outline" className="text-xs shrink-0 whitespace-nowrap">
                    {totalGuests}p
                  </Badge>
                </div>
              </div>
            </div>

            {warningItems.length > 0 && (
              <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                <div className="mb-1 flex items-center gap-1.5 font-semibold">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>{t('tours.mobileWarnings.title')}</span>
                </div>
                <ul className="list-disc space-y-0.5 pl-5">
                  {warningItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-3 border-t">
              <div className="space-y-1 text-xs sm:text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tổng chi phí:</span>
                  <span className="font-semibold">{Math.round(tabsCostTotal / 1000).toLocaleString('vi-VN')}k</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tổng công tác phí:</span>
                  <span className="font-semibold">{Math.round(allowanceTotal / 1000).toLocaleString('vi-VN')}k</span>
                </div>
                {totalTabs > 0 && (
                  <div className="flex items-center justify-between border-t pt-1">
                    <span className="font-medium">Tổng:</span>
                    <span className="font-bold text-primary">{Math.round(totalTabs / 1000).toLocaleString('vi-VN')}k</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground text-xs">QT:</span>
                  <SettlementStatusBadge status={tour.settlementStatus} className="text-[11px] px-1.5 py-0 h-5" />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground text-xs">TT:</span>
                  <PaymentStatusBadge status={tour.paymentStatus} method={tour.lastPaymentMethod} className="text-[11px] px-1.5 py-0 h-5" />
                </div>
                {canViewShoppingSensitive && shoppingInfo.hasShoppings && (
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground text-xs">HH:</span>
                    {shoppingInfo.allPaid ? (
                      <span className="inline-flex items-center rounded-full border border-emerald-500 bg-emerald-100 px-1.5 h-5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-600">đã nhận đủ</span>
                    ) : (
                      <span className="inline-flex items-center rounded-full border border-red-500 bg-red-100 px-1.5 h-5 text-[11px] font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-400 dark:border-red-600">chưa nhận đủ</span>
                    )}
                  </div>
                )}
              </div>
              {canViewShoppingSensitive && shoppingInfo.hasShoppings && !shoppingInfo.allPaid && (
                <div className="text-xs space-y-0.5">
                  {shoppingInfo.unpaidItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-1 flex-wrap pl-4">
                      <span className="text-muted-foreground">{item.name}:</span>
                      <span className="font-semibold text-red-600 dark:text-red-400">còn {Math.round(item.remaining / 1000).toLocaleString('vi-VN')}k</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t">
              <div
                className="grid grid-cols-2 gap-2 text-xs sm:text-sm"
              >
                <div className="min-w-0 overflow-hidden">
                  <p className="truncate" title={tour.companyRef.nameAtBooking}>
                    <span className="text-muted-foreground">Công ty: </span>
                    <span className="font-medium">
                      {truncateText(tour.companyRef.nameAtBooking, 15)}
                    </span>
                  </p>
                </div>
                <div className="min-w-0 overflow-hidden">
                  <p className="truncate" title={nationalities}>
                    <span className="text-muted-foreground">Quốc tịch: </span>
                    <span className="font-medium">
                      {truncateText(nationalities, 24)}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t justify-end">
              {canExportTours && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={(event) => onExportSingle(tour, event)}
                  title="Xuất Excel"
                >
                  <FileDown className="h-4 w-4" />
                </Button>
              )}
              {canDuplicateTours && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={(event) => onDuplicate(tour.id, event)}
                  title="Nhân bản tour"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              )}
              {canDeleteTours && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={(event) => onDelete(tour.id, event)}
                  disabled={deletePending}
                  title="Xóa tour"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      );
    })}
  </div>
  );
};
