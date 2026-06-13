import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CanMarkPayment } from '@/components/auth/PermissionGuard';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import { RecordPaymentDialog } from './RecordPaymentDialog';
import { useAuth } from '@/contexts/AuthContext';
import { store } from '@/lib/datastore';
import { toVietnameseError } from '@/lib/error-messages';
import {
  canRecordPayment,
  computePaymentRemaining,
  formatPaymentMethod,
  getTourFinalTotal,
  isTourPaymentEligible,
} from '@/lib/payment-utils';
import { formatCurrency } from '@/lib/currency-utils';
import { formatDateDisplay } from '@/lib/date-utils';
import type { Tour, TourPayment } from '@/types/tour';

interface TourPaymentsPanelProps {
  tour: Tour;
}

export function TourPaymentsPanel({ tour }: TourPaymentsPanelProps) {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TourPayment | undefined>(undefined);
  const [deleting, setDeleting] = useState<TourPayment | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  const payments = tour.payments ?? [];
  const remaining = computePaymentRemaining(tour);
  const total = getTourFinalTotal(tour);
  const eligible = isTourPaymentEligible(tour);
  const canMark = hasPermission('mark_tour_paid');
  const canAdd = canRecordPayment(tour, canMark);

  const openCreate = () => {
    setEditing(undefined);
    setDialogOpen(true);
  };

  const openEdit = (payment: TourPayment) => {
    setEditing(payment);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await store.deleteTourPayment(deleting.id);
      toast.success('Đã xóa khoản thanh toán.');
      await queryClient.invalidateQueries({ queryKey: ['tour', tour.id] });
      await queryClient.invalidateQueries({ queryKey: ['tours'] });
      setDeleting(undefined);
    } catch (e) {
      toast.error(toVietnameseError(e, 'Không thể xóa khoản thanh toán.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Wallet className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-base font-semibold">Thanh toán cho HDV</h3>
        <PaymentStatusBadge status={tour.paymentStatus} method={tour.lastPaymentMethod} />
        <div className="flex-1" />
        {canAdd && (
          <Button size="sm" onClick={openCreate} className="shadow ring-2 ring-offset-2 ring-primary/40">
            <Plus className="h-4 w-4 mr-1" />
            Ghi nhận thanh toán
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
        <div className="rounded-md bg-muted/40 p-2">
          <div className="text-xs text-muted-foreground">Tổng tour</div>
          <div className="font-semibold">{formatCurrency(total)}</div>
        </div>
        <div className="rounded-md bg-muted/40 p-2">
          <div className="text-xs text-muted-foreground">Đã thanh toán</div>
          <div className="font-semibold">{formatCurrency(tour.paymentTotal)}</div>
        </div>
        <div className="rounded-md bg-muted/40 p-2">
          <div className="text-xs text-muted-foreground">Còn lại</div>
          <div className="font-semibold">{formatCurrency(remaining)}</div>
        </div>
      </div>

      {!eligible && (
        <p className="text-xs text-muted-foreground">
          Hồ sơ quyết toán phải được duyệt trước khi ghi nhận thanh toán.
        </p>
      )}

      {payments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có khoản thanh toán nào.</p>
      ) : (
        <div className="divide-y rounded-md border">
          {payments.map((payment) => (
            <div
              key={payment.id}
              className="flex items-center gap-3 p-2 sm:p-3 text-sm flex-wrap"
            >
              <div className="flex-1 min-w-[160px]">
                <div className="font-medium">{formatCurrency(payment.amount)}</div>
                <div className="text-xs text-muted-foreground">
                  {formatDateDisplay(payment.paidAt)} · {formatPaymentMethod(payment.method)}
                </div>
                {payment.note && (
                  <div className="text-xs text-muted-foreground mt-0.5">{payment.note}</div>
                )}
              </div>
              <CanMarkPayment>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEdit(payment)}
                    disabled={!eligible}
                    aria-label="Sửa"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeleting(payment)}
                    disabled={!eligible}
                    aria-label="Xóa"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CanMarkPayment>
            </div>
          ))}
        </div>
      )}

      <RecordPaymentDialog
        tour={tour}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        payment={editing}
      />

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa khoản thanh toán?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này sẽ trừ {deleting ? formatCurrency(deleting.amount) : ''} khỏi tổng đã trả của tour và không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={busy}>
              {busy ? 'Đang xóa...' : 'Xóa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
