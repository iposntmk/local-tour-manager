import type { MouseEvent } from 'react';
import { Baby, Copy, FileDown, Flag, Trash2, WalletCards } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PaymentStatusBadge } from '@/components/tours/PaymentStatusBadge';
import { SettlementStatusBadge } from '@/components/tours/SettlementStatusBadge';
import { formatCurrency } from '@/lib/currency-utils';
import { formatDateRangeDisplay } from '@/lib/date-utils';
import { isTourPaymentEligible } from '@/lib/payment-utils';
import type { Tour } from '@/types/tour';
import {
  formatTourNationalities,
  getTourWarningInfo,
  type TourTableColumn,
} from './tour-table-config';

export type TourTableRowData = {
  warningInfo: ReturnType<typeof getTourWarningInfo>;
  totalDays: number;
  totalGuests: number;
  allowanceTotal: number;
  finalTotal: number;
  hasChildren: boolean;
  index: number;
};

type ToursDesktopTableCellContentProps = {
  column: TourTableColumn;
  tour: Tour;
  row: TourTableRowData;
  canExportTours: boolean;
  canDuplicateTours: boolean;
  canDeleteTours: boolean;
  deletePending: boolean;
  onExportSingle: (tour: Tour, event: MouseEvent) => void;
  onDuplicate: (tourId: string, event: MouseEvent) => void;
  onDelete: (tourId: string, event: MouseEvent) => void;
};

export const ToursDesktopTableCellContent = ({
  column,
  tour,
  row,
  canExportTours,
  canDuplicateTours,
  canDeleteTours,
  deletePending,
  onExportSingle,
  onDuplicate,
  onDelete,
}: ToursDesktopTableCellContentProps) => {
  switch (column.key) {
    case 'stt':
      return row.index + 1;
    case 'tourCode':
      return <span className="block truncate" title={tour.tourCode}>{tour.tourCode}</span>;
    case 'date':
      return formatDateRangeDisplay(tour.startDate, tour.endDate);
    case 'days':
      return `${row.totalDays} ngày`;
    case 'guests':
      return (
        <div className="flex items-center gap-2">
          <span>{row.totalGuests}p</span>
          {row.hasChildren && (
            <span className="inline-flex items-center text-blue-600 dark:text-blue-400" title={`${tour.children} trẻ em`}>
              <Baby className="h-4 w-4" />
            </span>
          )}
        </div>
      );
    case 'company':
      return <span className="block truncate" title={tour.companyRef?.nameAtBooking || ''}>{tour.companyRef?.nameAtBooking || '-'}</span>;
    case 'landOperator':
      return <span className="block truncate text-muted-foreground" title={tour.landOperatorRef?.nameAtBooking || ''}>{tour.landOperatorRef?.nameAtBooking || '-'}</span>;
    case 'guide':
      return <span className="block truncate" title={tour.guideRef?.nameAtBooking || ''}>{tour.guideRef?.nameAtBooking || '-'}</span>;
    case 'nationality': {
      const nationalities = formatTourNationalities(tour);
      return <span className="block truncate" title={nationalities}>{nationalities || '-'}</span>;
    }
    case 'clientName':
      return <span className="block truncate" title={tour.clientName || ''}>{tour.clientName || '-'}</span>;
    case 'clientPhone':
      return <span className="block truncate" title={tour.clientPhone || ''}>{tour.clientPhone || '-'}</span>;
    case 'driverName':
      return <span className="block truncate" title={tour.driverName || ''}>{tour.driverName || '-'}</span>;
    case 'ctp':
      return formatCurrency(row.allowanceTotal);
    case 'total':
      return formatCurrency(row.finalTotal);
    case 'settlement':
      return <SettlementStatusBadge status={tour.settlementStatus} />;
    case 'payment':
      return isTourPaymentEligible(tour) ? (
        <PaymentStatusBadge status={tour.paymentStatus} method={tour.lastPaymentMethod} />
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    case 'commission':
      return row.warningInfo.hasUnpaidCommission ? (
        <Badge className="gap-1 bg-red-600 hover:bg-red-700 text-white" title="Hoa hồng chưa nhận đủ">
          <WalletCards className="h-3 w-3" />
          Chưa nhận đủ
        </Badge>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    case 'warning':
      return (row.warningInfo.hasZeroPrice || row.warningInfo.hasDuplicateDestNames || row.warningInfo.missingWaterExpense) ? (
        <Badge variant="destructive" className="gap-1" title={row.warningInfo.warningTitle}>
          <Flag className="h-3 w-3" />
          Kiểm tra
        </Badge>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    case 'actions':
      return (
        <div className="flex justify-end gap-1">
          {canExportTours && (
            <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={(event) => onExportSingle(tour, event)} title="Xuất Excel">
              <FileDown className="h-4 w-4" />
            </Button>
          )}
          {canDuplicateTours && (
            <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={(event) => onDuplicate(tour.id, event)} title="Nhân bản tour">
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
      );
    default:
      return null;
  }
};
