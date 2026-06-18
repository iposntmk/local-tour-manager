import { Edit2, Copy, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency-utils';
import { NumberInputMobile } from '@/components/ui/number-input-mobile';
import { LineAttachmentsButton } from '@/components/tours/LineAttachmentsButton';
import { TourLineMobileCard, type TourLineMobileAction } from '@/components/tours/mobile/TourLineMobileCard';
import type { Meal } from '@/types/tour';
import {
  canEditAnyTourLineField,
  canEditTourLineField,
  canViewTourLineField,
  type Access,
  type TourLineFieldKey,
} from '@/lib/tour-detail-permissions';

interface MealItem extends Meal { originalIndex: number }

interface Props {
  items: MealItem[];
  tourGuests: number;
  readOnly: boolean;
  lineFieldAccess?: Partial<Record<TourLineFieldKey, Access>>;
  onEdit: (idx: number) => void;
  onDuplicate: (idx: number) => void;
  onDelete: (idx: number) => void;
  onGuestsChange: (originalIndex: number, val: number | undefined) => void;
  totalAmount: number;
}

export function MealsMobileList({ items, tourGuests, readOnly, lineFieldAccess, onEdit, onDuplicate, onDelete, onGuestsChange, totalAmount }: Props) {
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
      {items.map((meal) => {
        const rowGuests = typeof meal.guests === 'number' ? meal.guests : 0;
        const total = meal.price * rowGuests;
        const isZeroPrice = meal.price === 0;
        const actions: TourLineMobileAction[] = [
          { label: 'Sửa', icon: <Edit2 className="mr-2 h-4 w-4" />, onClick: () => onEdit(meal.originalIndex) },
          { label: 'Nhân bản', icon: <Copy className="mr-2 h-4 w-4" />, onClick: () => onDuplicate(meal.originalIndex) },
          { label: 'Xóa', icon: <Trash2 className="mr-2 h-4 w-4" />, onClick: () => onDelete(meal.originalIndex), destructive: true },
        ];
        return (
          <TourLineMobileCard
            key={`${meal.originalIndex}-${meal.date}`}
            kind="meal"
            flagged={isZeroPrice}
            name={showName ? meal.name : `Dòng bữa ăn #${meal.originalIndex + 1}`}
            amount={showTotal ? formatCurrency(total) : null}
            actions={canUseActions ? actions : undefined}
            meta={
              <>
                {showDate && <span className="shrink-0">{formatDate(meal.date)}</span>}
                {showPrice && <span className="shrink-0">{showDate ? '· ' : ''}{formatCurrency(meal.price)}</span>}
                {showQuantity && (
                  <span className="flex shrink-0 items-center gap-1">
                    ×
                    <NumberInputMobile value={meal.guests} onChange={(val) => onGuestsChange(meal.originalIndex, val)} min={0} max={tourGuests} disabled={!canEditQuantity} className="w-12 h-6 text-xs" />
                  </span>
                )}
                {showFiles && <LineAttachmentsButton attachments={meal.attachments} />}
              </>
            }
          />
        );
      })}
      <div className="flex justify-between px-2 py-2 bg-muted/50 rounded-lg font-semibold text-sm">
        <span>Tổng cộng:</span>
        <span>{formatCurrency(totalAmount)}</span>
      </div>
    </div>
  );
}
