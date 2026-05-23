import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { Calendar as CalendarIcon, Check, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/currency-utils';
import { cn } from '@/lib/utils';
import type { Tour } from '@/types/tour';
import { ToursDesktopTableCellContent, type TourTableRowData } from './ToursDesktopTableCell';
import { ToursDesktopTableToolbar } from './ToursDesktopTableToolbar';
import {
  formatTableDateFilterLabel,
  formatTourNationalities,
  getAllowanceTotal,
  getTourDays,
  getTourGuests,
  getTourWarningInfo,
  includesTableFilter,
  parseTableDateFilter,
  serializeTableDateFilter,
  tourMatchesTableDateFilter,
  TOUR_TABLE_COLUMNS,
  TOUR_TABLE_COLUMN_KEYS,
  type TourTableColumn,
  type TourTableColumnKey,
  type TourTableFilterKey,
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
  const [tableColumnVisibility, setTableColumnVisibility] = useState<Record<TourTableColumnKey, boolean>>(loadTourTableColumnVisibility);
  const [tableFilters, setTableFilters] = useState<TourTableFilters>(loadTourTableFilters);
  const [tableDateFilterOpen, setTableDateFilterOpen] = useState(false);
  const [tableCompanyFilterOpen, setTableCompanyFilterOpen] = useState(false);
  const [tableLandOperatorFilterOpen, setTableLandOperatorFilterOpen] = useState(false);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('tours.table.columnVisibility', JSON.stringify(tableColumnVisibility));
  }, [tableColumnVisibility]);

  useEffect(() => {
    localStorage.setItem('tours.table.filters', JSON.stringify(tableFilters));
  }, [tableFilters]);

  const visibleColumns = useMemo(
    () => TOUR_TABLE_COLUMNS.filter((column) => tableColumnVisibility[column.key]),
    [tableColumnVisibility]
  );
  const tableWidth = useMemo(
    () => visibleColumns.reduce((sum, column) => sum + column.width, 0),
    [visibleColumns]
  );

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
        includesTableFilter(`${finalTotal} ${formatCurrency(finalTotal)}`, tableFilters.total)
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

  const syncScroll = (source: 'top' | 'bottom') => {
    const sourceElement = source === 'top' ? topScrollRef.current : bottomScrollRef.current;
    const targetElement = source === 'top' ? bottomScrollRef.current : topScrollRef.current;

    if (!sourceElement || !targetElement) return;

    const sourceScroll = sourceElement.scrollLeft;
    if (targetElement.scrollLeft === sourceScroll) return;

    targetElement.scrollLeft = sourceScroll;
  };

  const scrollHorizontally = (delta: number) => {
    const topElement = topScrollRef.current;
    const bottomElement = bottomScrollRef.current;
    const sourceElement = topElement || bottomElement;
    if (!sourceElement) return;

    const maxScroll = Math.max(0, sourceElement.scrollWidth - sourceElement.clientWidth);
    const nextScrollLeft = Math.max(0, Math.min(maxScroll, sourceElement.scrollLeft + delta));
    if (topElement) topElement.scrollLeft = nextScrollLeft;
    if (bottomElement) bottomElement.scrollLeft = nextScrollLeft;
  };

  const renderHeader = (column: TourTableColumn) => {
    const alignRight = column.headerClassName?.includes('text-right');

    return (
      <div className={`space-y-1.5 ${alignRight ? 'text-right' : ''}`}>
        <div className="text-xs font-semibold">{column.label}</div>
        {column.filterType === 'text' && (
          <Input
            value={tableFilters[column.key as TourTableFilterKey] || ''}
            onChange={(event) => updateTableFilter(column.key as TourTableFilterKey, event.target.value)}
            onClick={(event) => event.stopPropagation()}
            placeholder={column.filterPlaceholder || 'Lọc'}
            className={`h-7 px-2 text-xs font-normal ${alignRight ? 'text-right' : ''}`}
          />
        )}
        {column.filterType === 'date' && (
          <Popover open={tableDateFilterOpen} onOpenChange={setTableDateFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-7 w-full justify-start px-2 text-left text-xs font-normal"
                title={formatTableDateFilterLabel(tableFilters.date)}
              >
                <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                <span className="truncate">{formatTableDateFilterLabel(tableFilters.date)}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={parseTableDateFilter(tableFilters.date)}
                onSelect={(range) => updateTableFilter('date', serializeTableDateFilter(range))}
                numberOfMonths={2}
                initialFocus
              />
              {tableFilters.date && (
                <div className="border-t p-3">
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      updateTableFilter('date', '');
                      setTableDateFilterOpen(false);
                    }}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Xóa ngày
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        )}
        {column.filterType === 'company' && (
          <Popover open={tableCompanyFilterOpen} onOpenChange={setTableCompanyFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-7 w-full justify-start px-2 text-left text-xs font-normal"
                title={tableFilters.company || 'Tất cả công ty mẹ'}
              >
                <span className="truncate">{tableFilters.company || 'Tất cả công ty mẹ'}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[260px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Tìm công ty mẹ..." />
                <CommandList>
                  <CommandEmpty>Không tìm thấy công ty mẹ.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="__all_companies__"
                      onSelect={() => {
                        updateTableFilter('company', '');
                        setTableCompanyFilterOpen(false);
                      }}
                    >
                      <Check className={`mr-2 h-4 w-4 ${tableFilters.company ? 'opacity-0' : 'opacity-100'}`} />
                      Tất cả công ty mẹ
                    </CommandItem>
                    {companyOptions.map((company) => (
                      <CommandItem
                        key={company}
                        value={company}
                        onSelect={() => {
                          updateTableFilter('company', company);
                          setTableCompanyFilterOpen(false);
                        }}
                      >
                        <Check className={`mr-2 h-4 w-4 ${tableFilters.company === company ? 'opacity-100' : 'opacity-0'}`} />
                        <span className="truncate">{company}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
        {column.filterType === 'landOperator' && (
          <Popover open={tableLandOperatorFilterOpen} onOpenChange={setTableLandOperatorFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-7 w-full justify-start px-2 text-left text-xs font-normal"
                title={tableFilters.landOperator || 'Tất cả land tour'}
              >
                <span className="truncate">{tableFilters.landOperator || 'Tất cả land tour'}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[260px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Tìm land tour..." />
                <CommandList>
                  <CommandEmpty>Không tìm thấy công ty land tour.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="__all_land_operators__"
                      onSelect={() => {
                        updateTableFilter('landOperator', '');
                        setTableLandOperatorFilterOpen(false);
                      }}
                    >
                      <Check className={`mr-2 h-4 w-4 ${tableFilters.landOperator ? 'opacity-0' : 'opacity-100'}`} />
                      Tất cả land tour
                    </CommandItem>
                    {landOperatorOptions.map((name) => (
                      <CommandItem
                        key={name}
                        value={name}
                        onSelect={() => {
                          updateTableFilter('landOperator', name);
                          setTableLandOperatorFilterOpen(false);
                        }}
                      >
                        <Check className={`mr-2 h-4 w-4 ${tableFilters.landOperator === name ? 'opacity-100' : 'opacity-0'}`} />
                        <span className="truncate">{name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
        {column.filterType === 'warning' && (
          <Select value={tableFilters.warning} onValueChange={(value) => updateTableFilter('warning', value)}>
            <SelectTrigger className="h-7 px-2 text-xs font-normal">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="warning">Cần kiểm tra</SelectItem>
              <SelectItem value="ok">Bình thường</SelectItem>
            </SelectContent>
          </Select>
        )}
        {column.filterType === 'none' && <div className="h-7" />}
      </div>
    );
  };

  return (
    <div className="hidden md:block mt-6 rounded-lg border bg-card overflow-hidden">
      <ToursDesktopTableToolbar
        filteredCount={tableFilteredTours.length}
        totalCount={tours.length}
        columnFilterCount={tableColumnFilterCount}
        columnVisibility={tableColumnVisibility}
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
              className="h-6 min-w-0 flex-1 overflow-x-scroll"
              onScroll={() => syncScroll('top')}
              onWheel={(event) => {
                if (tableWidth <= (bottomScrollRef.current?.clientWidth ?? 0)) return;
                event.preventDefault();
                scrollHorizontally(event.deltaX + event.deltaY);
              }}
            >
              <div className="h-1" style={{ width: `${tableWidth}px`, minWidth: `${tableWidth}px` }} />
            </div>
            <Button type="button" variant="ghost" size="sm" className="h-6 w-6 shrink-0 p-0" onClick={() => scrollHorizontally(360)} aria-label="Cuộn bảng sang phải">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div ref={bottomScrollRef} className="w-full max-w-full overflow-x-scroll" onScroll={() => syncScroll('bottom')}>
            <Table className="table-fixed text-xs" style={{ width: tableWidth, minWidth: tableWidth }}>
              <TableHeader className="bg-muted/50">
                <TableRow className="hover:bg-transparent">
                  {visibleColumns.map((column) => (
                    <TableHead
                      key={column.key}
                      className={cn('px-2 py-2 align-top', column.headerClassName)}
                      style={{ width: column.width, minWidth: column.width, maxWidth: column.width }}
                    >
                      {renderHeader(column)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
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
                            className={cn('px-2 py-2 text-xs', column.cellClassName)}
                            style={{ width: column.width, minWidth: column.width, maxWidth: column.width }}
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
