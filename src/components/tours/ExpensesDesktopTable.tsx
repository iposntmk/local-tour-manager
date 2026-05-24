import { Button } from '@/components/ui/button';
import { Edit2, Trash2, Copy, MoreHorizontal } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn, formatDate } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency-utils';
import { NumberInputMobile } from '@/components/ui/number-input-mobile';
import { TourRowLabel } from '@/components/tours/TourRowIcon';

interface ExpensesDesktopTableProps {
  displayExpenses: any[];
  readOnly: boolean;
  onEdit: (originalIndex: number) => void;
  onDuplicate: (originalIndex: number) => void;
  onDelete: (originalIndex: number) => void;
  onGuestsChange: (originalIndex: number, value: number | undefined) => void;
  totalAmount: number;
}

export function ExpensesDesktopTable({
  displayExpenses,
  readOnly,
  onEdit,
  onDuplicate,
  onDelete,
  onGuestsChange,
  totalAmount,
}: ExpensesDesktopTableProps) {
  return (
    <>
      <Table className="text-xs sm:text-sm">
        <TableHeader>
          <TableRow>
            <TableHead className="w-8 sm:w-[50px] p-1 sm:p-4">#</TableHead>
            <TableHead className="min-w-[80px] sm:min-w-[120px] p-1 sm:p-4">
              <span className="sm:hidden">CP</span>
              <span className="hidden sm:inline">Chi phí</span>
            </TableHead>
            <TableHead className="min-w-[60px] sm:min-w-[80px] p-1 sm:p-4">Giá</TableHead>
            <TableHead className="w-16 sm:w-[80px] p-1 sm:p-4">
              <span className="sm:hidden">Khách</span>
              <span className="hidden sm:inline">Tổng khách</span>
            </TableHead>
            <TableHead className="min-w-[60px] sm:min-w-[80px] p-1 sm:p-4">
              <span className="sm:hidden">Tổng</span>
              <span className="hidden sm:inline">Thành tiền</span>
            </TableHead>
            <TableHead className="min-w-[70px] sm:min-w-[90px] p-1 sm:p-4">Ngày</TableHead>
            <TableHead className="text-right w-8 sm:w-[50px] p-1 sm:p-4">
              <span className="sm:hidden">...</span>
              <span className="hidden sm:inline">Thao tác</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayExpenses.map((expense: any, rowIndex: number) => {
            const expenseGuests = typeof expense.guests === 'number' ? expense.guests : 0;
            const totalAmt = expense.price * expenseGuests;
            const isZeroPrice = (expense.price ?? 0) === 0;
            return (
              <TableRow
                key={`${expense.originalIndex}-${expense.date}-${expense.merged ? 'merged' : 'row'}`}
                className={cn('animate-fade-in', isZeroPrice && 'bg-red-50 dark:bg-red-950')}
              >
                <TableCell className="font-medium">{rowIndex + 1}</TableCell>
                <TableCell className="font-medium">
                  <TourRowLabel kind="expense" label={expense.name} />
                </TableCell>
                <TableCell className={expense.price === 0 ? 'text-destructive font-semibold' : ''}>
                  {formatCurrency(expense.price)}
                  {expense.price === 0 && <span className="ml-2 text-destructive" title="Giá bằng 0">⚑</span>}
                </TableCell>
                <TableCell>
                  <NumberInputMobile
                    value={expense.guests}
                    onChange={(val) => {
                      if (readOnly || expense.merged) return;
                      onGuestsChange(expense.originalIndex, val);
                    }}
                    min={0}
                    disabled={readOnly || !!expense.merged}
                    className="w-16 sm:w-24"
                  />
                </TableCell>
                <TableCell className="font-semibold">{formatCurrency(totalAmt)}</TableCell>
                <TableCell>{formatDate(expense.date)}</TableCell>
                <TableCell className="text-right">
                  {!readOnly && (
                    <div className="sm:hidden">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <span className="sr-only">Mở menu</span>
                            <MoreHorizontal className="h-4 w-4" />
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
                    </div>
                  )}
                  {!readOnly && (
                    <div className="hidden sm:flex sm:gap-2 sm:justify-end">
                      <Button variant="ghost" size="sm" onClick={() => onEdit(expense.originalIndex)} className="hover-scale" title="Sửa">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onDuplicate(expense.originalIndex)} className="hover-scale" title="Nhân bản">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onDelete(expense.originalIndex)} className="hover-scale text-destructive hover:text-destructive" title="Xóa">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <div className="mt-4 p-4 bg-muted/50 rounded-lg flex justify-end">
        <div className="text-lg font-semibold">Total: {formatCurrency(totalAmount)}</div>
      </div>
    </>
  );
}
