import { Edit2, Copy, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency-utils';
import { NumberInputMobile } from '@/components/ui/number-input-mobile';
import { LineAttachmentsButton } from '@/components/tours/LineAttachmentsButton';
import { TourLineMobileCard, type TourLineMobileAction } from '@/components/tours/mobile/TourLineMobileCard';
import { MOBILE_FOOTER } from '@/lib/tab-styles';
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
          { label: 'Sửa', icon: <Edit2 className="mr-1 h-2.5 w-2.5 sm:mr-1.5 sm:h-3 sm:w-3" />, onClick: () => onEdit(meal.originalIndex) },
          { label: 'Nhân bản', icon: <Copy className="mr-1 h-2.5 w-2.5 sm:mr-1.5 sm:h-3 sm:w-3" />, onClick: () => onDuplicate(meal.originalIndex) },
          { label: 'Xóa', icon: <Trash2 className="mr-1 h-2.5 w-2.5 sm:mr-1.5 sm:h-3 sm:w-3" />, onClick: () => onDelete(meal.originalIndex), destructive: true },
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
                    <NumberInputMobile value={meal.guests} onChange={(val) => onGuestsChange(meal.originalIndex, val)} min={0} max={tourGuests} disabled={!canEditQuantity} className="w-8 text-sm sm:w-11 sm:text-base" size="sm" density="ultra" />
                  </span>
                )}
                {showFiles && <LineAttachmentsButton attachments={meal.attachments} compact />}
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
