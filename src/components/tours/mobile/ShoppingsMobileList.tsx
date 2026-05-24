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
import type { CommissionPayment, PaymentMethod, Shopping } from '@/types/tour';

const paymentMethodLabels: Record<PaymentMethod, string> = { cash: 'Tiền mặt', bank_transfer: 'Chuyển khoản' };
const getNetCommission = (s: Shopping) => s.netCommission ?? Math.max(0, s.price - (s.pitAmount || 0));
const getPaidTotal = (s: Shopping) => (s.payments || []).reduce((sum, p) => sum + p.amount, 0);
const getPaymentRemaining = (s: Shopping) => Math.max(0, getNetCommission(s) - getPaidTotal(s));
const isFullyReceived = (s: Shopping) => getPaymentRemaining(s) <= 0 && (s.payments || []).length > 0;
const getStatus = (s: Shopping) => {
  const p = s.payments || [];
  if (p.length === 0) return 'pending';
  return getPaidTotal(s) >= getNetCommission(s) ? 'paid' : 'partial';
};
const getStatusLabel = (s: Shopping) => {
  const st = s.commissionStatus || getStatus(s);
  return st === 'paid' ? 'Đã nhận đủ' : st === 'partial' ? 'Một phần' : 'Chưa nhận';
};
const getBadgeVariant = (s: Shopping): 'default' | 'secondary' | 'outline' => {
  const st = s.commissionStatus || getStatus(s);
  return st === 'paid' ? 'default' : st === 'partial' ? 'secondary' : 'outline';
};
const getCardClass = (s: Shopping) => {
  if ((s.price ?? 0) === 0) return 'border-red-200 bg-red-50 dark:bg-red-950/30';
  const st = s.commissionStatus || getStatus(s);
  if (st === 'paid') return 'border-emerald-200 bg-emerald-50/80 dark:bg-emerald-950/30';
  if (st === 'partial') return 'border-amber-300 bg-amber-100 dark:bg-amber-900/40';
  return 'border-red-300 bg-red-100 dark:bg-red-800/50';
};

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
    return <div className="p-8 text-center text-muted-foreground text-sm">Chưa có mục mua sắm nào</div>;
  }

  return (
    <div className="p-3 space-y-2">
      {shoppings.map((shopping, index) => {
        const remaining = getPaymentRemaining(shopping);
        const isExpanded = expandedIndex === index;
        const cashKey = shopping.id || `index-${index}`;
        const isCash = !!quickCashByKey[cashKey];
        const isZeroPrice = (shopping.price ?? 0) === 0;
        return (
          <div key={`card-${index}`} className={`rounded-lg border p-2.5 space-y-1.5 ${getCardClass(shopping)}`}>
            {/* Row 1: icon + name + date + "..." dropdown */}
            <div className="flex items-center gap-1.5 min-w-0">
              <TourRowIcon kind="shopping" label={shopping.name} className="shrink-0" />
              <span className="flex-1 min-w-0 truncate text-sm font-medium">{shopping.name}</span>
              {isZeroPrice && <span className="shrink-0 text-destructive text-xs">⚑</span>}
              <span className="shrink-0 text-xs text-muted-foreground pl-1">{formatDate(shopping.date)}</span>
              {!readOnly && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(index)}>
                      <Edit2 className="mr-2 h-4 w-4" />Sửa
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete(index)} className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />Xóa
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            {/* Row 2: commission values */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs pl-9">
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
            <div className="flex items-center justify-between gap-2 flex-wrap pl-9">
              <Button type="button" variant="ghost" className="h-auto gap-1.5 px-0 py-0.5" onClick={() => setExpandedIndex(isExpanded ? null : index)}>
                <Badge variant={getBadgeVariant(shopping)}>{getStatusLabel(shopping)}</Badge>
                <WalletCards className="h-3.5 w-3.5" />
              </Button>
              {remaining > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950/60 dark:text-red-300">
                      <Flag className="h-3 w-3" />Thiếu {formatCurrency(remaining)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Còn lại: {formatCurrency(remaining)}</TooltipContent>
                </Tooltip>
              )}
              {!readOnly && (
                <div className="flex items-center gap-3 ml-auto">
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <Checkbox checked={isCash} disabled={remaining <= 0} onCheckedChange={(c) => setQuickCashByKey(prev => ({ ...prev, [cashKey]: c === true }))} />
                    TM
                  </label>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
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
              <div className="border-t pt-2 space-y-2">
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>Đã nhận: <span className="font-semibold">{formatCurrency(getPaidTotal(shopping))}</span></div>
                  <div>Còn lại: <span className="font-semibold">{formatCurrency(remaining)}</span></div>
                  <div>Kỳ vọng: <span className="font-semibold">{formatCurrency(getNetCommission(shopping))}</span></div>
                </div>
                {(shopping.payments || []).length === 0 ? (
                  <div className="text-xs text-muted-foreground">Chưa có khoản nhận nào</div>
                ) : (
                  (shopping.payments || []).map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
                      <div className="text-xs">
                        <div className="font-medium">{formatCurrency(payment.amount)} · {paymentMethodLabels[payment.paymentMethod]}</div>
                        <div className="text-muted-foreground">{formatDate(payment.paidAt)}{payment.note ? ` · ${payment.note}` : ''}</div>
                      </div>
                      {!readOnly && payment.id && (
                        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => onDeletePayment(payment.id!)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      )}
                    </div>
                  ))
                )}
                {!readOnly && (
                  <div className="space-y-2 rounded-md border bg-background p-2">
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
                    <div className="flex gap-2">
                      <Button type="button" size="sm" className="flex-1" onClick={() => onAddPayment(shopping, paymentForm.amount, { paymentMethod: paymentForm.paymentMethod, paidAt: paymentForm.paidAt, note: paymentForm.note })} disabled={isPendingAdd || remaining <= 0}>
                        <Plus className="h-3.5 w-3.5 mr-1" />Thêm
                      </Button>
                      <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => onAddPayment(shopping, remaining, { paymentMethod: paymentForm.paymentMethod, paidAt: paymentForm.paidAt, note: 'Nhận đủ' })} disabled={isPendingAdd || remaining <= 0}>
                        <Check className="h-3.5 w-3.5 mr-1" />Nhận đủ
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      <div className="border-t px-2 py-2 bg-muted/50 space-y-1 text-sm font-semibold rounded-lg">
        <div className="flex justify-between"><span>Tổng giá trị mua sắm:</span><span>{formatCurrency(totalAmount)}</span></div>
        <div className="flex justify-between text-primary"><span>Tổng tiền tip:</span><span>{formatCurrency(totalTip)}</span></div>
      </div>
    </div>
  );
}
