import { Calendar as CalendarIcon, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  formatTableDateFilterLabel,
  parseTableDateFilter,
  serializeTableDateFilter,
  type TourTableColumn,
  type TourTableFilterKey,
  type TourTableFilters,
} from './tour-table-config';

type TextPopoverFilterState = {
  options: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type ToursDesktopTableHeaderProps = {
  columns: TourTableColumn[];
  filters: TourTableFilters;
  companyOptions: string[];
  landOperatorOptions: string[];
  dateFilterOpen: boolean;
  companyFilterOpen: boolean;
  landOperatorFilterOpen: boolean;
  onDateFilterOpenChange: (open: boolean) => void;
  onCompanyFilterOpenChange: (open: boolean) => void;
  onLandOperatorFilterOpenChange: (open: boolean) => void;
  onUpdateFilter: (key: keyof TourTableFilters, value: string) => void;
  textPopoverFilters?: Partial<Record<TourTableFilterKey, TextPopoverFilterState>>;
};

const stickyHeadClassName =
  'sticky top-0 z-20 bg-muted px-2 py-2 align-top border border-border';

function renderTextPopoverFilter(
  column: TourTableColumn,
  filters: TourTableFilters,
  config: TextPopoverFilterState,
  onUpdateFilter: (key: keyof TourTableFilters, value: string) => void,
) {
  const value = filters[column.key as TourTableFilterKey] || '';
  const label = column.label.toLowerCase();
  return (
    <Popover open={config.open} onOpenChange={config.onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-7 w-full min-w-0 justify-start px-2 text-left text-xs font-normal"
          title={value || `Tất cả ${label}`}
        >
          <span className="truncate">{value || `Tất cả ${label}`}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0" align="start">
        <Command>
          <CommandInput placeholder={column.filterPlaceholder || `Tìm ${label}...`} />
          <CommandList>
            <CommandEmpty>Không tìm thấy.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__all__"
                onSelect={() => {
                  onUpdateFilter(column.key as TourTableFilterKey, '');
                  config.onOpenChange(false);
                }}
              >
                <Check className={cn('mr-2 h-4 w-4', value ? 'opacity-0' : 'opacity-100')} />
                Tất cả
              </CommandItem>
              {config.options.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() => {
                    onUpdateFilter(column.key as TourTableFilterKey, option);
                    config.onOpenChange(false);
                  }}
                >
                  <Check className={cn('mr-2 h-4 w-4', value === option ? 'opacity-100' : 'opacity-0')} />
                  <span className="truncate">{option}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function ToursDesktopTableHeader({
  columns,
  filters,
  companyOptions,
  landOperatorOptions,
  dateFilterOpen,
  companyFilterOpen,
  landOperatorFilterOpen,
  onDateFilterOpenChange,
  onCompanyFilterOpenChange,
  onLandOperatorFilterOpenChange,
  onUpdateFilter,
  textPopoverFilters,
}: ToursDesktopTableHeaderProps) {
  const renderColumnHeader = (column: TourTableColumn) => {
    const alignRight = column.headerClassName?.includes('text-right');

    return (
      <div className={cn('min-w-0 space-y-1.5', alignRight && 'text-right')}>
        <div className="whitespace-normal text-xs font-semibold leading-tight" title={column.title}>
          {column.label}
        </div>
        {column.filterType === 'text' && (
          <Input
            value={filters[column.key as TourTableFilterKey] || ''}
            onChange={(event) => onUpdateFilter(column.key as TourTableFilterKey, event.target.value)}
            onClick={(event) => event.stopPropagation()}
            placeholder={column.filterPlaceholder || 'Lọc'}
            className={cn('h-7 min-w-0 px-2 text-xs font-normal', alignRight && 'text-right')}
          />
        )}
        {column.filterType === 'textPopover' && textPopoverFilters?.[column.key as TourTableFilterKey] && (
          renderTextPopoverFilter(column, filters, textPopoverFilters[column.key as TourTableFilterKey]!, onUpdateFilter)
        )}
        {column.filterType === 'date' && (
          <Popover open={dateFilterOpen} onOpenChange={onDateFilterOpenChange}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-7 w-full min-w-0 justify-start px-2 text-left text-xs font-normal"
                title={formatTableDateFilterLabel(filters.date)}
              >
                <CalendarIcon className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{formatTableDateFilterLabel(filters.date)}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={parseTableDateFilter(filters.date)}
                onSelect={(range) => onUpdateFilter('date', serializeTableDateFilter(range))}
                numberOfMonths={2}
                initialFocus
              />
              {filters.date && (
                <div className="border-t p-3">
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      onUpdateFilter('date', '');
                      onDateFilterOpenChange(false);
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
          <Popover open={companyFilterOpen} onOpenChange={onCompanyFilterOpenChange}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-7 w-full min-w-0 justify-start px-2 text-left text-xs font-normal"
                title={filters.company || 'Tất cả công ty mẹ'}
              >
                <span className="truncate">{filters.company || 'Tất cả công ty mẹ'}</span>
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
                        onUpdateFilter('company', '');
                        onCompanyFilterOpenChange(false);
                      }}
                    >
                      <Check className={cn('mr-2 h-4 w-4', filters.company ? 'opacity-0' : 'opacity-100')} />
                      Tất cả công ty mẹ
                    </CommandItem>
                    {companyOptions.map((company) => (
                      <CommandItem
                        key={company}
                        value={company}
                        onSelect={() => {
                          onUpdateFilter('company', company);
                          onCompanyFilterOpenChange(false);
                        }}
                      >
                        <Check className={cn('mr-2 h-4 w-4', filters.company === company ? 'opacity-100' : 'opacity-0')} />
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
          <Popover open={landOperatorFilterOpen} onOpenChange={onLandOperatorFilterOpenChange}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-7 w-full min-w-0 justify-start px-2 text-left text-xs font-normal"
                title={filters.landOperator || 'Tất cả land tour'}
              >
                <span className="truncate">{filters.landOperator || 'Tất cả land tour'}</span>
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
                        onUpdateFilter('landOperator', '');
                        onLandOperatorFilterOpenChange(false);
                      }}
                    >
                      <Check className={cn('mr-2 h-4 w-4', filters.landOperator ? 'opacity-0' : 'opacity-100')} />
                      Tất cả land tour
                    </CommandItem>
                    {landOperatorOptions.map((name) => (
                      <CommandItem
                        key={name}
                        value={name}
                        onSelect={() => {
                          onUpdateFilter('landOperator', name);
                          onLandOperatorFilterOpenChange(false);
                        }}
                      >
                        <Check className={cn('mr-2 h-4 w-4', filters.landOperator === name ? 'opacity-100' : 'opacity-0')} />
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
          <Select value={filters.warning} onValueChange={(value) => onUpdateFilter('warning', value)}>
            <SelectTrigger className="h-7 min-w-0 px-2 text-xs font-normal">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="warning">Cần kiểm tra</SelectItem>
              <SelectItem value="ok">Bình thường</SelectItem>
            </SelectContent>
          </Select>
        )}
        {column.filterType === 'settlement' && (
          <Select
            value={filters.settlement || 'all'}
            onValueChange={(value) => onUpdateFilter('settlement', value === 'all' ? '' : value)}
          >
            <SelectTrigger className="h-7 min-w-0 px-2 text-xs font-normal">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="draft">Đang soạn</SelectItem>
              <SelectItem value="submitted">Đã gửi KT</SelectItem>
              <SelectItem value="need_changes">Cần bổ sung</SelectItem>
              <SelectItem value="approved">Đã duyệt</SelectItem>
              <SelectItem value="closed">Đã đóng</SelectItem>
            </SelectContent>
          </Select>
        )}
        {column.filterType === 'payment' && (
          <Select
            value={filters.payment || 'all'}
            onValueChange={(value) => onUpdateFilter('payment', value === 'all' ? '' : value)}
          >
            <SelectTrigger className="h-7 min-w-0 px-2 text-xs font-normal">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="na">N/A</SelectItem>
              <SelectItem value="pending">Chờ TT</SelectItem>
              <SelectItem value="partial">Một phần</SelectItem>
              <SelectItem value="paid">Đã TT</SelectItem>
            </SelectContent>
          </Select>
        )}
        {column.filterType === 'commission' && (
          <Select
            value={filters.commission || 'all'}
            onValueChange={(value) => onUpdateFilter('commission', value === 'all' ? '' : value)}
          >
            <SelectTrigger className="h-7 min-w-0 px-2 text-xs font-normal">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="paid">Đã nhận đủ</SelectItem>
              <SelectItem value="unpaid">Chưa nhận đủ</SelectItem>
              <SelectItem value="none">Không có</SelectItem>
            </SelectContent>
          </Select>
        )}
        {column.filterType === 'none' && <div className="h-7" />}
      </div>
    );
  };

  return (
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        {columns.map((column) => (
          <TableHead
            key={column.key}
            className={cn(stickyHeadClassName, column.headerClassName)}
            style={{ minWidth: column.width, width: column.width }}
          >
            {renderColumnHeader(column)}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );
}
