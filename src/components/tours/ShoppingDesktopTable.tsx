import { Fragment } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit2, Trash2, MoreHorizontal, WalletCards, Flag, Plus, Check } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { CurrencyInput } from '@/components/ui/currency-input';
import { formatDate } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency-utils';
import { TourRowLabel } from '@/components/tours/TourRowIcon';
import type { CommissionPayment, PaymentMethod, Shopping } from '@/types/tour';
import {
  getNetCommission,
  getPaidTotal,
  getPaymentRemaining,
  isFullyReceived,
  getCommissionStatusLabel,
  getCommissionBadgeVariant,
  getCommissionRowClass,
} from '@/lib/shopping-commission-utils';

const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: 'Tiền mặt',
  bank_transfer: 'Chuyển khoản',
};

interface ShoppingDesktopTableProps {
  shoppings: Shopping[];
  readOnly: boolean;
  expandedPaymentIndex: number | null;
  onSetExpandedPaymentIndex: (index: number | null) => void;
  quickCashByShopping: Record<string, boolean>;
  onSetQuickCashByShopping: (updater: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
  paymentForm: Omit<CommissionPayment, 'id' | 'tourShoppingId'>;
  onPaymentFormChange: (form: Omit<CommissionPayment, 'id' | 'tourShoppingId'>) => void;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  onAddPayment: (shopping: Shopping, amount: number, patch?: Partial<Omit<CommissionPayment, 'id' | 'tourShoppingId'>>) => void;
  onDeletePayment: (id: string) => void;
  onClearPayments: (shopping: Shopping) => boolean;
  onQuickReceiveFull: (shopping: Shopping, index: number) => void;
  isPendingAdd: boolean;
  isPendingClear: boolean;
  totalAmount: number;
  totalTip: number;
}

export function ShoppingDesktopTable({
  shoppings,
  readOnly,
  expandedPaymentIndex,
  onSetExpandedPaymentIndex,
  quickCashByShopping,
  onSetQuickCashByShopping,
  paymentForm,
  onPaymentFormChange,
  onEdit,
  onDelete,
  onAddPayment,
  onDeletePayment,
  onClearPayments,
  onQuickReceiveFull,
  isPendingAdd,
  isPendingClear,
  totalAmount,
  totalTip,
}: ShoppingDesktopTableProps) {
  return (
    <>
      <Table className="min-w-[1080px]">
        <TableHeader>
          <TableRow>
            <TableHead><span className="sm:hidden">Mục</span><span className="hidden sm:inline">Mục mua sắm</span></TableHead>
            <TableHead>Giá</TableHead>
            <TableHead>Thuế</TableHead>
            <TableHead>Thực nhận</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Cảnh báo</TableHead>
            <TableHead title="Tiền mặt / Chuyển khoản">Tiền mặt/CK</TableHead>
            <TableHead>Nhận đủ</TableHead>
            <TableHead>Ngày</TableHead>
            <TableHead className="w-[80px] sm:w-[100px]">
              <span className="sm:hidden">Tác</span><span className="hidden sm:inline">Thao tác</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shoppings.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="text-center text-muted-foreground">Chưa có mục mua sắm nào</TableCell>
            </TableRow>
          ) : (
            shoppings.map((shopping, index) => (
              <Fragment key={`shopping-${index}`}>
                <TableRow className={getCommissionRowClass(shopping)}>
                  <TableCell className="font-medium"><TourRowLabel kind="shopping" label={shopping.name} /></TableCell>
                  <TableCell className={shopping.price === 0 ? 'text-destructive font-semibold' : ''}>
                    {formatCurrency(shopping.price)}
                    {shopping.price === 0 && <span className="ml-2 text-destructive" title="Giá bằng 0">⚑</span>}
                  </TableCell>
                  <TableCell>{shopping.withholdsPit ? formatCurrency(shopping.pitAmount || 0) : '-'}</TableCell>
                  <TableCell>{formatCurrency(getNetCommission(shopping))}</TableCell>
                  <TableCell>
                    <Button type="button" variant="ghost" className="h-auto gap-2 px-2 py-1"
                      onClick={() => onSetExpandedPaymentIndex(expandedPaymentIndex === index ? null : index)}>
                      <Badge variant={getCommissionBadgeVariant(shopping)}>{getCommissionStatusLabel(shopping)}</Badge>
                      <WalletCards className="h-4 w-4" />
                    </Button>
                  </TableCell>
                  <TableCell>
                    {getPaymentRemaining(shopping) > 0 ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-950/60 dark:text-red-300">
                            <Flag className="h-3.5 w-3.5" />Thiếu
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>Thiếu thanh toán hoa hồng: còn lại {formatCurrency(getPaymentRemaining(shopping))}</TooltipContent>
                      </Tooltip>
                    ) : <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell>
                    {!readOnly && (
                      <Checkbox
                        checked={!!quickCashByShopping[shopping.id || `index-${index}`]}
                        disabled={getPaymentRemaining(shopping) <= 0}
                        onCheckedChange={(v) => {
                          const key = shopping.id || `index-${index}`;
                          onSetQuickCashByShopping((prev) => ({ ...prev, [key]: v === true }));
                        }}
                        aria-label="Chọn tiền mặt cho nhận nhanh"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {!readOnly && (
                      <Checkbox
                        checked={isFullyReceived(shopping)}
                        disabled={isPendingAdd || isPendingClear}
                        onCheckedChange={(v) => {
                          if (v === true) {
                            onQuickReceiveFull(shopping, index);
                          } else {
                            onClearPayments(shopping);
                          }
                        }}
                        aria-label="Nhận đủ hoa hồng"
                      />
                    )}
                  </TableCell>
                  <TableCell>{formatDate(shopping.date)}</TableCell>
                  <TableCell className="text-right">
                    {!readOnly && (
                      <div className="sm:hidden">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <span className="sr-only">Mở menu</span><MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(index)}><Edit2 className="mr-2 h-4 w-4" />Sửa</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDelete(index)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Xóa</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                    {!readOnly && (
                      <div className="hidden sm:flex sm:gap-2 sm:justify-end">
                        <Button variant="ghost" size="sm" onClick={() => onEdit(index)} className="hover-scale" title="Sửa"><Edit2 className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => onDelete(index)} className="hover-scale text-destructive hover:text-destructive" title="Xóa"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
                {expandedPaymentIndex === index && (
                  <TableRow key={`payments-${index}`}>
                    <TableCell colSpan={10} className="bg-muted/30">
                      <div className="space-y-3 py-2">
                        <div className="grid gap-2 text-sm sm:grid-cols-3">
                          <div>Tổng đã nhận: <span className="font-semibold">{formatCurrency(getPaidTotal(shopping))}</span></div>
                          <div>Còn lại: <span className="font-semibold">{formatCurrency(getPaymentRemaining(shopping))}</span></div>
                          <div>Kỳ vọng: <span className="font-semibold">{formatCurrency(getNetCommission(shopping))}</span></div>
                        </div>
                        <div className="space-y-2">
                          {(shopping.payments || []).length === 0 ? (
                            <div className="text-sm text-muted-foreground">Chưa có khoản nhận nào</div>
                          ) : (
                            (shopping.payments || []).map((payment) => (
                              <div key={payment.id} className="flex flex-col gap-2 rounded-md border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="text-sm">
                                  <div className="font-medium">{formatCurrency(payment.amount)} · {paymentMethodLabels[payment.paymentMethod]}</div>
                                  <div className="text-muted-foreground">{formatDate(payment.paidAt)}{payment.note ? ` · ${payment.note}` : ''}</div>
                                </div>
                                {!readOnly && payment.id && (
                                  <Button type="button" variant="ghost" size="sm" className="self-start text-destructive hover:text-destructive sm:self-auto" onClick={() => onDeletePayment(payment.id!)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                        {!readOnly && (
                          <div className="grid gap-3 rounded-md border bg-background p-3 sm:grid-cols-[minmax(160px,1fr)_160px_160px_minmax(160px,1fr)_auto_auto]">
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Số tiền</Label>
                              <CurrencyInput value={paymentForm.amount} max={getPaymentRemaining(shopping)} showQuickAmounts={false} onChange={(v) => onPaymentFormChange({ ...paymentForm, amount: v })} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Hình thức</Label>
                              <Select value={paymentForm.paymentMethod} onValueChange={(v: PaymentMethod) => onPaymentFormChange({ ...paymentForm, paymentMethod: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="cash">Tiền mặt</SelectItem>
                                  <SelectItem value="bank_transfer">Chuyển khoản</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Ngày nhận</Label>
                              <Input type="date" value={paymentForm.paidAt} onChange={(e) => onPaymentFormChange({ ...paymentForm, paidAt: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Ghi chú</Label>
                              <Input value={paymentForm.note || ''} onChange={(e) => onPaymentFormChange({ ...paymentForm, note: e.target.value })} placeholder="Ghi chú" />
                            </div>
                            <Button type="button" className="self-end whitespace-nowrap" onClick={() => onAddPayment(shopping, paymentForm.amount)} disabled={isPendingAdd || getPaymentRemaining(shopping) <= 0}>
                              <Plus className="h-4 w-4 mr-2" />Thêm
                            </Button>
                            <Button type="button" variant="outline" className="self-end whitespace-nowrap" onClick={() => onAddPayment(shopping, getPaymentRemaining(shopping))} disabled={isPendingAdd || getPaymentRemaining(shopping) <= 0}>
                              <Check className="h-4 w-4 mr-2" />Nhận đủ
                            </Button>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))
          )}
        </TableBody>
      </Table>
      {shoppings.length > 0 && (
        <div className="border-t p-4 bg-muted/50 space-y-2">
          <div className="flex justify-between items-center font-semibold">
            <span>Tổng giá trị mua sắm:</span>
            <span className="text-lg">{formatCurrency(totalAmount)}</span>
          </div>
          <div className="flex justify-between items-center font-semibold text-primary">
            <span>Tổng tiền tip:</span>
            <span className="text-lg">{formatCurrency(totalTip)}</span>
          </div>
        </div>
      )}
    </>
  );
}
