import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Trash2, FileDown } from 'lucide-react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SettlementActionsBar } from '@/components/tours/SettlementActionsBar';
import { formatCurrency } from '@/lib/currency-utils';
import { formatDateRangeDisplay } from '@/lib/date-utils';
import { cn } from '@/lib/utils';
import { calculateTabTotals } from '@/lib/tour-tab-utils';
import type { Tour } from '@/types/tour';
import type { Access, TourTabKey } from '@/lib/tour-detail-permissions';

interface TourDetailHeaderProps {
  tour: Tour | undefined;
  displayTour: Tour | undefined;
  isNewTour: boolean;
  activeTab: string;
  canCreateTour: boolean;
  canEditTourInfo: boolean;
  canExportTour: boolean;
  canDeleteTour: boolean;
  canViewShoppings: boolean;
  tabAccess?: Record<TourTabKey, Access>;
  hasUnpaidShoppings: boolean;
  tourImagesCount: number;
  totalGuests: number;
  headerClasses: string;
  onNavigateBack: () => void;
  onSave: () => void;
  onExport: () => void;
  onDeleteOpen: () => void;
  onShowHistory: () => void;
}

export function TourDetailHeader({
  tour, displayTour, isNewTour, activeTab,
  canCreateTour, canEditTourInfo, canExportTour, canDeleteTour,
  canViewShoppings, tabAccess, hasUnpaidShoppings, tourImagesCount, totalGuests, headerClasses,
  onNavigateBack, onSave, onExport, onDeleteOpen, onShowHistory,
}: TourDetailHeaderProps) {
  const totals = calculateTabTotals(displayTour);
  const canViewTab = (tab: TourTabKey) => tabAccess?.[tab]?.view ?? true;

  return (
    <div className={`${headerClasses} border-b py-2 sm:py-4 bg-blue-100 dark:bg-blue-900 z-40`}>
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Button variant="ghost" size="icon" onClick={onNavigateBack} className="hover-scale h-8 w-8 flex-shrink-0" title="Quay lại danh sách tour">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-base sm:text-xl md:text-2xl lg:text-3xl font-bold truncate">
              {isNewTour ? 'Tour mới' : (tour?.tourCode || 'Chi tiết tour')}
            </h1>
          </div>
          <div className="flex gap-1 sm:gap-2 items-center flex-shrink-0">
            {isNewTour && canCreateTour && (
              <Button variant="default" size="sm" onClick={onSave} className="hover-scale h-10 px-4" title="Lưu tour">
                <Save className="h-4 w-4 mr-2" /><span>Lưu tour</span>
              </Button>
            )}
            {!isNewTour && activeTab === 'info' && canEditTourInfo && (
              <Button variant="default" size="sm" onClick={onSave} className="hover-scale h-8 w-8 p-0 sm:h-10 sm:w-auto sm:px-4" title="Lưu thông tin tour">
                <Save className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Lưu</span>
              </Button>
            )}
            {!isNewTour && canExportTour && (
              <Button variant="outline" size="sm" onClick={onExport} className="hover-scale h-8 w-8 p-0 sm:h-10 sm:w-auto sm:px-4 bg-green-50 hover:bg-green-100 dark:bg-green-950 dark:hover:bg-green-900" title="Xuất Excel">
                <FileDown className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Xuất Excel</span>
              </Button>
            )}
            {!isNewTour && canDeleteTour && (
              <Button variant="destructive" size="sm" onClick={onDeleteOpen} className="hover-scale h-8 w-8 p-0 sm:h-10 sm:w-auto sm:px-4" title="Xóa tour">
                <Trash2 className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Xóa</span>
              </Button>
            )}
          </div>
        </div>

        {displayTour && (
          <div className="flex flex-wrap items-center gap-y-0.5 text-xs sm:text-sm px-2 sm:px-0">
            <div className="flex items-baseline gap-1">
              <span className="text-muted-foreground">Ngày:</span>
              <span className="font-semibold">{displayTour.startDate && displayTour.endDate ? formatDateRangeDisplay(displayTour.startDate, displayTour.endDate) : '-'}</span>
            </div>
            <span className="text-muted-foreground mx-2">|</span>
            <div className="flex items-baseline gap-1">
              <span className="text-muted-foreground">Số ngày:</span>
              <span className="font-semibold">{displayTour.totalDays || 0}</span>
            </div>
            <span className="text-muted-foreground mx-2">|</span>
            <div className="flex items-baseline gap-1">
              <span className="text-muted-foreground">Người lớn:</span>
              <span className="font-semibold">{displayTour.adults || 0}</span>
            </div>
            <span className="text-muted-foreground mx-2">|</span>
            <div className="flex items-baseline gap-1">
              <span className="text-muted-foreground">Trẻ em:</span>
              <span className="font-semibold">{displayTour.children || 0}</span>
            </div>
            <span className="text-muted-foreground mx-2">|</span>
            <div className="flex items-baseline gap-1">
              <span className="text-muted-foreground">Khách:</span>
              <span className="font-semibold">{totalGuests}</span>
            </div>
            <span className="text-muted-foreground mx-2">|</span>
            <div className="flex items-baseline gap-1">
              <span className="text-muted-foreground">Công ty mẹ:</span>
              <span className="font-semibold">{displayTour.companyRef?.nameAtBooking || '-'}</span>
            </div>
            {displayTour.landOperatorRef?.nameAtBooking && (
              <>
                <span className="text-muted-foreground mx-2">|</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-muted-foreground">Công ty land:</span>
                  <span className="font-semibold">{displayTour.landOperatorRef.nameAtBooking}</span>
                </div>
              </>
            )}
          </div>
        )}

        {!isNewTour && tour && (
          <div className="rounded-lg border bg-background/60 px-3 py-2">
            <SettlementActionsBar tour={tour} onShowHistory={onShowHistory} />
          </div>
        )}
      </div>

      <div className="pt-2 sm:pt-4">
        <TabsList className={cn(
          'grid w-full grid-cols-3 gap-1 rounded-xl bg-background shadow-sm border p-0.5 sm:p-1 h-auto',
          canViewShoppings ? 'lg:grid-cols-9' : 'lg:grid-cols-8'
        )}>
          {canViewTab('info') && <TabsTrigger value="info" className="text-xs sm:text-sm">Thông tin</TabsTrigger>}
          {canViewTab('destinations') && <TabsTrigger value="destinations" className="text-xs sm:text-sm">
            <div className="flex flex-col items-center">
              <span className="sm:hidden">Điểm</span><span className="hidden sm:inline">Điểm đến</span>
              <span className="text-xs sm:text-sm font-bold">{displayTour?.destinations?.length || 0} | {formatCurrency(totals.destinations)}</span>
            </div>
          </TabsTrigger>}
          {canViewTab('expenses') && <TabsTrigger value="expenses" className="text-xs sm:text-sm">
            <div className="flex flex-col items-center">
              <span className="sm:hidden">CP</span><span className="hidden sm:inline">Chi phí</span>
              <span className="text-xs sm:text-sm font-bold">{displayTour?.expenses?.length || 0} | {formatCurrency(totals.expenses)}</span>
            </div>
          </TabsTrigger>}
          {canViewTab('meals') && <TabsTrigger value="meals" className="text-xs sm:text-sm">
            <div className="flex flex-col items-center">
              <span>Bữa ăn</span>
              <span className="text-xs sm:text-sm font-bold">{displayTour?.meals?.length || 0} | {formatCurrency(totals.meals)}</span>
            </div>
          </TabsTrigger>}
          {canViewTab('combined') && <TabsTrigger value="combined" className="text-xs sm:text-sm">
            <div className="flex flex-col items-center">
              <span className="sm:hidden">Gộp</span><span className="hidden sm:inline">Gộp dịch vụ</span>
              <span className="text-xs sm:text-sm font-bold">{formatCurrency(totals.destinations + totals.expenses + totals.meals)}</span>
            </div>
          </TabsTrigger>}
          {canViewTab('allowances') && <TabsTrigger value="allowances" className="text-xs sm:text-sm">
            <div className="flex flex-col items-center">
              <span className="sm:hidden">CTP</span><span className="hidden sm:inline">Công tác phí (CTP)</span>
              <span className="text-xs sm:text-sm font-bold">{displayTour?.allowances?.length || 0} | {formatCurrency(totals.allowances)}</span>
            </div>
          </TabsTrigger>}
          {canViewTab('shoppings') && canViewShoppings && (
            <TabsTrigger value="shoppings" className={cn('text-xs sm:text-sm', hasUnpaidShoppings && 'text-red-600 dark:text-red-400')}>
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1">
                  <span className="sm:hidden">Mua</span><span className="hidden sm:inline">Mua sắm</span>
                  {hasUnpaidShoppings && <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />}
                </div>
                <span className={cn('text-xs sm:text-sm font-bold', hasUnpaidShoppings && 'text-red-600 dark:text-red-400')}>
                  {displayTour?.shoppings?.length || 0} | {formatCurrency(totals.shoppings)}
                </span>
              </div>
            </TabsTrigger>
          )}
          {canViewTab('summary') && <TabsTrigger value="summary" className="text-xs sm:text-sm">
            <div className="flex flex-col items-center">
              <span className="sm:hidden">TH</span><span className="hidden sm:inline">Tổng hợp</span>
              <span className="text-xs sm:text-sm font-bold">{formatCurrency(displayTour?.summary?.finalTotal ?? 0)}</span>
            </div>
          </TabsTrigger>}
          {canViewTab('images') && <TabsTrigger value="images" className="text-xs sm:text-sm">
            <div className="flex flex-col items-center">
              <span className="sm:hidden">Ảnh</span><span className="hidden sm:inline">Hình ảnh</span>
              <span className="text-xs sm:text-sm font-bold">{isNewTour ? '' : tourImagesCount}</span>
            </div>
          </TabsTrigger>}
        </TabsList>
      </div>
    </div>
  );
}
