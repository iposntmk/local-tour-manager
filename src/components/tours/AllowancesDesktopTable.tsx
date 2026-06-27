import { Fragment } from 'react';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2, Copy, MoreHorizontal } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn, formatDate } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency-utils';
import { TourRowLabel } from '@/components/tours/TourRowIcon';
import { STD_ROW_FLAGGED, STD_ROW_ANIM } from '@/lib/tab-styles';
import type { Allowance } from '@/types/tour';
import {
  canEditAnyTourLineField,
  canViewTourLineField,
  type Access,
  type TourLineFieldKey,
} from '@/lib/tour-detail-permissions';

interface AllowancesDesktopTableProps {
  allowances: Allowance[];
  getCategoryPriority: (allowance: Allowance) => number;
  readOnly: boolean;
  lineFieldAccess?: Partial<Record<TourLineFieldKey, Access>>;
  onEdit: (index: number) => void;
  onCopy: (index: number) => void;
  onDelete: (index: number) => void;
  totalAmount: number;
  totalQuantity: number;
}

export function AllowancesDesktopTable({
  allowances,
  getCategoryPriority,
  readOnly,
  lineFieldAccess,
  onEdit,
  onCopy,
  onDelete,
  totalAmount,
  totalQuantity,
}: AllowancesDesktopTableProps) {
  const showName = canViewTourLineField(lineFieldAccess, 'name');
  const showPrice = canViewTourLineField(lineFieldAccess, 'price');
  const showQuantity = canViewTourLineField(lineFieldAccess, 'quantity');
  const showDate = canViewTourLineField(lineFieldAccess, 'date');
  const showTotal = showPrice && showQuantity;
  const canUseActions = !readOnly && canEditAnyTourLineField(lineFieldAccess, ['name', 'price', 'date', 'quantity']);
  const columnCount = [true, showName, showPrice, showQuantity, showTotal, showDate, canUseActions].filter(Boolean).length;
  const footerLeadColSpan = [true, showName, showPrice].filter(Boolean).length;
  const footerTailColSpan = [showDate, canUseActions].filter(Boolean).length;

  const sorted = allowances
    .map((a, i) => ({ ...a, originalIndex: i }))
    .sort((a, b) => {
      const pa = getCategoryPriority(a);
      const pb = getCategoryPriority(b);
      if (pa !== pb) return pa - pb;
      const da = a.date ? new Date(a.date).getTime() : Infinity;
      const db = b.date ? new Date(b.date).getTime() : Infinity;
      return da - db;
    });

  return (
    <Table className="min-w-[680px] sm:min-w-0">
      <TableHeader>
        <TableRow>
          <TableHead className="w-[50px]">#</TableHead>
          {showName && (
          <TableHead>Tên</TableHead>
          )}
          {showPrice && (
          <TableHead>Giá</TableHead>
          )}
          {showQuantity && (
          <TableHead className="w-[80px]">SL</TableHead>
          )}
          {showTotal && (
          <TableHead>
            <span className="sm:hidden">Tổng</span>
            <span className="hidden sm:inline">Thành tiền</span>
          </TableHead>
          )}
          {showDate && (
          <TableHead>Ngày</TableHead>
          )}
          {canUseActions && (
          <TableHead className="text-right w-[80px] sm:w-auto">
            <span className="sm:hidden">Tác</span>
            <span className="hidden sm:inline">Thao tác</span>
          </TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((allowance: any, rowIndex: number, arr: any[]) => {
          const qty = allowance.quantity || 1;
          const total = allowance.price * qty;
          const isZeroPrice = (allowance.price ?? 0) === 0;
          const currentPriority = getCategoryPriority(allowance);
          const prevPriority = rowIndex > 0 ? getCategoryPriority(arr[rowIndex - 1]) : null;
          const showSeparator = prevPriority !== null && currentPriority !== prevPriority;

          return (
            <Fragment key={`${allowance.name}-${allowance.date}-${allowance.originalIndex}`}>
              {showSeparator && (
                <TableRow className="border-t-2 border-primary">
                  <TableCell colSpan={columnCount} className="h-0 p-0" />
                </TableRow>
              )}
              <TableRow
                className={cn(STD_ROW_ANIM, isZeroPrice && STD_ROW_FLAGGED)}
              >
                <TableCell className="font-medium">{rowIndex + 1}</TableCell>
                {showName && (
                <TableCell className="font-medium">
                  <TourRowLabel kind="allowance" label={allowance.name} />
                </TableCell>
                )}
                {showPrice && (
                <TableCell className={allowance.price === 0 ? 'text-destructive font-semibold' : ''}>
                  {formatCurrency(allowance.price)}
                  {allowance.price === 0 && <span className="ml-2 text-destructive" title="Giá bằng 0">⚑</span>}
                </TableCell>
                )}
                {showQuantity && (
                <TableCell>{qty}</TableCell>
                )}
                {showTotal && (
                <TableCell className="font-semibold">{formatCurrency(total)}</TableCell>
                )}
                {showDate && (
                <TableCell>{formatDate(allowance.date)}</TableCell>
                )}
                {canUseActions && (
                <TableCell className="text-right">
                  {canUseActions && (
                    <div className="sm:hidden">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <span className="sr-only">Mở menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(allowance.originalIndex)}>
                            <Edit2 className="mr-2 h-4 w-4" />Sửa
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onCopy(allowance.originalIndex)}>
                            <Copy className="mr-2 h-4 w-4" />Sao chép
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onDelete(allowance.originalIndex)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />Xóa
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                  {canUseActions && (
                    <div className="hidden sm:flex sm:gap-2 sm:justify-end">
                      <Button variant="ghost" size="sm" onClick={() => onCopy(allowance.originalIndex)} className="hover-scale" title="Sao chép dòng">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onEdit(allowance.originalIndex)} className="hover-scale" title="Sửa">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onDelete(allowance.originalIndex)} className="hover-scale text-destructive hover:text-destructive" title="Xóa">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TableCell>
                )}
              </TableRow>
            </Fragment>
          );
        })}
        {(showQuantity || showTotal) && (
        <TableRow className="bg-muted/50 font-semibold">
          <TableCell colSpan={footerLeadColSpan} className="text-right">Tổng cộng:</TableCell>
          {showQuantity && (
          <TableCell>{totalQuantity} ngày</TableCell>
          )}
          {showTotal && (
          <TableCell className="font-bold">{formatCurrency(totalAmount)}</TableCell>
          )}
          {footerTailColSpan > 0 && <TableCell colSpan={footerTailColSpan} />}
        </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
