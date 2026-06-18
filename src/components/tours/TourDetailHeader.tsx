import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Trash2, FileDown, Eye, EyeOff } from 'lucide-react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/currency-utils';
import { formatDateRangeDisplay } from '@/lib/date-utils';
import { cn } from '@/lib/utils';
import { AutoShrinkText } from '@/components/ui/auto-shrink-text';
import { calculateTabTotals } from '@/lib/tour-tab-utils';
import { useViewVisibility } from '@/contexts/ViewVisibilityContext';
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
}

const TAB_TRIGGER_CLASS = 'min-w-0 px-1.5 py-1 text-[11px] leading-tight sm:px-2 sm:text-sm';
const TAB_COUNT_CLASS = 'max-w-full truncate text-[10px] font-bold leading-tight sm:text-sm';

export function TourDetailHeader({
  tour, displayTour, isNewTour, activeTab,
  canCreateTour, canEditTourInfo, canExportTour, canDeleteTour,
  canViewShoppings, tabAccess, hasUnpaidShoppings, tourImagesCount, totalGuests, headerClasses,
  onNavigateBack, onSave, onExport, onDeleteOpen,
}: TourDetailHeaderProps) {
  const totals = calculateTabTotals(displayTour);
  const canViewTab = (tab: TourTabKey) => tabAccess?.[tab]?.view ?? true;
  const { showHeaderInfo, showTabs, showSettlementBar, toggleTopMenu, toggleHeaderInfo, toggleTabs, toggleSettlementBar, showTopMenu } = useViewVisibility();

  return (
    <div className={`${headerClasses} border-b py-2 sm:py-4 bg-blue-100 dark:bg-blue-900 z-40`}>
      <div className="mb-2 flex items-center justify-end gap-1 border-b border-blue-200 pb-1.5 dark:border-blue-800">
        <span className="mr-auto text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Hiển thị:</span>
        <button
          onClick={toggleTopMenu}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-blue-200/60 dark:hover:bg-blue-800/60"
          title={showTopMenu ? 'Ẩn menu trên' : 'Hiện menu trên'}
        >
          {showTopMenu ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          Menu
        </button>
        <button
          onClick={toggleHeaderInfo}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-blue-200/60 dark:hover:bg-blue-800/60"
          title={showHeaderInfo ? 'Ẩn thông tin tour' : 'Hiện thông tin tour'}
        >
          {showHeaderInfo ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          Thông tin
        </button>
        <button
          onClick={toggleTabs}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-blue-200/60 dark:hover:bg-blue-800/60"
          title={showTabs ? 'Ẩn tabs' : 'Hiện tabs'}
        >
          {showTabs ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          Tabs
        </button>
        <button
          onClick={toggleSettlementBar}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-blue-200/60 dark:hover:bg-blue-800/60"
          title={showSettlementBar ? 'Ẩn quyết toán' : 'Hiện quyết toán'}
        >
          {showSettlementBar ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          Quyết toán
        </button>
      </div>

      {showHeaderInfo && (
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
                <span className="text-muted-foreground sm:hidden">NL:</span>
                <span className="hidden text-muted-foreground sm:inline">Người lớn:</span>
                <span className="font-semibold">{displayTour.adults || 0}</span>
              </div>
              <span className="text-muted-foreground mx-2">|</span>
              <div className="flex items-baseline gap-1">
                <span className="text-muted-foreground sm:hidden">TE:</span>
                <span className="hidden text-muted-foreground sm:inline">Trẻ em:</span>
                <span className="font-semibold">{displayTour.children || 0}</span>
              </div>
              <span className="text-muted-foreground mx-2">|</span>
              <div className="flex items-baseline gap-1">
                <span className="text-muted-foreground">Khách:</span>
                <span className="font-semibold">{totalGuests}</span>
              </div>
              <span className="text-muted-foreground mx-2">|</span>
              <div className="flex items-baseline gap-1">
                <span className="text-muted-foreground sm:hidden">Cty mẹ:</span>
                <span className="hidden text-muted-foreground sm:inline">Công ty mẹ:</span>
                <span className="font-semibold">{displayTour.companyRef?.nameAtBooking || '-'}</span>
              </div>
              {displayTour.landOperatorRef?.nameAtBooking && (
                <>
                  <span className="text-muted-foreground mx-2">|</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-muted-foreground sm:hidden">Cty land:</span>
                    <span className="hidden text-muted-foreground sm:inline">Công ty land:</span>
                    <span className="font-semibold">{displayTour.landOperatorRef.nameAtBooking}</span>
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      )}

      {showTabs && (
        <div className="pt-2 sm:pt-4">
          <TabsList className={cn(
            'grid w-full grid-cols-5 gap-1 rounded-lg bg-background shadow-sm border p-0.5 sm:gap-1.5 sm:p-1 h-auto',
            canViewShoppings ? 'lg:grid-cols-9' : 'lg:grid-cols-8'
          )}>
            {canViewTab('info') && <TabsTrigger value="info" className={TAB_TRIGGER_CLASS}>Thông tin</TabsTrigger>}
            {canViewTab('destinations') && <TabsTrigger value="destinations" className={TAB_TRIGGER_CLASS}>
              <div className="flex flex-col items-center w-full min-w-0">
                <span className="w-full">Điểm đến</span>
                <span className={TAB_COUNT_CLASS}>{displayTour?.destinations?.length || 0} | {formatCurrency(totals.destinations)}</span>
              </div>
            </TabsTrigger>}
            {canViewTab('expenses') && <TabsTrigger value="expenses" className={TAB_TRIGGER_CLASS}>
              <div className="flex flex-col items-center w-full min-w-0">
                <span className="w-full">Chi phí</span>
                <span className={TAB_COUNT_CLASS}>{displayTour?.expenses?.length || 0} | {formatCurrency(totals.expenses)}</span>
              </div>
            </TabsTrigger>}
            {canViewTab('meals') && <TabsTrigger value="meals" className={TAB_TRIGGER_CLASS}>
              <div className="flex flex-col items-center w-full min-w-0">
                <span className="w-full">Bữa ăn</span>
                <span className={TAB_COUNT_CLASS}>{displayTour?.meals?.length || 0} | {formatCurrency(totals.meals)}</span>
              </div>
            </TabsTrigger>}
            {canViewTab('combined') && <TabsTrigger value="combined" className={TAB_TRIGGER_CLASS}>
              <div className="flex flex-col items-center w-full min-w-0">
                <span className="w-full hidden sm:inline">Gộp dịch vụ</span>
                <AutoShrinkText className="w-full sm:hidden">Gộp DV & CTP</AutoShrinkText>
                <span className={TAB_COUNT_CLASS}>{formatCurrency(totals.destinations + totals.expenses + totals.meals)}</span>
              </div>
            </TabsTrigger>}
            {canViewTab('allowances') && <TabsTrigger value="allowances" className={TAB_TRIGGER_CLASS}>
              <div className="flex flex-col items-center w-full min-w-0">
                <span className="w-full hidden sm:inline">Công tác phí (CTP)</span>
                <span className="w-full sm:hidden">CTP</span>
                <span className={TAB_COUNT_CLASS}>{displayTour?.allowances?.length || 0} | {formatCurrency(totals.allowances)}</span>
              </div>
            </TabsTrigger>}
            {canViewTab('shoppings') && canViewShoppings && (
              <TabsTrigger value="shoppings" className={cn(TAB_TRIGGER_CLASS, 'order-7 lg:order-none', hasUnpaidShoppings && 'text-red-600 dark:text-red-400')}>
                <div className="flex flex-col items-center w-full min-w-0">
                  <div className="flex items-center gap-1 min-w-0">
                    <span>Mua sắm</span>
                    {hasUnpaidShoppings && <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />}
                  </div>
                  <span className={cn(TAB_COUNT_CLASS, hasUnpaidShoppings && 'text-red-600 dark:text-red-400')}>
                    {displayTour?.shoppings?.length || 0} | {formatCurrency(totals.shoppings)}
                  </span>
                </div>
              </TabsTrigger>
            )}
            {canViewTab('summary') && <TabsTrigger value="summary" className={cn(TAB_TRIGGER_CLASS, 'order-8 lg:order-none')}>
              <div className="flex flex-col items-center w-full min-w-0">
                <span className="w-full">Tổng hợp</span>
                <span className={TAB_COUNT_CLASS}>{formatCurrency(displayTour?.summary?.finalTotal ?? 0)}</span>
              </div>
            </TabsTrigger>}
            {canViewTab('images') && <TabsTrigger value="images" className={cn(TAB_TRIGGER_CLASS, 'order-9 lg:order-none')}>
              <div className="flex flex-col items-center w-full min-w-0">
                <span className="w-full">Hình ảnh</span>
                <span className={TAB_COUNT_CLASS}>{isNewTour ? '' : tourImagesCount}</span>
              </div>
            </TabsTrigger>}
          </TabsList>
        </div>
      )}
    </div>
  );
}
