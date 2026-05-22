import type { MouseEvent } from 'react';
import { Baby, Copy, FileDown, Flag, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateRangeDisplay } from '@/lib/date-utils';
import type { Tour } from '@/types/tour';
import {
  formatTourNationalities,
  getAllowanceTotal,
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
}: ToursMobileCardsProps) => (
  <div className="grid grid-cols-1 gap-4 mt-6 md:hidden">
    {tours.map((tour, index) => {
      const warningInfo = getTourWarningInfo(tour);
      const hasChildren = (tour.children || 0) > 0;
      const totalDays = getTourDays(tour);
      const totalGuests = getTourGuests(tour);
      const allowanceTotal = getAllowanceTotal(tour);
      const nationalities = formatTourNationalities(tour);

      return (
        <div
          key={tour.id}
          className={`rounded-lg border bg-card p-4 sm:p-6 transition-all hover-scale animate-fade-in relative ${warningInfo.showRedFlag ? 'border-red-500 dark:border-red-600' : ''}`}
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          {hasChildren && (
            <div className="absolute top-2 right-2 bg-blue-500 dark:bg-blue-600 text-white rounded-full p-1.5 shadow-lg" title={`${tour.children} child${tour.children > 1 ? 'ren' : ''}`}>
              <Baby className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          )}
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onOpenTour(tour.id)}>
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
                  {warningInfo.showRedFlag && (
                    <span
                      className="inline-flex items-center gap-1 text-destructive text-xs sm:text-sm"
                      title={warningInfo.warningTitle}
                    >
                      <Flag className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Kiểm tra</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t cursor-pointer" onClick={() => onOpenTour(tour.id)}>
              <div className="flex items-center gap-2 text-xs sm:text-sm flex-wrap">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Allowance:</span>
                  <span className="font-semibold">
                    {Math.round(allowanceTotal / 1000)}k
                  </span>
                </div>
                {(tour.summary?.finalTotal !== undefined && tour.summary.finalTotal !== null && tour.summary.finalTotal !== 0) && (
                  <>
                    <span className="text-muted-foreground">|</span>
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">Final:</span>
                      <span className="font-semibold text-primary">
                        {Math.round(tour.summary.finalTotal / 1000)}k
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="pt-3 border-t">
              <div
                className="grid grid-cols-2 gap-2 text-xs sm:text-sm cursor-pointer"
                onClick={() => onOpenTour(tour.id)}
              >
                <div className="min-w-0 overflow-hidden">
                  <p className="truncate" title={tour.companyRef.nameAtBooking}>
                    <span className="text-muted-foreground">Company: </span>
                    <span className="font-medium">
                      {truncateText(tour.companyRef.nameAtBooking, 15)}
                    </span>
                  </p>
                </div>
                <div className="min-w-0 overflow-hidden">
                  <p className="truncate" title={nationalities}>
                    <span className="text-muted-foreground">Nationality: </span>
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
                  title="Export to Excel"
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
                  title="Duplicate tour"
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
                  title="Delete tour"
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
