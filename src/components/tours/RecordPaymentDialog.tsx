import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { CurrencyInput } from '@/components/ui/currency-input';
import { DateInput } from '@/components/ui/date-input';
import { store } from '@/lib/datastore';
import { computePaymentRemaining, formatPaymentMethod, getTourFinalTotal } from '@/lib/payment-utils';
import { formatCurrency } from '@/lib/currency-utils';
import type { PaymentMethod, Tour, TourPayment } from '@/types/tour';

interface RecordPaymentDialogProps {
  tour: Tour;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment?: TourPayment;
  onSaved?: () => void;
}

function toDateInput(value?: string): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  // Accept either YYYY-MM-DD or ISO timestamp
  return value.slice(0, 10);
}

function toIsoTimestamp(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();
  // Append a midday time so timezone shifts won't move it to the previous day
  return new Date(`${dateStr}T12:00:00`).toISOString();
}

export function RecordPaymentDialog({
  tour,
  open,
  onOpenChange,
  payment,
  onSaved,
}: RecordPaymentDialogProps) {
  const queryClient = useQueryClient();
  const isEdit = !!payment;
  const remaining = computePaymentRemaining(tour);
  const finalTotal = getTourFinalTotal(tour);
  // Amount needed to mark this payment as "fully covering the tour".
  // When editing, the row being edited is already counted in paymentTotal,
  // so add it back so "tích đủ" sets this row to whatever brings the tour to paid.
  const fullAmount = Math.max(0, isEdit && payment ? remaining + payment.amount : remaining);
  const canFillFull = fullAmount > 0;

  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [paidAt, setPaidAt] = useState<string>(toDateInput());
  const [note, setNote] = useState<string>('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (payment) {
      setAmount(payment.amount);
      setMethod(payment.method);
      setPaidAt(toDateInput(payment.paidAt));
      setNote(payment.note ?? '');
    } else {
      setAmount(remaining);
      setMethod('cash');
      setPaidAt(toDateInput());
      setNote('');
    }
  }, [open, payment, remaining]);

  const handleSave = async () => {
    if (!amount || amount <= 0) {
      toast.error('Số tiền phải lớn hơn 0.');
      return;
    }
    if (finalTotal > 0 && amount > finalTotal) {
      toast.error(`Số tiền không được vượt quá tổng tour (${formatCurrency(finalTotal)}).`);
      return;
    }
    setBusy(true);
    try {
      if (isEdit && payment) {
        await store.updateTourPayment(payment.id, {
          amount,
          method,
          paidAt: toIsoTimestamp(paidAt),
          note: note || undefined,
        });
        toast.success('Đã cập nhật khoản thanh toán.');
      } else {
        await store.addTourPayment(tour.id, {
          amount,
          method,
          paidAt: toIsoTimestamp(paidAt),
          note: note || undefined,
        });
        toast.success('Đã ghi nhận thanh toán.');
      }
      await queryClient.invalidateQueries({ queryKey: ['tour', tour.id] });
      await queryClient.invalidateQueries({ queryKey: ['tours'] });
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || 'Không thể lưu khoản thanh toán.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Sửa khoản thanh toán' : 'Ghi nhận thanh toán'}</DialogTitle>
          <DialogDescription>
            Tổng tour: {formatCurrency(finalTotal)} · Đã trả: {formatCurrency(tour.paymentTotal)} · Còn lại: {formatCurrency(remaining)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="payment-amount">Số tiền</Label>
              {canFillFull && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => setAmount(fullAmount)}
                >
                  Tích đủ ({formatCurrency(fullAmount)})
                </Button>
              )}
            </div>
            <CurrencyInput
              id="payment-amount"
              value={amount}
              onChange={setAmount}
              showQuickAmounts={false}
            />
            {finalTotal > 0 && (
              <p className="text-xs text-muted-foreground">
                Tối đa {formatCurrency(finalTotal)} (theo tổng tour).
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Hình thức</Label>
            <RadioGroup
              value={method}
              onValueChange={(v) => setMethod(v as PaymentMethod)}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem id="pay-cash" value="cash" />
                <Label htmlFor="pay-cash" className="font-normal">
                  {formatPaymentMethod('cash')}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem id="pay-transfer" value="bank_transfer" />
                <Label htmlFor="pay-transfer" className="font-normal">
                  {formatPaymentMethod('bank_transfer')}
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-1.5">
            <Label>Ngày thanh toán</Label>
            <DateInput value={paidAt} onChange={setPaidAt} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="payment-note">Ghi chú</Label>
            <Textarea
              id="payment-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Tùy chọn"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={busy}>
            {busy ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Ghi nhận'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
