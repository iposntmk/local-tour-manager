import { useState } from 'react';
import { Edit2, Trash2, MoreHorizontal, Plus, Check, WalletCards, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CurrencyInput } from '@/components/ui/currency-input';
import { formatDate } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency-utils';
import { TourRowIcon } from '@/components/tours/TourRowIcon';
import {
  MOBILE_SHOP_FOOTER,
} from '@/lib/tab-styles';
import type { CommissionPayment, PaymentMethod, Shopping } from '@/types/tour';
import {
  getCommissionBadgeVariant,
  getCommissionCardClass,
  getCommissionStatusLabel,
  getNetCommission,
  getPaidTotal,
  getPaymentRemaining,
  isFullyReceived,
} from '@/lib/shopping-commission-utils';

const paymentMethodLabels: Record<PaymentMethod, string> = { cash: 'Tiền mặt', bank_transfer: 'Chuyển khoản' };

interface Props {
  shoppings: Shopping[];
  readOnly: boolean;
  isPendingAdd: boolean;
  isPendingClear: boolean;
  onEdit: (idx: number) => void;
  onDelete: (idx: number) => void;
  onAddPayment: (shopping: Shopping, amount: number, patch?: Partial<Omit<CommissionPayment, 'id' | 'tourShoppingId'>>) => void;
  onDeletePayment: (id: string) => void;
  onClearPayments: (shopping: Shopping) => boolean;
  totalAmount: number;
  totalTip: number;
}

