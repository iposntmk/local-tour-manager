import { Columns3, FilterX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  TOUR_TABLE_COLUMNS,
  type TourTableColumnKey,
} from './tour-table-config';

type ToursDesktopTableToolbarProps = {
  filteredCount: number;
  totalCount: number;
  columnFilterCount: number;
  columnVisibility: Record<TourTableColumnKey, boolean>;
  canViewShoppingSensitive: boolean;
  onClearFilters: () => void;
  onSetAllColumnsVisible: (visible: boolean) => void;
  onToggleColumn: (key: TourTableColumnKey, visible: boolean) => void;
};

export const ToursDesktopTableToolbar = ({
  filteredCount,
  totalCount,
  columnFilterCount,
  columnVisibility,
  canViewShoppingSensitive,
  onClearFilters,
  onSetAllColumnsVisible,
  onToggleColumn,
}: ToursDesktopTableToolbarProps) => (
  <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/20 px-4 py-2">
    <div className="text-sm text-muted-foreground">
      Hiển thị <span className="font-semibold text-foreground">{filteredCount}</span> / {totalCount} tour trong bảng
    </div>
    <div className="flex items-center gap-2">
      {columnFilterCount > 0 && (
        <Button variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={onClearFilters}>
          <FilterX className="mr-1.5 h-4 w-4" />
          Xóa lọc cột
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 px-2 text-xs">
            <Columns3 className="mr-1.5 h-4 w-4" />
            Cột
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-[70vh] w-56 overflow-y-auto">
          <DropdownMenuLabel>Cột hiển thị</DropdownMenuLabel>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              onSetAllColumnsVisible(true);
            }}
          >
            Hiện tất cả
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              onSetAllColumnsVisible(false);
            }}
          >
            Ẩn tất cả
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {TOUR_TABLE_COLUMNS.filter((column) => canViewShoppingSensitive || column.key !== 'commission').map((column) => (
            <DropdownMenuCheckboxItem
              key={column.key}
              checked={columnVisibility[column.key]}
              onCheckedChange={(checked) => onToggleColumn(column.key, checked === true)}
              onSelect={(event) => event.preventDefault()}
            >
              {column.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </div>
);
