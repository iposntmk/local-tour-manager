import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
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
  unchecked: 'bg-gray-100 text-gray-700',
  valid: 'bg-green-100 text-green-800',
  need_more: 'bg-orange-100 text-orange-800',
  invalid: 'bg-red-100 text-red-800',
};

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
  const isApproved = currentStatus === 'valid';
  const isUnreviewed = !currentStatus || currentStatus === 'unchecked';

  if (!canEdit) {
    return (
      <Badge className={cn(STATUS_STYLES[currentStatus], 'font-medium')} variant="secondary">
        {labelFor(currentStatus)}
      </Badge>
    );
  }

  const handleApprove = async () => {
    const ok = await updateLine({ lineType, lineId }, { lineStatus: 'valid' });
    if (ok) onApproved?.();
  };

  const handleConfirmReject = async () => {
    const ok = await updateLine({ lineType, lineId }, { lineStatus: 'need_more', lineComment: comment });
    if (ok) setRejecting(false);
  };

  const handleToggle = (checked: boolean) => {
    if (checked) {
      handleApprove();
    } else {
      setComment(currentComment ?? '');
      setRejecting(true);
    }
  };

  const rejectForm = (
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
        <Button type="button" size="sm" className="h-7 bg-red-600 hover:bg-red-700" onClick={handleConfirmReject} disabled={busy}>
          {busy ? 'Đang lưu...' : 'Lưu lý do'}
        </Button>
      </div>
    </div>
  );

  return (
    <div className={cn('space-y-1', compact ? 'w-full' : 'space-y-2')}>
      <div className={cn('flex items-center gap-1', compact ? 'justify-center' : 'gap-2')}>
        <button
          type="button"
          disabled={busy}
          onClick={handleApprove}
          className={cn(
            'whitespace-nowrap font-medium transition-colors hover:text-green-700',
            compact ? 'text-[10px]' : 'text-xs',
            isApproved ? 'text-green-700' : 'text-muted-foreground',
          )}
          title="Duyệt dòng này"
        >
          {compact && <Check className="mr-0.5 inline h-3 w-3" />}
          Duyệt
        </button>
        <Switch
          checked={isApproved}
          onCheckedChange={handleToggle}
          disabled={busy}
          className={cn(
            isApproved ? 'data-[state=checked]:bg-green-500' : 'data-[state=unchecked]:bg-input',
            compact && 'h-5 w-9 [&>span]:h-4 [&>span]:w-4 [&>span]:data-[state=checked]:translate-x-4',
          )}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => { setComment(currentComment ?? ''); setRejecting(true); }}
          className={cn(
            'whitespace-nowrap font-medium transition-colors hover:text-red-700',
            compact ? 'text-[10px]' : 'text-xs',
            !isApproved ? 'text-red-700' : 'text-muted-foreground',
          )}
          title="Không duyệt dòng này"
        >
          {compact && <X className="mr-0.5 inline h-3 w-3" />}
          {isApproved ? 'Không duyệt' : (isUnreviewed ? 'Chưa duyệt' : labelFor(currentStatus))}
        </button>
      </div>
      {rejecting && rejectForm}
    </div>
  );
}