export function ShoppingsMobileList({ shoppings, readOnly, isPendingAdd, isPendingClear, onEdit, onDelete, onAddPayment, onDeletePayment, onClearPayments, totalAmount, totalTip }: Props) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [quickCashByKey, setQuickCashByKey] = useState<Record<string, boolean>>({});
  const [paymentForm, setPaymentForm] = useState<Omit<CommissionPayment, 'id' | 'tourShoppingId'>>({
    amount: 0, paymentMethod: 'cash', paidAt: new Date().toISOString().split('T')[0], note: '',
  });

  if (shoppings.length === 0) {
    return <div className="p-8 text-center text-muted-foreground text-xs">Chưa có mục mua sắm nào</div>;
  }

  return (
    <div className="p-2 space-y-1.5 sm:p-3 sm:space-y-2">
      {shoppings.map((shopping, index) => {
        const remaining = getPaymentRemaining(shopping);
        const isExpanded = expandedIndex === index;
        const cashKey = shopping.id || `index-${index}`;
        const isCash = !!quickCashByKey[cashKey];
        const isZeroPrice = (shopping.price ?? 0) === 0;
        return (
          <div key={`card-${index}`} className={`rounded-lg border bg-card px-1.5 py-1 space-y-1 sm:px-2.5 sm:py-1.5 sm:space-y-1.5 ${getCommissionCardClass(shopping)}`}>
            {/* Row 1: icon + name + date + "..." dropdown */}
            <div className="flex items-center gap-1 min-w-0 sm:gap-1.5">
              <TourRowIcon kind="shopping" label={shopping.name} className="shrink-0 h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="flex-1 min-w-0 truncate text-xs font-medium leading-snug sm:text-sm">{shopping.name}</span>
              {isZeroPrice && <span className="shrink-0 text-destructive text-xs sm:text-sm">⚑</span>}
              <span className="shrink-0 text-xs text-muted-foreground pl-0.5 sm:pl-1 sm:text-sm">{formatDate(shopping.date)}</span>
              {!readOnly && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-4 w-4 p-0 shrink-0 sm:h-5 sm:w-5">
                      <MoreHorizontal className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(index)}>
                      <Edit2 className="mr-1 h-2.5 w-2.5 sm:mr-1.5 sm:h-3 sm:w-3" />Sửa
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete(index)} className="text-destructive">
                      <Trash2 className="mr-1 h-2.5 w-2.5 sm:mr-1.5 sm:h-3 sm:w-3" />Xóa
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            {/* Row 2: commission values */}
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-px text-xs pl-4 sm:gap-x-3 sm:gap-y-0.5 sm:text-sm sm:pl-9">
              <span>
                <span className="text-muted-foreground">Hoa hồng: </span>
                <span className={isZeroPrice ? 'text-destructive font-semibold' : 'font-medium'}>{formatCurrency(shopping.price)}</span>
              </span>
              <span>
                <span className="text-muted-foreground">Thuế: </span>
                <span>{shopping.withholdsPit ? formatCurrency(shopping.pitAmount || 0) : '-'}</span>
              </span>
              <span>
                <span className="text-muted-foreground">Thực nhận: </span>
                <span className="font-semibold">{formatCurrency(getNetCommission(shopping))}</span>
              </span>
            </div>
            {/* Row 3: status + quick actions */}
            <div className="flex items-center justify-between gap-1 flex-wrap pl-4 sm:gap-1.5 sm:pl-9">
              <Button type="button" variant="ghost" className="h-auto gap-0.5 px-0 py-px sm:gap-1 sm:py-0.5" onClick={() => setExpandedIndex(isExpanded ? null : index)}>
                <Badge variant={getCommissionBadgeVariant(shopping)} className="text-[10px] px-1 py-px sm:text-xs sm:px-1.5">{getCommissionStatusLabel(shopping)}</Badge>
                <WalletCards className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              </Button>
              {remaining > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-px rounded-full bg-red-100 px-1 py-px text-xs font-medium text-red-700 sm:gap-0.5 sm:px-1.5 sm:text-sm dark:bg-red-950/60 dark:text-red-300">
                      <Flag className="h-2 w-2 sm:h-2.5 sm:w-2.5" />Thiếu {formatCurrency(remaining)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Còn lại: {formatCurrency(remaining)}</TooltipContent>
                </Tooltip>
              )}
              {!readOnly && (
                <div className="flex items-center gap-1.5 ml-auto">
                  <label className="flex items-center gap-0.5 text-xs cursor-pointer sm:gap-1 sm:text-sm">
                    <Checkbox checked={isCash} disabled={remaining <= 0} onCheckedChange={(c) => setQuickCashByKey(prev => ({ ...prev, [cashKey]: c === true }))} />
                    TM
                  </label>
                  <label className="flex items-center gap-0.5 text-xs cursor-pointer sm:gap-1 sm:text-sm">
                    <Checkbox checked={isFullyReceived(shopping)} disabled={isPendingAdd || isPendingClear}
                      onCheckedChange={(c) => {
                        if (c === true) onAddPayment(shopping, remaining, { paymentMethod: isCash ? 'cash' : 'bank_transfer', paidAt: new Date().toISOString().split('T')[0], note: 'Nhận đủ' });
                        else onClearPayments(shopping);
                      }} />
                    Nhận đủ
                  </label>
                </div>
              )}
            </div>
            {/* Expanded payment panel */}
            {isExpanded && (
              <div className="border-t pt-1 space-y-1 sm:pt-1.5 sm:space-y-1.5">
                <div className="grid grid-cols-3 gap-0.5 text-xs sm:gap-1.5 sm:text-sm">
                  <div>Đã nhận: <span className="font-semibold">{formatCurrency(getPaidTotal(shopping))}</span></div>
                  <div>Còn lại: <span className="font-semibold">{formatCurrency(remaining)}</span></div>
                  <div>Kỳ vọng: <span className="font-semibold">{formatCurrency(getNetCommission(shopping))}</span></div>
                </div>
                {(shopping.payments || []).length === 0 ? (
                  <div className="text-xs text-muted-foreground sm:text-sm">Chưa có khoản nhận nào</div>
                ) : (
                  (shopping.payments || []).map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between rounded-md border bg-background px-1.5 py-1 sm:px-2.5 sm:py-1.5">
                      <div className="text-xs sm:text-sm">
                        <div className="font-medium">{formatCurrency(payment.amount)} · {paymentMethodLabels[payment.paymentMethod]}</div>
                        <div className="text-muted-foreground">{formatDate(payment.paidAt)}{payment.note ? ` · ${payment.note}` : ''}</div>
                      </div>
                      {!readOnly && payment.id && (
                        <Button type="button" variant="ghost" size="sm" className="h-5 w-5 p-0 text-destructive hover:text-destructive sm:h-6 sm:w-6" onClick={() => onDeletePayment(payment.id!)}><Trash2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" /></Button>
                      )}
                    </div>
                  ))
                )}
                {!readOnly && (
                  <div className="space-y-1.5 rounded-md border bg-background p-1.5 sm:p-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Số tiền</Label>
                        <CurrencyInput value={paymentForm.amount} max={remaining} showQuickAmounts={false} onChange={(v) => setPaymentForm(p => ({ ...p, amount: v }))} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Hình thức</Label>
                        <Select value={paymentForm.paymentMethod} onValueChange={(v: PaymentMethod) => setPaymentForm(p => ({ ...p, paymentMethod: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Tiền mặt</SelectItem>
                            <SelectItem value="bank_transfer">Chuyển khoản</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Ngày nhận</Label>
                        <Input type="date" value={paymentForm.paidAt} onChange={(e) => setPaymentForm(p => ({ ...p, paidAt: e.target.value }))} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Ghi chú</Label>
                        <Input value={paymentForm.note || ''} onChange={(e) => setPaymentForm(p => ({ ...p, note: e.target.value }))} placeholder="Ghi chú" />
                      </div>
                    </div>
                    <div className="flex gap-1 sm:gap-1.5">
                      <Button type="button" size="sm" className="flex-1 h-5 text-xs sm:h-6 sm:text-sm" onClick={() => onAddPayment(shopping, paymentForm.amount, { paymentMethod: paymentForm.paymentMethod, paidAt: paymentForm.paidAt, note: paymentForm.note })} disabled={isPendingAdd || remaining <= 0}>
                        <Plus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />Thêm
                      </Button>
                      <Button type="button" variant="outline" size="sm" className="flex-1 h-5 text-xs sm:h-6 sm:text-sm" onClick={() => onAddPayment(shopping, remaining, { paymentMethod: paymentForm.paymentMethod, paidAt: paymentForm.paidAt, note: 'Nhận đủ' })} disabled={isPendingAdd || remaining <= 0}>
                        <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3" />Nhận đủ
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      <div className={MOBILE_SHOP_FOOTER}>
        <div className="flex justify-between"><span>Tổng giá trị mua sắm:</span><span>{formatCurrency(totalAmount)}</span></div>
        <div className="flex justify-between text-primary"><span>Tổng tiền tip:</span><span>{formatCurrency(totalTip)}</span></div>
      </div>
    </div>
  );
}
