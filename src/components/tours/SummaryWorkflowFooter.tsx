import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, FileDown, Unlock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
import { SettlementStatusBadge } from './SettlementStatusBadge';
import { store } from '@/lib/datastore';
import { toVietnameseError } from '@/lib/error-messages';
import { useAuth } from '@/contexts/AuthContext';
import { areAllSettlementLinesApproved, getReviewableSettlementLines, hasSettlementLinesNeedingFix } from '@/lib/tour-line-utils';
import { canReviewTour } from '@/lib/settlement-utils';
import { invalidateTourAggregateCaches } from '@/lib/query-cache';
import {
  patchTourSettlementStatusInCache,
  restoreTourAggregateCaches,
  snapshotTourAggregateCaches,
} from '@/lib/tour-cache-updates';
import type { Tour } from '@/types/tour';

type ActionKind = 'approve' | 'reopen' | null;

interface SummaryWorkflowFooterProps {
  tour: Tour;
  canExport: boolean;
  onExport: () => void;
}

export function SummaryWorkflowFooter({ tour, canExport, onExport }: SummaryWorkflowFooterProps) {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<ActionKind>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const lines = getReviewableSettlementLines(tour);
  const approvedCount = lines.filter((line) => (line.lineStatus || 'unchecked') === 'valid').length;
  const allApproved = areAllSettlementLinesApproved(tour);
  const hasFixLines = hasSettlementLinesNeedingFix(tour);
  const canApprove = hasPermission('approve_settlement') && canReviewTour(tour);
  const canReopen = hasPermission('reopen_settlement') && (tour.settlementStatus === 'approved' || tour.settlementStatus === 'closed');

  const refresh = () => {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ['tour', tour.id], refetchType: 'none' }),
      invalidateTourAggregateCaches(queryClient, 'none'),
      queryClient.invalidateQueries({ queryKey: ['settlement-pending-count'], refetchType: 'none' }),
    ]);
  };

  const runAction = async (action: Exclude<ActionKind, null>) => {
    if (action === 'approve' && !allApproved) {
      toast.error('Chỉ chốt khi tất cả dòng đã được duyệt.');
      return;
    }
    setBusy(true);
    const snapshot = await snapshotTourAggregateCaches(queryClient, tour.id);
    patchTourSettlementStatusInCache(queryClient, tour.id, action === 'approve' ? 'approved' : 'draft');
    try {
      if (action === 'approve') {
        await store.approveTourSettlement(tour.id, note || undefined);
        toast.success('Đã chốt hồ sơ.');
      } else {
        await store.reopenTourSettlement(tour.id, note || undefined);
        toast.success('Đã mở lại hồ sơ.');
      }
      refresh();
      setPending(null);
      setNote('');
    } catch (error) {
      restoreTourAggregateCaches(queryClient, tour.id, snapshot);
      toast.error(toVietnameseError(error, 'Không thể cập nhật luồng.'));
    } finally {
      setBusy(false);
    }
  };

  const dialogText: Record<Exclude<ActionKind, null>, { title: string; description: string; label: string }> = {
    approve: { title: 'Chốt hồ sơ?', description: 'Chỉ chốt khi tất cả dòng đã được duyệt. Hồ sơ sẽ bị khóa.', label: 'Chốt' },
    reopen: { title: 'Mở lại hồ sơ?', description: 'Hồ sơ quay về trạng thái ban đầu để lặp lại quy trình soạn, gửi, duyệt.', label: 'Mở lại' },
  };

  return (
    <>
      <div className="fixed left-2 top-1/2 z-30 flex w-[64px] -translate-y-1/2 flex-col items-stretch gap-2">
        {/* Trạng thái */}
        <div className="rounded-lg border bg-card/95 p-1.5 text-center shadow-md backdrop-blur-sm">
          <SettlementStatusBadge status={tour.settlementStatus} className="px-1.5 py-0.5 text-[11px]" />
        </div>

        {/* Số dòng đã duyệt */}
        <div className="rounded-lg border bg-card/95 px-2 py-1.5 text-center shadow-md backdrop-blur-sm">
          <div className="text-sm font-bold leading-tight">{approvedCount}/{lines.length}</div>
          <div className="text-[10px] leading-tight text-muted-foreground">dòng OK</div>
        </div>

        {hasFixLines && (
          <div className="rounded-lg border border-orange-300 bg-orange-50 px-1.5 py-1.5 text-center shadow-md dark:bg-orange-950/40">
            <div className="text-[10px] font-semibold leading-tight text-orange-700 dark:text-orange-400">Cần sửa</div>
          </div>
        )}

        <div className="h-px w-full bg-border" />

        {/* Chốt */}
        <Button
          size="sm"
          onClick={() => setPending('approve')}
          disabled={!canApprove || !allApproved}
          className="h-auto w-full flex-col gap-1 px-2 py-2.5 shadow-md"
        >
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-xs leading-tight">Chốt</span>
        </Button>

        {/* Mở lại */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => setPending('reopen')}
          disabled={!canReopen}
          className="h-auto w-full flex-col gap-1 bg-card px-2 py-2.5 shadow-md"
        >
          <Unlock className="h-5 w-5" />
          <span className="text-xs leading-tight">Mở lại</span>
        </Button>

        {/* Xuất Excel */}
        <Button
          size="sm"
          variant="secondary"
          onClick={onExport}
          disabled={!canExport}
          className="h-auto w-full flex-col gap-1 px-2 py-2.5 shadow-md"
        >
          <FileDown className="h-5 w-5" />
          <span className="text-xs leading-tight">Excel</span>
        </Button>
      </div>

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          {pending && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{dialogText[pending].title}</AlertDialogTitle>
                <AlertDialogDescription>{dialogText[pending].description}</AlertDialogDescription>
              </AlertDialogHeader>
              <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ghi chú (tùy chọn)" rows={3} />
              <AlertDialogFooter>
                <AlertDialogCancel disabled={busy}>Hủy</AlertDialogCancel>
                <AlertDialogAction onClick={() => runAction(pending)} disabled={busy}>
                  {busy ? 'Đang xử lý...' : dialogText[pending].label}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
