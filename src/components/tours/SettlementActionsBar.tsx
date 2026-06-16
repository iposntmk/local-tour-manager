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
import { Send, CheckCircle2, RotateCcw, Unlock, History, Banknote } from 'lucide-react';
import { store } from '@/lib/datastore';
import { useAuth } from '@/contexts/AuthContext';
import { toVietnameseError } from '@/lib/error-messages';
import type { Tour } from '@/types/tour';
import { areAllSettlementLinesApproved } from '@/lib/tour-line-utils';
import { canReviewTour, canSubmitTour, validateSettlementReady } from '@/lib/settlement-utils';
import { canRecordPayment } from '@/lib/payment-utils';
import { invalidateTourAggregateCaches } from '@/lib/query-cache';
import {
  patchTourSettlementStatusInCache,
  restoreTourAggregateCaches,
  snapshotTourAggregateCaches,
} from '@/lib/tour-cache-updates';
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

  const refresh = () => {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ['tour', tour.id], refetchType: 'none' }),
      invalidateTourAggregateCaches(queryClient, 'none'),
      queryClient.invalidateQueries({ queryKey: ['settlement-pending-count'], refetchType: 'none' }),
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
    const snapshot = await snapshotTourAggregateCaches(queryClient, tour.id);
    patchTourSettlementStatusInCache(queryClient, tour.id, 'submitted');
    try {
      await store.submitTourSettlement(tour.id, note || undefined);
      toast.success('Đã gửi kế toán kiểm tra.');
      refresh();
      closeDialog();
    } catch (e) {
      restoreTourAggregateCaches(queryClient, tour.id, snapshot);
      toast.error(toVietnameseError(e, 'Không thể gửi hồ sơ.'));
    } finally {
      setBusy(false);
    }
  };

  const handleReturn = async () => {
    setBusy(true);
    const snapshot = await snapshotTourAggregateCaches(queryClient, tour.id);
    patchTourSettlementStatusInCache(queryClient, tour.id, 'need_changes');
    try {
      await store.returnTourSettlement(tour.id, note || undefined);
      toast.success('Đã trả hồ sơ về HDV.');
      refresh();
      closeDialog();
    } catch (e) {
      restoreTourAggregateCaches(queryClient, tour.id, snapshot);
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
    const snapshot = await snapshotTourAggregateCaches(queryClient, tour.id);
    patchTourSettlementStatusInCache(queryClient, tour.id, 'approved');
    try {
      await store.approveTourSettlement(tour.id, note || undefined);
      toast.success('Đã duyệt hồ sơ. Hồ sơ đã được khóa.');
      refresh();
      closeDialog();
    } catch (e) {
      restoreTourAggregateCaches(queryClient, tour.id, snapshot);
      toast.error(toVietnameseError(e, 'Không thể duyệt hồ sơ.'));
    } finally {
      setBusy(false);
    }
  };

  const handleReopen = async () => {
    setBusy(true);
    const snapshot = await snapshotTourAggregateCaches(queryClient, tour.id);
    patchTourSettlementStatusInCache(queryClient, tour.id, 'draft');
    try {
      await store.reopenTourSettlement(tour.id, note || undefined);
      toast.success('Đã mở khóa hồ sơ.');
      refresh();
      closeDialog();
    } catch (e) {
      restoreTourAggregateCaches(queryClient, tour.id, snapshot);
      toast.error(toVietnameseError(e, 'Không thể mở khóa hồ sơ.'));
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = canSubmitTour(tour);
  const canReview = canReviewTour(tour);
  const canReopen = tour.settlementStatus === 'approved' || tour.settlementStatus === 'closed';
  const submitDisabled = !hasPermission('submit_settlement') || !canSubmit;
  const reviewDisabled = !hasPermission('approve_settlement') || !canReview;
  const approveDisabled = reviewDisabled || !areAllSettlementLinesApproved(tour);
  const reopenDisabled = !hasPermission('reopen_settlement') || !canReopen;
  const payDisabled = !canRecordPayment(tour, hasPermission('mark_tour_paid'));

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
    <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
      <SettlementStatusBadge status={tour.settlementStatus} className="text-[11px] sm:text-sm px-1.5 sm:px-2.5 py-0.5 sm:py-1 h-auto" />
      <PaymentStatusBadge status={tour.paymentStatus} method={tour.lastPaymentMethod} className="text-[11px] sm:text-sm px-1.5 sm:px-2.5 py-0.5 sm:py-1 h-auto" />
      {tour.submissionCount > 0 && (
        <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
          Đã gửi {tour.submissionCount} lần
        </span>
      )}
      <div className="flex-1 min-w-0" />
      {onShowHistory && (
        <Button size="sm" onClick={onShowHistory} className="h-7 sm:h-9 px-1.5 sm:px-3 text-[11px] sm:text-sm border-2 border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800/30 dark:text-gray-300 dark:hover:bg-gray-700/40">
          <History className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1" />
          Lịch sử
        </Button>
      )}
      {!submitDisabled && (
        <Button size="sm" onClick={() => setPending('submit')} className="h-7 sm:h-9 px-1.5 sm:px-3 text-[11px] sm:text-sm border-2 border-blue-700 bg-blue-600 text-white hover:bg-blue-700 dark:border-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600">
          <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1" />
          {tour.settlementStatus === 'need_changes' ? 'Gửi lại kế toán' : 'Gửi kế toán'}
        </Button>
      )}
      {!reviewDisabled && (
        <Button size="sm" onClick={() => setPending('return')} className="h-7 sm:h-9 px-1.5 sm:px-3 text-[11px] sm:text-sm border-2 border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-600 dark:bg-amber-950/20 dark:text-amber-300 dark:hover:bg-amber-900/30">
          <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1" />
          Trả về HDV
        </Button>
      )}
      {!approveDisabled && (
        <Button size="sm" onClick={() => setPending('approve')} className="h-7 sm:h-9 px-1.5 sm:px-3 text-[11px] sm:text-sm border-2 border-green-600 bg-green-600 text-white hover:bg-green-700 dark:border-green-500 dark:bg-green-700 dark:hover:bg-green-600">
          <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1" />
          Duyệt
        </Button>
      )}
      {!payDisabled && (
        <Button size="sm" onClick={() => setPaymentDialogOpen(true)} className="h-7 sm:h-9 px-1.5 sm:px-3 text-[11px] sm:text-sm border-2 border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-400 dark:bg-blue-950/20 dark:text-blue-300 dark:hover:bg-blue-900/30">
          <span className="inline-flex items-center gap-1">
            <span className="relative inline-flex items-center">
              <Banknote className="h-4 w-4 absolute -left-px opacity-40" />
              <Banknote className="h-4 w-4" />
            </span>
            Thanh toán
          </span>
        </Button>
      )}
      {!reopenDisabled && (
        <Button size="sm" onClick={() => setPending('reopen')} className="h-7 sm:h-9 px-1.5 sm:px-3 text-[11px] sm:text-sm border-2 border-purple-400 bg-purple-50 text-purple-700 hover:bg-purple-100 dark:border-purple-600 dark:bg-purple-950/20 dark:text-purple-300 dark:hover:bg-purple-900/30">
          <Unlock className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1" />
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
