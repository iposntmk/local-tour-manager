import { Fragment } from 'react';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2, MoreHorizontal } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn, formatDate } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency-utils';
import { t } from '@/lib/i18n';
import { NumberInputMobile } from '@/components/ui/number-input-mobile';
import { TourRowLabel } from '@/components/tours/TourRowIcon';
import { LineAttachmentsButton } from '@/components/tours/LineAttachmentsButton';
import { toast } from 'sonner';
import {
  canEditAnyTourLineField,
  canEditTourLineField,
  canViewTourLineField,
  type Access,
  type TourLineFieldKey,
} from '@/lib/tour-detail-permissions';

interface DestinationsDesktopTableProps {
  groups: Array<{ groupName: string; items: any[] }>;
  duplicateDestinationNames: Set<string>;
  tourGuests: number;
  readOnly: boolean;
  lineFieldAccess?: Partial<Record<TourLineFieldKey, Access>>;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  onGuestsChange: (originalIndex: number, destination: any, value: number | undefined) => void;
  totalAmount: number;
}

export function DestinationsDesktopTable({
  groups,
  duplicateDestinationNames,
  tourGuests,
  readOnly,
  lineFieldAccess,
  onEdit,
  onDelete,
  onGuestsChange,
  totalAmount,
}: DestinationsDesktopTableProps) {
  const showName = canViewTourLineField(lineFieldAccess, 'name');
  const showPrice = canViewTourLineField(lineFieldAccess, 'price');
  const showQuantity = canViewTourLineField(lineFieldAccess, 'quantity');
  const showDate = canViewTourLineField(lineFieldAccess, 'date');
  const showFiles = canViewTourLineField(lineFieldAccess, 'evidence');
  const showTotal = showPrice && showQuantity;
  const canEditQuantity = !readOnly && canEditTourLineField(lineFieldAccess, 'quantity');
  const canUseActions = !readOnly && canEditAnyTourLineField(lineFieldAccess);
  const columnCount = [true, showName, showPrice, showQuantity, showTotal, showDate, showFiles, canUseActions].filter(Boolean).length;

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">#</TableHead>
            {showName && (
            <TableHead>
              <span className="sm:hidden">Đến</span>
              <span className="hidden sm:inline">Điểm đến</span>
            </TableHead>
            )}
            {showPrice && (
            <TableHead>Giá</TableHead>
            )}
            {showQuantity && (
            <TableHead className="w-[80px]">
              <span className="sm:hidden">Khách</span>
              <span className="hidden sm:inline">Tổng khách</span>
            </TableHead>
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
            {showFiles && (
            <TableHead>{t('tourEvidence.files')}</TableHead>
            )}
            {canUseActions && (
            <TableHead className="text-right w-[50px]">
              <span className="sm:hidden">...</span>
              <span className="hidden sm:inline">Thao tác</span>
            </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map(({ groupName, items: groupItems }) => (
            <Fragment key={`group-${groupName}`}>
              <TableRow className="bg-muted/50">
                <TableCell colSpan={columnCount} className="font-semibold">
                  Tỉnh: {groupName} ({groupItems.length})
                </TableCell>
              </TableRow>
              {groupItems.map((destination: any, idx: number) => {
                const rowGuests = typeof destination.guests === 'number' ? destination.guests : 0;
                const totalAmt = destination.price * rowGuests;
                const nameKey = (destination.name || '').trim().toLowerCase();
                const isDupName = nameKey && duplicateDestinationNames.has(nameKey);
                const isZeroPrice = (destination.price ?? 0) === 0;
                return (
                  <TableRow
                    key={`${groupName}-${destination.originalIndex}-${destination.date}`}
                    className={cn('animate-fade-in', (isDupName || isZeroPrice) && 'bg-red-50 dark:bg-red-950')}
                  >
                    <TableCell className="font-medium">{idx + 1}</TableCell>
                    {showName && (
                    <TableCell className="font-medium">
                      <TourRowLabel kind="destination" label={destination.name} />
                      {isDupName && <span className="ml-2 text-destructive" title="Tên điểm đến trùng">⚑</span>}
                    </TableCell>
                    )}
                    {showPrice && (
                    <TableCell className={destination.price === 0 ? 'text-destructive font-semibold' : ''}>
                      {formatCurrency(destination.price)}
                      {destination.price === 0 && <span className="ml-2 text-destructive" title="Giá bằng 0">⚑</span>}
                    </TableCell>
                    )}
                    {showQuantity && (
                    <TableCell>
                      <NumberInputMobile
                        value={destination.guests}
                        onChange={(val) => {
                          if (!canEditQuantity) return;
                          let v = val;
                          if (v !== undefined && tourGuests && v > tourGuests) {
                            toast.warning(`Số khách không được vượt quá tổng khách của tour (${tourGuests}).`);
                            v = tourGuests;
                          }
                          onGuestsChange(destination.originalIndex, destination, v);
                        }}
                        min={0}
                        max={tourGuests}
                        disabled={!canEditQuantity}
                        className="w-16 sm:w-24"
                      />
                    </TableCell>
                    )}
                    {showTotal && (
                    <TableCell className="font-semibold">{formatCurrency(totalAmt)}</TableCell>
                    )}
                    {showDate && (
                    <TableCell>{formatDate(destination.date)}</TableCell>
                    )}
                    {showFiles && (
                    <TableCell>
                      <LineAttachmentsButton attachments={destination.attachments} />
                    </TableCell>
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
                              <DropdownMenuItem onClick={() => onEdit(destination.originalIndex)}>
                                <Edit2 className="mr-2 h-4 w-4" />Sửa
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onDelete(destination.originalIndex)} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />Xóa
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                      {canUseActions && (
                        <div className="hidden sm:flex sm:gap-2 sm:justify-end">
                          <Button variant="ghost" size="sm" onClick={() => onEdit(destination.originalIndex)} className="hover-scale" title="Sửa">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => onDelete(destination.originalIndex)} className="hover-scale text-destructive hover:text-destructive" title="Xóa">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </Fragment>
          ))}
        </TableBody>
      </Table>
      <div className="mt-4 p-4 bg-muted/50 rounded-lg flex justify-end">
        <div className="text-lg font-semibold">Tổng cộng: {formatCurrency(totalAmount)}</div>
      </div>
    </>
  );
}
