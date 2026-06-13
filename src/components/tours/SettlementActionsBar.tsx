import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
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
import { Textarea } from '@/components/ui/textarea';
import { Send, CheckCircle2, RotateCcw, Unlock, History, Wallet } from 'lucide-react';
import { store } from '@/lib/datastore';
import { useAuth } from '@/contexts/AuthContext';
import { toVietnameseError } from '@/lib/error-messages';
import type { Tour } from '@/types/tour';
import { areAllSettlementLinesApproved } from '@/lib/tour-line-utils';
import { canReviewTour, canSubmitTour, validateSettlementReady } from '@/lib/settlement-utils';
import { canRecordPayment, isTourPaymentEligible } from '@/lib/payment-utils';
import { getTourCacheSnapshot, patchTourSettlementStatusInCache, restoreTourCacheSnapshot } from '@/lib/tour-cache-updates';
import { SettlementStatusBadge } from './SettlementStatusBadge';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import { RecordPaymentDialog } from './RecordPaymentDialog';

interface SettlementActionsBarProps {
  tour: Tour;
  onChanged?: () => void;
  onShowHistory?: () => void;
}

type ActionKind = 'submit' | 'return' | 'approve' | 'reopen' | null;

export function SettlementActionsBar({ tour, onChanged, onShowHistory }: SettlementActionsBarProps) {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<ActionKind>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const closeDialog = () => {
    setPending(null);
    setNote('');
  };

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['tour', tour.id] }),
      queryClient.invalidateQueries({ queryKey: ['tours'] }),
      queryClient.invalidateQueries({ queryKey: ['settlement-pending-count'] }),
    ]);
    onChanged?.();
  };

  const handleSubmit = async () => {
    const validation = validateSettlementReady(tour);
    if (!validation.ok) {
      toast.error('Chưa đủ điều kiện gửi', { description: validation.errors.join('\n') });
      return;
    }
    setBusy(true);
    const snapshot = getTourCacheSnapshot(queryClient, tour.id);
    patchTourSettlementStatusInCache(queryClient, tour.id, 'submitted');
    try {
      await store.submitTourSettlement(tour.id, note || undefined);
      toast.success('Đã gửi kế toán kiểm tra.');
      await refresh();
      closeDialog();
    } catch (e) {
      restoreTourCacheSnapshot(queryClient, tour.id, snapshot);
      toast.error(toVietnameseError(e, 'Không thể gửi hồ sơ.'));
    } finally {
      setBusy(false);
    }
  };

  const handleReturn = async () => {
    setBusy(true);
    const snapshot = getTourCacheSnapshot(queryClient, tour.id);
    patchTourSettlementStatusInCache(queryClient, tour.id, 'need_changes');
    try {
      await store.returnTourSettlement(tour.id, note || undefined);
      toast.success('Đã trả hồ sơ về HDV.');
      await refresh();
      closeDialog();
    } catch (e) {
      restoreTourCacheSnapshot(queryClient, tour.id, snapshot);
      toast.error(toVietnameseError(e, 'Không thể trả hồ sơ.'));
    } finally {
      setBusy(false);
    }
  };

  const handleApprove = async () => {
    if (!areAllSettlementLinesApproved(tour)) {
      toast.error('Chỉ chốt khi tất cả dòng đã được duyệt.');
      return;
    }
    setBusy(true);
    const snapshot = getTourCacheSnapshot(queryClient, tour.id);
    patchTourSettlementStatusInCache(queryClient, tour.id, 'approved');
    try {
      await store.approveTourSettlement(tour.id, note || undefined);
      toast.success('Đã duyệt hồ sơ. Hồ sơ đã được khóa.');
      await refresh();
      closeDialog();
    } catch (e) {
      restoreTourCacheSnapshot(queryClient, tour.id, snapshot);
      toast.error(toVietnameseError(e, 'Không thể duyệt hồ sơ.'));
    } finally {
      setBusy(false);
    }
  };

  const handleReopen = async () => {
    setBusy(true);
    const snapshot = getTourCacheSnapshot(queryClient, tour.id);
    patchTourSettlementStatusInCache(queryClient, tour.id, 'draft');
    try {
      await store.reopenTourSettlement(tour.id, note || undefined);
      toast.success('Đã mở khóa hồ sơ.');
      await refresh();
      closeDialog();
    } catch (e) {
      restoreTourCacheSnapshot(queryClient, tour.id, snapshot);
      toast.error(toVietnameseError(e, 'Không thể mở khóa hồ sơ.'));
    } finally {
      setBusy(false);
    }
  };

  const showSubmit = hasPermission('submit_settlement') && canSubmitTour(tour);
  const showReview = hasPermission('approve_settlement') && canReviewTour(tour);
  const showReopen = hasPermission('reopen_settlement') && (tour.settlementStatus === 'approved' || tour.settlementStatus === 'closed');
  const showPaymentBadge = isTourPaymentEligible(tour);
  const showPaymentCTA = canRecordPayment(tour, hasPermission('mark_tour_paid'));
  const allLinesApproved = areAllSettlementLinesApproved(tour);

  const dialogConfig: Record<Exclude<ActionKind, null>, { title: string; description: string; confirmLabel: string; handler: () => Promise<void> }> = {
    submit: {
      title: 'Gửi kế toán kiểm tra?',
      description: 'Hồ sơ sẽ chuyển sang trạng thái "Đã gửi". Có thể thêm ghi chú cho kế toán.',
      confirmLabel: 'Gửi',
      handler: handleSubmit,
    },
    return: {
      title: 'Trả hồ sơ về HDV?',
      description: 'HDV sẽ thấy hồ sơ ở trạng thái "Cần bổ sung". Nên ghi chú lý do trả lại.',
      confirmLabel: 'Trả lại',
      handler: handleReturn,
    },
    approve: {
      title: 'Duyệt hồ sơ này?',
      description: 'Hồ sơ chỉ được khóa khi tất cả dòng trong tab Tổng hợp đã được duyệt.',
      confirmLabel: 'Duyệt',
      handler: handleApprove,
    },
    reopen: {
      title: 'Mở khóa hồ sơ đã duyệt?',
      description: 'Hồ sơ sẽ trở về trạng thái "Đang soạn". Hành động này được ghi vào lịch sử.',
      confirmLabel: 'Mở khóa',
      handler: handleReopen,
    },
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <SettlementStatusBadge status={tour.settlementStatus} />
      {showPaymentBadge && (
        <PaymentStatusBadge status={tour.paymentStatus} method={tour.lastPaymentMethod} />
      )}
      {tour.submissionCount > 0 && (
        <span className="text-xs text-muted-foreground">
          Đã gửi {tour.submissionCount} lần
        </span>
      )}
      <div className="flex-1" />
      {onShowHistory && (
        <Button variant="outline" size="sm" onClick={onShowHistory}>
          <History className="h-4 w-4 mr-1" />
          Lịch sử
        </Button>
      )}
      {showSubmit && (
        <Button size="sm" onClick={() => setPending('submit')}>
          <Send className="h-4 w-4 mr-1" />
          {tour.settlementStatus === 'need_changes' ? 'Gửi lại kế toán' : 'Gửi kế toán'}
        </Button>
      )}
      {showReview && (
        <>
          <Button variant="outline" size="sm" onClick={() => setPending('return')}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Trả về HDV
          </Button>
          <Button size="sm" onClick={() => setPending('approve')} disabled={!allLinesApproved}>
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Duyệt
          </Button>
        </>
      )}
      {showPaymentCTA && (
        <Button size="sm" variant="outline" onClick={() => setPaymentDialogOpen(true)} className="border-2 border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-400 dark:bg-blue-950/20 dark:text-blue-300 dark:hover:bg-blue-900/30 font-medium shadow-sm">
          <Wallet className="h-4 w-4 mr-1" />
          Ghi nhận thanh toán
        </Button>
      )}
      {showReopen && (
        <Button variant="outline" size="sm" onClick={() => setPending('reopen')}>
          <Unlock className="h-4 w-4 mr-1" />
          Mở khóa
        </Button>
      )}

      <RecordPaymentDialog
        tour={tour}
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        onSaved={onChanged}
      />

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && closeDialog()}>
        <AlertDialogContent>
          {pending && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{dialogConfig[pending].title}</AlertDialogTitle>
                <AlertDialogDescription>{dialogConfig[pending].description}</AlertDialogDescription>
              </AlertDialogHeader>
              <Textarea
                placeholder="Ghi chú (tùy chọn)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
              <AlertDialogFooter>
                <AlertDialogCancel disabled={busy}>Hủy</AlertDialogCancel>
                <AlertDialogAction onClick={dialogConfig[pending].handler} disabled={busy}>
                  {busy ? 'Đang xử lý...' : dialogConfig[pending].confirmLabel}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
