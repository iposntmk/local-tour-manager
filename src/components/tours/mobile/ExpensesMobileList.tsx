import { Edit2, Copy, Trash2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDate } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency-utils';
import { t } from '@/lib/i18n';
import { NumberInputMobile } from '@/components/ui/number-input-mobile';
import { TourRowIcon } from '@/components/tours/TourRowIcon';
import { LineAttachmentsButton } from '@/components/tours/LineAttachmentsButton';
import {
  getExpenseGuestCount,
  getExpenseLineTotal,
  getWaterExpenseDays,
  isWaterExpense,
} from '@/lib/water-expense-utils';
import type { Expense } from '@/types/tour';
import {
  canEditAnyTourLineField,
  canEditTourLineField,
  canViewTourLineField,
  type Access,
  type TourLineFieldKey,
} from '@/lib/tour-detail-permissions';

interface ExpenseItem extends Expense {
  originalIndex: number;
}

interface Props {
  items: ExpenseItem[];
  readOnly: boolean;
  lineFieldAccess?: Partial<Record<TourLineFieldKey, Access>>;
  onEdit: (idx: number) => void;
  onDuplicate: (idx: number) => void;
  onDelete: (idx: number) => void;
  onGuestsChange: (originalIndex: number, val: number | undefined) => void;
  onWaterDaysChange: (originalIndex: number, val: number | undefined) => void;
  totalAmount: number;
  tourGuests: number;
  tourDays: number;
}

export function ExpensesMobileList({
  items,
  readOnly,
  lineFieldAccess,
  onEdit,
  onDuplicate,
  onDelete,
  onGuestsChange,
  onWaterDaysChange,
  totalAmount,
  tourGuests,
  tourDays,
}: Props) {
  const showName = canViewTourLineField(lineFieldAccess, 'name');
  const showPrice = canViewTourLineField(lineFieldAccess, 'price');
  const showQuantity = canViewTourLineField(lineFieldAccess, 'quantity');
  const showDate = canViewTourLineField(lineFieldAccess, 'date');
  const showFiles = canViewTourLineField(lineFieldAccess, 'evidence');
  const showTotal = showPrice && showQuantity;
  const canEditQuantity = !readOnly && canEditTourLineField(lineFieldAccess, 'quantity');
  const canUseActions = !readOnly && canEditAnyTourLineField(lineFieldAccess);

  return (
    <div className="p-3 space-y-2">
      {items.map((expense) => {
        const waterExpense = isWaterExpense(expense);
        const rowGuests = getExpenseGuestCount(expense, tourGuests);
        const waterDays = getWaterExpenseDays(expense, tourGuests, tourDays);
        const total = getExpenseLineTotal(expense, tourGuests, tourDays);
        const isZeroPrice = expense.price === 0;
        return (
          <div
            key={`${expense.originalIndex}-${expense.date}-row`}
            className={`rounded-lg border p-2.5 space-y-1.5 ${isZeroPrice ? 'bg-red-50 dark:bg-red-950' : 'bg-card'}`}
          >
            {/* Row 1: icon + name + date + actions */}
            <div className="flex items-center gap-1.5 min-w-0">
              {showName && (
              <>
              <TourRowIcon kind="expense" label={expense.name} className="shrink-0" />
              <span className="flex-1 min-w-0 truncate text-sm font-medium">{expense.name}</span>
              {isZeroPrice && <span className="shrink-0 text-destructive text-xs">⚑</span>}
              </>
              )}
              {!showName && <span className="flex-1 text-sm font-medium">Dòng chi phí #{expense.originalIndex + 1}</span>}
              {showDate && (
              <span className="shrink-0 text-xs text-muted-foreground pl-1">{formatDate(expense.date)}</span>
              )}
              {canUseActions && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(expense.originalIndex)}>
                      <Edit2 className="mr-2 h-4 w-4" />Sửa
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDuplicate(expense.originalIndex)}>
                      <Copy className="mr-2 h-4 w-4" />Nhân bản
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete(expense.originalIndex)} className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />Xóa
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            {/* Row 2: values */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs pl-9">
              {showPrice && (
              <span>
                <span className="text-muted-foreground">Giá: </span>
                <span className={isZeroPrice ? 'text-destructive font-semibold' : 'font-medium'}>{formatCurrency(expense.price)}</span>
              </span>
              )}
              {showQuantity && (
              <span className="flex items-center gap-1">
                <span className="text-muted-foreground">Khách: </span>
                <NumberInputMobile value={rowGuests} onChange={(val) => onGuestsChange(expense.originalIndex, val)} min={0} max={waterExpense || !tourGuests ? undefined : tourGuests} disabled={!canEditQuantity || waterExpense} className="w-14 h-6 text-xs" />
              </span>
              )}
              {showQuantity && waterExpense && (
              <span className="flex items-center gap-1">
                <span className="text-muted-foreground">Ngày: </span>
                <NumberInputMobile value={waterDays} onChange={(val) => onWaterDaysChange(expense.originalIndex, val)} min={0} step={0.5} disabled={!canEditQuantity} className="w-14 h-6 text-xs" />
              </span>
              )}
              {showTotal && (
              <span>
                <span className="text-muted-foreground">Tổng: </span>
                <span className="font-semibold">{formatCurrency(total)}</span>
              </span>
              )}
              {showFiles && (
              <span className="flex items-center gap-1">
                <span className="text-muted-foreground">{t('tourEvidence.files')}: </span>
                <LineAttachmentsButton attachments={expense.attachments} />
              </span>
              )}
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
