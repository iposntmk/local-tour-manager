import { Edit2, Copy, Trash2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDate } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency-utils';
import { TourRowIcon } from '@/components/tours/TourRowIcon';
import type { Allowance } from '@/types/tour';

interface AllowanceItem extends Allowance {
  originalIndex: number;
  showSeparator?: boolean;
}

interface Props {
  items: AllowanceItem[];
  readOnly: boolean;
  onEdit: (idx: number) => void;
  onCopy: (idx: number) => void;
  onDelete: (idx: number) => void;
  totalAmount: number;
  totalQuantity: number;
}

export function AllowancesMobileList({ items, readOnly, onEdit, onCopy, onDelete, totalAmount, totalQuantity }: Props) {
  return (
    <div className="p-3 space-y-2">
      {items.map((allowance) => {
        const qty = allowance.quantity || 1;
        const total = allowance.price * qty;
        const isZeroPrice = allowance.price === 0;
        return (
          <div key={`${allowance.name}-${allowance.date}-${allowance.originalIndex}`}>
            {allowance.showSeparator && <div className="border-t-2 border-primary my-2" />}
            <div className={`rounded-lg border p-2.5 space-y-1.5 ${isZeroPrice ? 'bg-red-50 dark:bg-red-950' : 'bg-card'}`}>
              {/* Row 1: icon + name + date + actions */}
              <div className="flex items-center gap-1.5 min-w-0">
                <TourRowIcon kind="allowance" label={allowance.name} className="shrink-0" />
                <span className="flex-1 min-w-0 truncate text-sm font-medium">{allowance.name}</span>
                {isZeroPrice && <span className="shrink-0 text-destructive text-xs">⚑</span>}
                <span className="shrink-0 text-xs text-muted-foreground pl-1">{formatDate(allowance.date)}</span>
                {!readOnly && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onCopy(allowance.originalIndex)}>
                        <Copy className="mr-2 h-4 w-4" />Nhân bản
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(allowance.originalIndex)}>
                        <Edit2 className="mr-2 h-4 w-4" />Sửa
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDelete(allowance.originalIndex)} className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />Xóa
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              {/* Row 2: values */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs pl-9">
                <span>
                  <span className="text-muted-foreground">Giá: </span>
                  <span className={isZeroPrice ? 'text-destructive font-semibold' : 'font-medium'}>{formatCurrency(allowance.price)}</span>
                </span>
                <span>
                  <span className="text-muted-foreground">SL: </span>
                  <span className="font-medium">{qty}</span>
                </span>
                <span>
                  <span className="text-muted-foreground">Tổng: </span>
                  <span className="font-semibold">{formatCurrency(total)}</span>
                </span>
              </div>
            </div>
          </div>
        );
      })}
      <div className="flex justify-between px-2 py-2 bg-muted/50 rounded-lg font-semibold text-sm">
        <span>Tổng cộng ({totalQuantity} ngày):</span>
        <span>{formatCurrency(totalAmount)}</span>
      </div>
    </div>
  );
}
