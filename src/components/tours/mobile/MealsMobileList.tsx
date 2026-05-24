import { Edit2, Copy, Trash2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDate } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency-utils';
import { NumberInputMobile } from '@/components/ui/number-input-mobile';
import { TourRowIcon } from '@/components/tours/TourRowIcon';
import type { Meal } from '@/types/tour';

interface MealItem extends Meal { originalIndex: number }

interface Props {
  items: MealItem[];
  tourGuests: number;
  readOnly: boolean;
  onEdit: (idx: number) => void;
  onDuplicate: (idx: number) => void;
  onDelete: (idx: number) => void;
  onGuestsChange: (originalIndex: number, val: number | undefined) => void;
  totalAmount: number;
}

export function MealsMobileList({ items, tourGuests, readOnly, onEdit, onDuplicate, onDelete, onGuestsChange, totalAmount }: Props) {
  return (
    <div className="p-3 space-y-2">
      {items.map((meal) => {
        const rowGuests = typeof meal.guests === 'number' ? meal.guests : 0;
        const total = meal.price * rowGuests;
        const isZeroPrice = meal.price === 0;
        return (
          <div
            key={`${meal.originalIndex}-${meal.date}`}
            className={`rounded-lg border p-2.5 space-y-1.5 ${isZeroPrice ? 'bg-red-50 dark:bg-red-950' : 'bg-card'}`}
          >
            {/* Row 1: icon + name + date + actions */}
            <div className="flex items-center gap-1.5 min-w-0">
              <TourRowIcon kind="meal" label={meal.name} className="shrink-0" />
              <span className="flex-1 min-w-0 truncate text-sm font-medium">{meal.name}</span>
              {isZeroPrice && <span className="shrink-0 text-destructive text-xs">⚑</span>}
              <span className="shrink-0 text-xs text-muted-foreground pl-1">{formatDate(meal.date)}</span>
              {!readOnly && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(meal.originalIndex)}>
                      <Edit2 className="mr-2 h-4 w-4" />Sửa
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDuplicate(meal.originalIndex)}>
                      <Copy className="mr-2 h-4 w-4" />Nhân bản
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete(meal.originalIndex)} className="text-destructive">
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
                <span className={isZeroPrice ? 'text-destructive font-semibold' : 'font-medium'}>{formatCurrency(meal.price)}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="text-muted-foreground">Khách: </span>
                <NumberInputMobile value={meal.guests} onChange={(val) => onGuestsChange(meal.originalIndex, val)} min={0} max={tourGuests} disabled={readOnly} className="w-14 h-6 text-xs" />
              </span>
              <span>
                <span className="text-muted-foreground">Tổng: </span>
                <span className="font-semibold">{formatCurrency(total)}</span>
              </span>
            </div>
          </div>
        );
      })}
      <div className="flex justify-between px-2 py-2 bg-muted/50 rounded-lg font-semibold text-sm">
        <span>Tổng cộng:</span>
        <span>{formatCurrency(totalAmount)}</span>
      </div>
    </div>
  );
}
