import { Button } from '@/components/ui/button';
import { Edit2, Trash2, Copy, MoreHorizontal } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { cn, formatDate } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency-utils';
import { t } from '@/lib/i18n';
import { NumberInputMobile } from '@/components/ui/number-input-mobile';
import { TourRowLabel } from '@/components/tours/TourRowIcon';
import { LineAttachmentsButton } from '@/components/tours/LineAttachmentsButton';
import { STD_TABLE_FONT, STD_ROW_FLAGGED, STD_ROW_ANIM } from '@/lib/tab-styles';
import type { Meal } from '@/types/tour';
import {
  canEditAnyTourLineField,
  canEditTourLineField,
  canViewTourLineField,
  type Access,
  type TourLineFieldKey,
} from '@/lib/tour-detail-permissions';

interface MealRow extends Meal { originalIndex: number }

interface MealsDesktopTableProps {
  sortedMeals: MealRow[];
  tourGuests: number;
  readOnly: boolean;
  lineFieldAccess?: Partial<Record<TourLineFieldKey, Access>>;
  totalAmount: number;
  onEdit: (index: number) => void;
  onDuplicate: (index: number) => void;
  onDelete: (index: number) => void;
  onGuestsChange: (originalIndex: number, val: number | undefined) => void;
  tourId?: string;
}

export function MealsDesktopTable({
  sortedMeals, tourGuests, readOnly, lineFieldAccess, totalAmount,
  onEdit, onDuplicate, onDelete, onGuestsChange,
}: MealsDesktopTableProps) {
  const showName = canViewTourLineField(lineFieldAccess, 'name');
  const showPrice = canViewTourLineField(lineFieldAccess, 'price');
  const showQuantity = canViewTourLineField(lineFieldAccess, 'quantity');
  const showDate = canViewTourLineField(lineFieldAccess, 'date');
  const showFiles = canViewTourLineField(lineFieldAccess, 'evidence');
  const showTotal = showPrice && showQuantity;
  const canEditQuantity = !readOnly && canEditTourLineField(lineFieldAccess, 'quantity');
  const canUseActions = !readOnly && canEditAnyTourLineField(lineFieldAccess);

  return (
    <div className="hidden md:block overflow-x-auto">
      <Table className={STD_TABLE_FONT}>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8 sm:w-[50px] p-1 sm:p-4">#</TableHead>
            {showName && (
            <TableHead className="min-w-[80px] sm:min-w-[120px] p-1 sm:p-4">
              <span className="sm:hidden">Bữa</span>
              <span className="hidden sm:inline">Bữa ăn</span>
            </TableHead>
            )}
            {showPrice && (
            <TableHead className="min-w-[60px] sm:min-w-[80px] p-1 sm:p-4">Giá</TableHead>
            )}
            {showQuantity && (
            <TableHead className="w-16 sm:w-[80px] p-1 sm:p-4">
              <span className="sm:hidden">Khách</span>
              <span className="hidden sm:inline">Tổng khách</span>
            </TableHead>
            )}
            {showTotal && (
            <TableHead className="min-w-[60px] sm:min-w-[80px] p-1 sm:p-4">
              <span className="sm:hidden">Tổng</span>
              <span className="hidden sm:inline">Thành tiền</span>
            </TableHead>
            )}
            {showDate && (
            <TableHead className="min-w-[70px] sm:min-w-[90px] p-1 sm:p-4">Ngày</TableHead>
            )}
            {showFiles && (
            <TableHead className="min-w-[70px] sm:min-w-[90px] p-1 sm:p-4">{t('tourEvidence.files')}</TableHead>
            )}
            {canUseActions && (
            <TableHead className="text-right w-8 sm:w-[50px] p-1 sm:p-4">
              <span className="sm:hidden">...</span>
              <span className="hidden sm:inline">Thao tác</span>
            </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedMeals.map((meal, rowIndex) => {
            const rowGuests = typeof meal.guests === 'number' ? meal.guests : 0;
            const totalRowAmount = meal.price * rowGuests;
            const isZeroPrice = (meal.price ?? 0) === 0;
            return (
              <TableRow key={`${meal.originalIndex}-${meal.date}`}
                className={cn(STD_ROW_ANIM, isZeroPrice && STD_ROW_FLAGGED)}>
                <TableCell className="font-medium p-1 sm:p-4">{rowIndex + 1}</TableCell>
                {showName && (
                <TableCell className="font-medium p-1 sm:p-4">
                  <TourRowLabel kind="meal" label={meal.name} />
                </TableCell>
                )}
                {showPrice && (
                <TableCell className={cn('p-1 sm:p-4', meal.price === 0 && 'text-destructive font-semibold')}>
                  {formatCurrency(meal.price)}
                  {meal.price === 0 && <span className="ml-1 sm:ml-2 text-destructive" title="Giá bằng 0">⚑</span>}
                </TableCell>
                )}
                {showQuantity && (
                <TableCell className="p-1 sm:p-4">
                  <NumberInputMobile
                    value={meal.guests} onChange={(val) => {
                      if (!canEditQuantity) return;
                      let v = val;
                      if (v !== undefined && tourGuests && v > tourGuests) {
                        toast.warning(`Số khách không được vượt quá tổng khách của tour (${tourGuests}).`);
                        v = tourGuests;
                      }
                      onGuestsChange(meal.originalIndex, v);
                    }}
                    min={0} max={tourGuests} disabled={!canEditQuantity} className="w-12 sm:w-24" size="sm" />
                </TableCell>
                )}
                {showTotal && (
                <TableCell className="font-semibold p-1 sm:p-4">{formatCurrency(totalRowAmount)}</TableCell>
                )}
                {showDate && (
                <TableCell className="p-1 sm:p-4">{formatDate(meal.date)}</TableCell>
                )}
                {showFiles && (
                <TableCell className="p-1 sm:p-4">
                  <LineAttachmentsButton attachments={meal.attachments} />
                </TableCell>
                )}
                {canUseActions && (
                <TableCell className="text-right p-1 sm:p-4">
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
                    </div>
                  )}
                  {canUseActions && (
                    <div className="hidden sm:flex sm:gap-2 sm:justify-end">
                      <Button variant="ghost" size="sm" onClick={() => onEdit(meal.originalIndex)}
                        className="hover-scale" title="Sửa"><Edit2 className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => onDuplicate(meal.originalIndex)}
                        className="hover-scale" title="Nhân bản"><Copy className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => onDelete(meal.originalIndex)}
                        className="hover-scale text-destructive hover:text-destructive" title="Xóa">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <div className="mt-4 p-4 bg-muted/50 rounded-lg flex justify-end">
        <div className="text-lg font-semibold">Tổng cộng: {formatCurrency(totalAmount)}</div>
      </div>
    </div>
  );
}
