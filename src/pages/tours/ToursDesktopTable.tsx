import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/currency-utils';
import { isTourPaymentEligible } from '@/lib/payment-utils';
import { cn } from '@/lib/utils';
import { useCanViewShoppingSensitive } from '@/hooks/useCanViewShoppingSensitive';
import type { Tour } from '@/types/tour';
import { ToursDesktopTableCellContent, type TourTableRowData } from './ToursDesktopTableCell';
import { ToursDesktopTableHeader } from './ToursDesktopTableHeader';
import { ToursDesktopTableToolbar } from './ToursDesktopTableToolbar';
import { useSyncedHorizontalScroll } from './useSyncedHorizontalScroll';
import {
  formatTourNationalities,
  getAllowanceTotal,
  getShoppingCommissionInfo,
  getTourDays,
  getTourGuests,
  getTourWarningInfo,
  includesTableFilter,
  tourMatchesTableDateFilter,
  TOUR_TABLE_COLUMNS,
  TOUR_TABLE_COLUMN_KEYS,
  type TourTableColumnKey,
  type TourTableFilters,
  createDefaultTourTableColumnVisibility,
  createDefaultTourTableFilters,
  loadTourTableColumnVisibility,
  loadTourTableFilters,
} from './tour-table-config';

type ToursDesktopTableProps = {
  tours: Tour[];
  canExportTours: boolean;
  canDuplicateTours: boolean;
  canDeleteTours: boolean;
  deletePending: boolean;
  onOpenTour: (tourId: string) => void;
  onExportSingle: (tour: Tour, event: MouseEvent) => void;
  onDuplicate: (tourId: string, event: MouseEvent) => void;
  onDelete: (tourId: string, event: MouseEvent) => void;
  userProfileMap?: Map<string, { fullName?: string; email: string }>;
};

