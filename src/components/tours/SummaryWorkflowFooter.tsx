import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, FileDown, RotateCcw, Send, Unlock } from 'lucide-react';
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
import { canReviewTour, canSubmitTour, validateSettlementReady } from '@/lib/settlement-utils';
import type { Tour } from '@/types/tour';

type ActionKind = 'submit' | 'return' | 'approve' | 'reopen' | null;

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
  const canSubmit = hasPermission('submit_settlement') && canSubmitTour(tour);
  const canReturn = hasPermission('approve_settlement') && canReviewTour(tour) && hasFixLines;
  const canApprove = hasPermission('approve_settlement') && canReviewTour(tour);
  const canReopen = hasPermission('reopen_settlement') && (tour.settlementStatus === 'approved' || tour.settlementStatus === 'closed');
  const canExportNow = canExport && allApproved && (tour.settlementStatus === 'approved' || tour.settlementStatus === 'closed');

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['tour', tour.id] });
    await queryClient.invalidateQueries({ queryKey: ['tours'] });
    await queryClient.invalidateQueries({ queryKey: ['settlement-pending-count'] });
  };

  const runAction = async (action: Exclude<ActionKind, null>) => {
    setBusy(true);
    try {
      if (action === 'submit') {
        const validation = validateSettlementReady(tour);
        if (!validation.ok) throw new Error(validation.errors.join('\n'));
        await store.submitTourSettlement(tour.id, note || undefined);
        toast.success('Đã gửi kế toán kiểm tra.');
      } else if (action === 'return') {
        await store.returnTourSettlement(tour.id, note || undefined);
        toast.success('Đã trả hồ sơ về HDV.');
      } else if (action === 'approve') {
        if (!allApproved) throw new Error('Chỉ chốt khi tất cả dòng đã được duyệt.');
        await store.approveTourSettlement(tour.id, note || undefined);
        toast.success('Đã chốt hồ sơ.');
      } else {
        await store.reopenTourSettlement(tour.id, note || undefined);
        toast.success('Đã mở lại hồ sơ.');
      }
      await refresh();
      setPending(null);
      setNote('');
    } catch (error) {
      toast.error(toVietnameseError(error, 'Không thể cập nhật luồng.'));
    } finally {
      setBusy(false);
    }
  };

  const dialogText: Record<Exclude<ActionKind, null>, { title: string; description: string; label: string }> = {
    submit: { title: 'Gửi kế toán kiểm tra?', description: 'Hồ sơ chuyển sang trạng thái đã gửi để kế toán duyệt từng dòng.', label: 'Gửi' },
    return: { title: 'Trả hồ sơ về HDV?', description: 'HDV sẽ chỉnh sửa lại các dòng chưa đúng và gửi lại.', label: 'Trả về' },
    approve: { title: 'Chốt hồ sơ?', description: 'Chỉ chốt khi tất cả dòng đã được duyệt. Hồ sơ sẽ bị khóa.', label: 'Chốt' },
    reopen: { title: 'Mở lại hồ sơ?', description: 'Hồ sơ quay về trạng thái ban đầu để lặp lại quy trình soạn, gửi, duyệt.', label: 'Mở lại' },
  };

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <SettlementStatusBadge status={tour.settlementStatus} />
            <span className="text-sm text-muted-foreground">Đã duyệt {approvedCount}/{lines.length} dòng</span>
            {hasFixLines && <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-800">Có dòng cần sửa</span>}
          </div>
          <p className="text-xs text-muted-foreground">
            HDV soạn và gửi kế toán; kế toán duyệt hoặc trả lý do từng dòng; hồ sơ chỉ chốt và xuất Excel khi mọi dòng hợp lệ.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row lg:ml-auto">
          {canSubmit && <Button onClick={() => setPending('submit')}><Send className="mr-2 h-4 w-4" />Gửi kế toán</Button>}
          {canReturn && <Button variant="outline" onClick={() => setPending('return')}><RotateCcw className="mr-2 h-4 w-4" />Trả về HDV</Button>}
          <Button onClick={() => setPending('approve')} disabled={!canApprove || !allApproved}>
            <CheckCircle2 className="mr-2 h-4 w-4" />Chốt
          </Button>
          <Button variant="outline" onClick={() => setPending('reopen')} disabled={!canReopen}>
            <Unlock className="mr-2 h-4 w-4" />Mở lại
          </Button>
          <Button variant="secondary" onClick={onExport} disabled={!canExportNow}>
            <FileDown className="mr-2 h-4 w-4" />Xuất Excel
          </Button>
        </div>
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
    </div>
  );
}
