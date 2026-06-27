import { Edit2, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency-utils';
import { NumberInputMobile } from '@/components/ui/number-input-mobile';
import { LineAttachmentsButton } from '@/components/tours/LineAttachmentsButton';
import { TourLineMobileCard, type TourLineMobileAction } from '@/components/tours/mobile/TourLineMobileCard';
import { MOBILE_FOOTER } from '@/lib/tab-styles';
import type { Destination } from '@/types/tour';
import {
  canEditAnyTourLineField,
  canEditTourLineField,
  canViewTourLineField,
  type Access,
  type TourLineFieldKey,
} from '@/lib/tour-detail-permissions';

interface DestinationItem extends Destination { originalIndex: number }

interface DestinationGroup {
  groupName: string;
  items: DestinationItem[];
}

interface Props {
  groups: DestinationGroup[];
  duplicateDestinationNames: Set<string>;
  tourGuests: number;
  readOnly: boolean;
  lineFieldAccess?: Partial<Record<TourLineFieldKey, Access>>;
  onEdit: (idx: number) => void;
  onDelete: (idx: number) => void;
  onGuestsChange: (originalIndex: number, dest: DestinationItem, val: number | undefined) => void;
  totalAmount: number;
}

export function DestinationsMobileList({ groups, duplicateDestinationNames, tourGuests, readOnly, lineFieldAccess, onEdit, onDelete, onGuestsChange, totalAmount }: Props) {
  const showName = canViewTourLineField(lineFieldAccess, 'name');
  const showPrice = canViewTourLineField(lineFieldAccess, 'price');
  const showQuantity = canViewTourLineField(lineFieldAccess, 'quantity');
  const showDate = canViewTourLineField(lineFieldAccess, 'date');
  const showFiles = canViewTourLineField(lineFieldAccess, 'evidence');
  const showTotal = showPrice && showQuantity;
  const canEditQuantity = !readOnly && canEditTourLineField(lineFieldAccess, 'quantity');
  const canUseActions = !readOnly && canEditAnyTourLineField(lineFieldAccess);

  return (
    <div className="p-3 space-y-3">
      {groups.map(({ groupName, items }) => (
        <div key={groupName}>
          <div className="bg-muted/50 rounded-md px-3 py-1.5 text-sm font-semibold mb-2">
            Tỉnh: {groupName} ({items.length})
          </div>
          <div className="space-y-1.5 ml-1">
            {items.map((destination) => {
              const rowGuests = typeof destination.guests === 'number' ? destination.guests : 0;
              const total = destination.price * rowGuests;
              const nameKey = (destination.name || '').trim().toLowerCase();
              const isDupName = nameKey && duplicateDestinationNames.has(nameKey);
              const isZeroPrice = destination.price === 0;
              const actions: TourLineMobileAction[] = [
                { label: 'Sửa', icon: <Edit2 className="mr-1 h-2.5 w-2.5 sm:mr-1.5 sm:h-3 sm:w-3" />, onClick: () => onEdit(destination.originalIndex) },
                { label: 'Xóa', icon: <Trash2 className="mr-1 h-2.5 w-2.5 sm:mr-1.5 sm:h-3 sm:w-3" />, onClick: () => onDelete(destination.originalIndex), destructive: true },
              ];
              return (
                <TourLineMobileCard
                  key={`${groupName}-${destination.originalIndex}-${destination.date}`}
                  kind="destination"
                  flagged={!!isDupName || isZeroPrice}
                  name={showName ? destination.name : `Dòng điểm đến #${destination.originalIndex + 1}`}
                  amount={showTotal ? formatCurrency(total) : null}
                  actions={canUseActions ? actions : undefined}
                  meta={
                    <>
                      {showDate && <span className="shrink-0">{formatDate(destination.date)}</span>}
                      {showPrice && <span className="shrink-0">{showDate ? '· ' : ''}{formatCurrency(destination.price)}</span>}
                      {showQuantity && (
                        <span className="flex shrink-0 items-center gap-1">
                          ×
                          <NumberInputMobile value={destination.guests} onChange={(val) => onGuestsChange(destination.originalIndex, destination, val)} min={0} max={tourGuests} disabled={!canEditQuantity} className="w-8 text-sm sm:w-11 sm:text-base" size="sm" density="ultra" />
                        </span>
                      )}
                      {showFiles && <LineAttachmentsButton attachments={destination.attachments} compact />}
                    </>
                  }
                />
              );
            })}
          </div>
        </div>
      ))}
      <div className={MOBILE_FOOTER}>
        <span>Tổng cộng:</span>
        <span>{formatCurrency(totalAmount)}</span>
      </div>
    </div>
  );
}