export const ToursDesktopTable = ({
  tours,
  canExportTours,
  canDuplicateTours,
  canDeleteTours,
  deletePending,
  onOpenTour,
  onExportSingle,
  onDuplicate,
  onDelete,
}: ToursDesktopTableProps) => {
  const canViewShoppingSensitive = useCanViewShoppingSensitive();
  const [tableColumnVisibility, setTableColumnVisibility] = useState<Record<TourTableColumnKey, boolean>>(loadTourTableColumnVisibility);
  const [tableFilters, setTableFilters] = useState<TourTableFilters>(loadTourTableFilters);
  const [tableDateFilterOpen, setTableDateFilterOpen] = useState(false);
  const [tableCompanyFilterOpen, setTableCompanyFilterOpen] = useState(false);
  const [tableLandOperatorFilterOpen, setTableLandOperatorFilterOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('tours.table.columnVisibility', JSON.stringify(tableColumnVisibility));
  }, [tableColumnVisibility]);

  useEffect(() => {
    localStorage.setItem('tours.table.filters', JSON.stringify(tableFilters));
  }, [tableFilters]);

  const visibleColumns = useMemo(
    () => TOUR_TABLE_COLUMNS.filter((column) => tableColumnVisibility[column.key] && (canViewShoppingSensitive || column.key !== 'commission')),
    [canViewShoppingSensitive, tableColumnVisibility]
  );
  const tableMinWidth = useMemo(
    () => visibleColumns.reduce((sum, column) => sum + column.width, 0),
    [visibleColumns]
  );
  const {
    topScrollRef,
    tableViewportRef,
    tableRef,
    scrollContentWidth,
    syncScroll,
    scrollHorizontally,
  } = useSyncedHorizontalScroll(tableMinWidth);

  const companyOptions = useMemo(() => {
    const companies = new Set<string>();
    tours.forEach((tour) => {
      const companyName = tour.companyRef?.nameAtBooking?.trim();
      if (companyName) companies.add(companyName);
    });
    const companyFilter = tableFilters.company?.trim();
    if (companyFilter) companies.add(companyFilter);
    return Array.from(companies).sort((a, b) => a.localeCompare(b));
  }, [tableFilters.company, tours]);

  const landOperatorOptions = useMemo(() => {
    const landOperators = new Set<string>();
    tours.forEach((tour) => {
      const name = tour.landOperatorRef?.nameAtBooking?.trim();
      if (name) landOperators.add(name);
    });
    const landOperatorFilter = tableFilters.landOperator?.trim();
    if (landOperatorFilter) landOperators.add(landOperatorFilter);
    return Array.from(landOperators).sort((a, b) => a.localeCompare(b));
  }, [tableFilters.landOperator, tours]);

  const [textPopoverOpen, setTextPopoverOpen] = useState<Partial<Record<TourTableFilterKey, boolean>>>({});

  const guideOptions = useMemo(() => {
    const names = new Set<string>();
    tours.forEach((tour) => {
      const name = tour.guideRef?.nameAtBooking?.trim();
      if (name) names.add(name);
    });
    const filter = tableFilters.guide?.trim();
    if (filter) names.add(filter);
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [tableFilters.guide, tours]);

  const clientNameOptions = useMemo(() => {
    const names = new Set<string>();
    tours.forEach((tour) => {
      const name = tour.clientName?.trim();
      if (name) names.add(name);
    });
    const filter = tableFilters.clientName?.trim();
    if (filter) names.add(filter);
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [tableFilters.clientName, tours]);

  const driverNameOptions = useMemo(() => {
    const names = new Set<string>();
    tours.forEach((tour) => {
      const name = tour.driverName?.trim();
      if (name) names.add(name);
    });
    const filter = tableFilters.driverName?.trim();
    if (filter) names.add(filter);
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [tableFilters.driverName, tours]);

  const nationalityOptions = useMemo(() => {
    const names = new Set<string>();
    tours.forEach((tour) => {
      (tour.clientNationalities || []).forEach((n) => {
        if (n.nameAtBooking?.trim()) names.add(n.nameAtBooking.trim());
      });
      if (tour.clientNationalityRef?.nameAtBooking?.trim()) {
        names.add(tour.clientNationalityRef.nameAtBooking.trim());
      }
    });
    const filter = tableFilters.nationality?.trim();
    if (filter) names.add(filter);
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [tableFilters.nationality, tours]);

  const tableColumnFilterCount = useMemo(() => {
    return Object.entries(tableFilters).reduce((count, [key, value]) => {
      if (key === 'warning') return count + (value !== 'all' ? 1 : 0);
      return count + (String(value).trim() ? 1 : 0);
    }, 0);
  }, [tableFilters]);

  const tableFilteredTours = useMemo(() => {
    return tours.filter((tour) => {
      const warningInfo = getTourWarningInfo(tour);
      const totalDays = getTourDays(tour);
      const totalGuests = getTourGuests(tour);
      const allowanceTotal = getAllowanceTotal(tour);
      const finalTotal = tour.summary?.finalTotal ?? 0;

      if (tableFilters.warning === 'warning' && !warningInfo.showRedFlag) return false;
      if (tableFilters.warning === 'ok' && warningInfo.showRedFlag) return false;

      const commissionFilter = tableFilters.commission;
      if (commissionFilter) {
        const shoppingInfo = getShoppingCommissionInfo(tour.shoppings || []);
        if (commissionFilter === 'paid' && !(shoppingInfo.hasShoppings && shoppingInfo.allPaid)) return false;
        if (commissionFilter === 'unpaid' && !(shoppingInfo.hasShoppings && !shoppingInfo.allPaid)) return false;
        if (commissionFilter === 'none' && shoppingInfo.hasShoppings) return false;
      }

      return (
        includesTableFilter(tour.tourCode, tableFilters.tourCode) &&
        tourMatchesTableDateFilter(tour, tableFilters.date) &&
        includesTableFilter(`${totalDays} ${totalDays} ngày ${totalDays}d`, tableFilters.days) &&
        includesTableFilter(`${totalGuests} ${totalGuests}p ${tour.adults || 0} ${tour.children || 0}`, tableFilters.guests) &&
        includesTableFilter(tour.companyRef?.nameAtBooking, tableFilters.company) &&
        includesTableFilter(tour.landOperatorRef?.nameAtBooking, tableFilters.landOperator) &&
        includesTableFilter(tour.guideRef?.nameAtBooking, tableFilters.guide) &&
        includesTableFilter(formatTourNationalities(tour), tableFilters.nationality) &&
        includesTableFilter(tour.clientName, tableFilters.clientName) &&
        includesTableFilter(tour.clientPhone, tableFilters.clientPhone) &&
        includesTableFilter(tour.driverName, tableFilters.driverName) &&
        includesTableFilter(`${allowanceTotal} ${formatCurrency(allowanceTotal)}`, tableFilters.ctp) &&
        includesTableFilter(`${finalTotal} ${formatCurrency(finalTotal)}`, tableFilters.total) &&
        (!tableFilters.settlement || tour.settlementStatus === tableFilters.settlement) &&
        (!tableFilters.payment || (
          tableFilters.payment === 'na'
            ? !isTourPaymentEligible(tour)
            : isTourPaymentEligible(tour) && tour.paymentStatus === tableFilters.payment
        ))
      );
    });
  }, [tableFilters, tours]);

  const updateTableFilter = (key: keyof TourTableFilters, value: string) => {
    setTableFilters((prev) => ({ ...prev, [key]: value } as TourTableFilters));
  };

  const clearTableFilters = () => {
    setTableFilters(createDefaultTourTableFilters());
  };

  const setAllColumnsVisible = (visible: boolean) => {
    setTableColumnVisibility(
      TOUR_TABLE_COLUMN_KEYS.reduce((visibility, key) => {
        visibility[key] = visible;
        return visibility;
      }, createDefaultTourTableColumnVisibility())
    );
  };

  const toggleColumn = (key: TourTableColumnKey, visible: boolean) => {
    setTableColumnVisibility((prev) => ({ ...prev, [key]: visible }));
  };

  return (
    <div className="hidden md:block mt-6 rounded-lg border bg-card overflow-hidden">
      <ToursDesktopTableToolbar
        filteredCount={tableFilteredTours.length}
        totalCount={tours.length}
        columnFilterCount={tableColumnFilterCount}
        columnVisibility={tableColumnVisibility}
        canViewShoppingSensitive={canViewShoppingSensitive}
        onClearFilters={clearTableFilters}
        onSetAllColumnsVisible={setAllColumnsVisible}
        onToggleColumn={toggleColumn}
      />
      {visibleColumns.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">
          Tất cả cột đang ẩn. Dùng nút Cột để hiện lại.
        </div>
      ) : (
        <>
          <div className="flex items-center gap-1 border-b bg-muted/10 px-1 py-1">
            <Button type="button" variant="ghost" size="sm" className="h-6 w-6 shrink-0 p-0" onClick={() => scrollHorizontally(-360)} aria-label="Cuộn bảng sang trái">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div
              ref={topScrollRef}
              className="h-6 min-w-0 flex-1 overflow-x-scroll overflow-y-hidden"
              onScroll={() => {
                syncScroll('top');
              }}
              onWheel={(event) => {
                const container = tableViewportRef.current;
                if (!container || scrollContentWidth <= container.clientWidth) return;

                event.preventDefault();
                const delta = event.deltaX !== 0 ? event.deltaX : event.deltaY;
                scrollHorizontally(delta);
              }}
              style={{ 
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(0,0,0,0.3) transparent'
              }}
            >
              <div 
                className="h-4 bg-gradient-to-r from-transparent via-gray-100/20 to-transparent" 
                style={{ 
                  width: `${scrollContentWidth}px`,
                  minWidth: `${scrollContentWidth}px`,
                }}
              />
            </div>
            <Button type="button" variant="ghost" size="sm" className="h-6 w-6 shrink-0 p-0" onClick={() => scrollHorizontally(360)} aria-label="Cuộn bảng sang phải">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div
            ref={tableViewportRef}
            className="max-h-[70vh] w-full max-w-full overflow-auto overscroll-contain"
            onScroll={() => syncScroll('table')}
          >
            <Table
              unwrapped
              ref={tableRef}
              className="w-full table-auto border-separate border-spacing-0 text-xs border border-border"
              style={{ minWidth: tableMinWidth }}
            >
              <ToursDesktopTableHeader
                columns={visibleColumns}
                filters={tableFilters}
                companyOptions={companyOptions}
                landOperatorOptions={landOperatorOptions}
                dateFilterOpen={tableDateFilterOpen}
                companyFilterOpen={tableCompanyFilterOpen}
                landOperatorFilterOpen={tableLandOperatorFilterOpen}
                onDateFilterOpenChange={setTableDateFilterOpen}
                onCompanyFilterOpenChange={setTableCompanyFilterOpen}
                onLandOperatorFilterOpenChange={setTableLandOperatorFilterOpen}
                onUpdateFilter={updateTableFilter}
                textPopoverFilters={{
                  guide: { options: guideOptions, open: textPopoverOpen.guide ?? false, onOpenChange: (open) => setTextPopoverOpen((prev) => ({ ...prev, guide: open })) },
                  nationality: { options: nationalityOptions, open: textPopoverOpen.nationality ?? false, onOpenChange: (open) => setTextPopoverOpen((prev) => ({ ...prev, nationality: open })) },
                  clientName: { options: clientNameOptions, open: textPopoverOpen.clientName ?? false, onOpenChange: (open) => setTextPopoverOpen((prev) => ({ ...prev, clientName: open })) },
                  driverName: { options: driverNameOptions, open: textPopoverOpen.driverName ?? false, onOpenChange: (open) => setTextPopoverOpen((prev) => ({ ...prev, driverName: open })) },
                }}
              />
              <TableBody>
                {tableFilteredTours.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={visibleColumns.length} className="h-24 text-center text-muted-foreground">
                      Không có tour nào phù hợp với bộ lọc cột.
                    </TableCell>
                  </TableRow>
                ) : (
                  tableFilteredTours.map((tour, index) => {
                    const row: TourTableRowData = {
                      warningInfo: getTourWarningInfo(tour),
                      totalDays: getTourDays(tour),
                      totalGuests: getTourGuests(tour),
                      allowanceTotal: getAllowanceTotal(tour),
                      finalTotal: tour.summary?.finalTotal ?? 0,
                      hasChildren: (tour.children || 0) > 0,
                      index,
                    };

                    return (
                      <TableRow
                        key={tour.id}
                        className={`cursor-pointer ${row.warningInfo.showRedFlag ? 'bg-destructive/5 hover:bg-destructive/10' : ''}`}
                        onClick={() => onOpenTour(tour.id)}
                      >
                        {visibleColumns.map((column) => (
                          <TableCell
                            key={column.key}
                            className={cn('min-w-0 px-2 py-2 text-xs align-top border border-border', column.cellClassName)}
                            style={{ minWidth: column.width, width: column.width }}
                          >
                            <ToursDesktopTableCellContent
                              column={column}
                              tour={tour}
                              row={row}
                              canExportTours={canExportTours}
                              canDuplicateTours={canDuplicateTours}
                              canDeleteTours={canDeleteTours}
                              deletePending={deletePending}
                              onExportSingle={onExportSingle}
                              onDuplicate={onDuplicate}
                              onDelete={onDelete}
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
};
