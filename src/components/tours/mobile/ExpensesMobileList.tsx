import { Edit2, Copy, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency-utils';
import { NumberInputMobile } from '@/components/ui/number-input-mobile';
import { LineAttachmentsButton } from '@/components/tours/LineAttachmentsButton';
import { TourLineMobileCard, type TourLineMobileAction } from '@/components/tours/mobile/TourLineMobileCard';
import { MOBILE_FOOTER } from '@/lib/tab-styles';
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
    <div className="p-3 space-y-1.5">
      {items.map((expense) => {
        const waterExpense = isWaterExpense(expense);
        const rowGuests = getExpenseGuestCount(expense, tourGuests);
        const waterDays = getWaterExpenseDays(expense, tourGuests, tourDays);
        const total = getExpenseLineTotal(expense, tourGuests, tourDays);
        const isZeroPrice = expense.price === 0;
        const actions: TourLineMobileAction[] = [
          { label: 'Sửa', icon: <Edit2 className="mr-1 h-2.5 w-2.5 sm:mr-1.5 sm:h-3 sm:w-3" />, onClick: () => onEdit(expense.originalIndex) },
          { label: 'Nhân bản', icon: <Copy className="mr-1 h-2.5 w-2.5 sm:mr-1.5 sm:h-3 sm:w-3" />, onClick: () => onDuplicate(expense.originalIndex) },
          { label: 'Xóa', icon: <Trash2 className="mr-1 h-2.5 w-2.5 sm:mr-1.5 sm:h-3 sm:w-3" />, onClick: () => onDelete(expense.originalIndex), destructive: true },
        ];
        return (
          <TourLineMobileCard
            key={`${expense.originalIndex}-${expense.date}-row`}
            kind="expense"
            flagged={isZeroPrice}
            name={showName ? expense.name : `Dòng chi phí #${expense.originalIndex + 1}`}
            amount={showTotal ? formatCurrency(total) : null}
            actions={canUseActions ? actions : undefined}
            meta={
              <>
                {showDate && <span className="shrink-0">{formatDate(expense.date)}</span>}
                {showPrice && <span className="shrink-0">{showDate ? '· ' : ''}{formatCurrency(expense.price)}</span>}
                {showQuantity && (waterExpense ? (
                  <span className="flex shrink-0 items-center gap-1">
                    ×{rowGuests}
                    <NumberInputMobile value={waterDays} onChange={(val) => onWaterDaysChange(expense.originalIndex, val)} min={0} step={0.5} disabled={!canEditQuantity} className="w-8 text-sm sm:w-11 sm:text-base" size="sm" density="ultra" />
                    ng
                  </span>
                ) : (
                  <span className="flex shrink-0 items-center gap-1">
                    ×
                    <NumberInputMobile value={rowGuests} onChange={(val) => onGuestsChange(expense.originalIndex, val)} min={0} max={!tourGuests ? undefined : tourGuests} disabled={!canEditQuantity} className="w-8 text-sm sm:w-11 sm:text-base" size="sm" density="ultra" />
                  </span>
                ))}
                {showFiles && <LineAttachmentsButton attachments={expense.attachments} compact />}
              </>
            }
          />
        );
      })}
      <div className={MOBILE_FOOTER}>
        <span>Tổng cộng:</span>
        <span>{formatCurrency(totalAmount)}</span>
      </div>
    </div>
  );
}
