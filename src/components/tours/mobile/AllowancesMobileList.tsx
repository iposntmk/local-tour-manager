import { Edit2, Copy, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency-utils';
import { TourLineMobileCard, type TourLineMobileAction } from '@/components/tours/mobile/TourLineMobileCard';
import { MOBILE_FOOTER } from '@/lib/tab-styles';
import type { Allowance } from '@/types/tour';
import {
  canEditAnyTourLineField,
  canViewTourLineField,
  type Access,
  type TourLineFieldKey,
} from '@/lib/tour-detail-permissions';

interface AllowanceItem extends Allowance {
  originalIndex: number;
  showSeparator?: boolean;
}

interface Props {
  items: AllowanceItem[];
  readOnly: boolean;
  lineFieldAccess?: Partial<Record<TourLineFieldKey, Access>>;
  onEdit: (idx: number) => void;
  onCopy: (idx: number) => void;
  onDelete: (idx: number) => void;
  totalAmount: number;
  totalQuantity: number;
}

export function AllowancesMobileList({ items, readOnly, lineFieldAccess, onEdit, onCopy, onDelete, totalAmount, totalQuantity }: Props) {
  const showName = canViewTourLineField(lineFieldAccess, 'name');
  const showPrice = canViewTourLineField(lineFieldAccess, 'price');
  const showQuantity = canViewTourLineField(lineFieldAccess, 'quantity');
  const showDate = canViewTourLineField(lineFieldAccess, 'date');
  const showTotal = showPrice && showQuantity;
  const canUseActions = !readOnly && canEditAnyTourLineField(lineFieldAccess, ['name', 'price', 'date', 'quantity']);

  return (
    <div className="p-3 space-y-1.5">
      {items.map((allowance) => {
        const qty = allowance.quantity || 1;
        const total = allowance.price * qty;
        const isZeroPrice = allowance.price === 0;
        const actions: TourLineMobileAction[] = [
          { label: 'Nhân bản', icon: <Copy className="mr-1 h-2.5 w-2.5 sm:mr-1.5 sm:h-3 sm:w-3" />, onClick: () => onCopy(allowance.originalIndex) },
          { label: 'Sửa', icon: <Edit2 className="mr-1 h-2.5 w-2.5 sm:mr-1.5 sm:h-3 sm:w-3" />, onClick: () => onEdit(allowance.originalIndex) },
          { label: 'Xóa', icon: <Trash2 className="mr-1 h-2.5 w-2.5 sm:mr-1.5 sm:h-3 sm:w-3" />, onClick: () => onDelete(allowance.originalIndex), destructive: true },
        ];
        return (
          <div key={`${allowance.name}-${allowance.date}-${allowance.originalIndex}`}>
            {allowance.showSeparator && <div className="border-t-2 border-primary my-2" />}
            <TourLineMobileCard
              kind="allowance"
              flagged={isZeroPrice}
              name={showName ? allowance.name : `Dòng CTP #${allowance.originalIndex + 1}`}
              amount={showTotal ? formatCurrency(total) : null}
              actions={canUseActions ? actions : undefined}
              meta={
                <>
                  {showDate && <span className="shrink-0">{formatDate(allowance.date)}</span>}
                  {showPrice && <span className="shrink-0">{showDate ? '· ' : ''}{formatCurrency(allowance.price)}</span>}
                  {showQuantity && <span className="shrink-0">× {qty}n</span>}
                </>
              }
            />
          </div>
        );
      })}
      {(showQuantity || showTotal) && (
      <div className={MOBILE_FOOTER}>
        <span>Tổng cộng ({totalQuantity} ngày):</span>
        <span>{showTotal ? formatCurrency(totalAmount) : `${totalQuantity} ngày`}</span>
      </div>
      )}
    </div>
  );
}
