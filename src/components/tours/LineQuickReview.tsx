import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useLineReview } from '@/hooks/useLineReview';
import type { LineStatus, LineType } from '@/types/tour';
import { LINE_STATUS_LABELS } from '@/lib/settlement-utils';

interface LineQuickReviewProps {
  tourId: string;
  lineType: LineType;
  lineId: string;
  currentStatus?: LineStatus;
  currentComment?: string;
  editable: boolean;
  statusLabels?: Partial<Record<LineStatus, string>>;
  onApproved?: () => void;
  compact?: boolean;
}

const STATUS_STYLES: Record<LineStatus, string> = {
  unchecked: 'bg-gray-100 text-gray-700 hover:bg-gray-100',
  valid: 'bg-green-100 text-green-800 hover:bg-green-100',
  need_more: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
  invalid: 'bg-red-100 text-red-800 hover:bg-red-100',
};

/**
 * Inline valid / invalid quick-review buttons for a single settlement line.
 * Clicking "Không hợp lệ" reveals a reason box so accountants can act in one place.
 */
export function LineQuickReview({
  tourId,
  lineType,
  lineId,
  currentStatus = 'unchecked',
  currentComment,
  editable,
  statusLabels,
  onApproved,
  compact = false,
}: LineQuickReviewProps) {
  const { hasPermission } = useAuth();
  const { busy, updateLine } = useLineReview(tourId);
  const [rejecting, setRejecting] = useState(false);
  const [comment, setComment] = useState(currentComment ?? '');

  const labelFor = (status: LineStatus) => statusLabels?.[status] || LINE_STATUS_LABELS[status];
  const canEdit = editable && hasPermission('review_settlement_line') && !!lineId;

  if (!canEdit) {
    return (
      <Badge className={cn(STATUS_STYLES[currentStatus], 'font-medium')} variant="secondary">
        {labelFor(currentStatus)}
      </Badge>
    );
  }

  const approve = async () => {
    const ok = await updateLine({ lineType, lineId }, { lineStatus: 'valid' });
    if (ok) onApproved?.();
  };

  const openReject = () => {
    setComment(currentComment ?? '');
    setRejecting(true);
  };

  const confirmReject = async () => {
    const ok = await updateLine({ lineType, lineId }, { lineStatus: 'invalid', lineComment: comment });
    if (ok) setRejecting(false);
  };

  const approveLabel = currentStatus === 'valid' ? (compact ? 'OK' : labelFor('valid')) : (compact ? 'OK' : 'Duyệt');
  const rejectLabel = compact ? 'Lỗi' : labelFor('invalid');
  const btnBase = compact
    ? 'h-[5px] min-w-0 flex-none gap-px px-[2px] text-[5px] leading-none'
    : 'h-7 w-7 min-w-0 flex-none gap-1 p-0 text-xs sm:w-auto sm:px-2';
  const iconSize = compact ? 'h-[4px] w-[4px]' : 'h-3.5 w-3.5';
  const textClass = compact ? '' : 'hidden truncate sm:inline';

  return (
    <div className="space-y-2">
      <div className="flex flex-nowrap items-center gap-1">
        <Button
          type="button"
          size="sm"
          variant={currentStatus === 'valid' ? 'default' : 'outline'}
          className={cn(btnBase, currentStatus === 'valid' && 'bg-green-600 hover:bg-green-700')}
          disabled={busy}
          onClick={approve}
          title={approveLabel}
        >
          <Check className={iconSize} />
          <span className={textClass}>{approveLabel}</span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant={currentStatus === 'invalid' ? 'default' : 'outline'}
          className={cn(btnBase, currentStatus === 'invalid' && 'bg-red-600 hover:bg-red-700')}
          disabled={busy}
          onClick={openReject}
          title={rejectLabel}
        >
          <X className={iconSize} />
          <span className={textClass}>{rejectLabel}</span>
        </Button>
      </div>

      {rejecting && (
        <div className="space-y-2 rounded-md border bg-background p-2">
          <Textarea
            autoFocus
            rows={2}
            placeholder="Lý do không hợp lệ: thiếu hóa đơn, số tiền không khớp..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="flex justify-end gap-1.5">
            <Button type="button" variant="ghost" size="sm" className="h-7" onClick={() => setRejecting(false)} disabled={busy}>
              Hủy
            </Button>
            <Button type="button" size="sm" className="h-7 bg-red-600 hover:bg-red-700" onClick={confirmReject} disabled={busy}>
              {busy ? 'Đang lưu...' : 'Lưu lý do'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
