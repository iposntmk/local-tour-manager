import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLineReview } from '@/hooks/useLineReview';
import type { LineStatus, LineType } from '@/types/tour';
import { LINE_STATUS_LABELS } from '@/lib/settlement-utils';

interface LineReviewControlProps {
  tourId: string;
  lineType: LineType;
  lineId?: string;
  currentStatus?: LineStatus;
  currentComment?: string;
  editable: boolean;
  statusLabels?: Partial<Record<LineStatus, string>>;
}

const STATUS_STYLES: Record<LineStatus, string> = {
  unchecked: 'bg-gray-100 text-gray-700 hover:bg-gray-100',
  valid: 'bg-green-100 text-green-800 hover:bg-green-100',
  need_more: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
  invalid: 'bg-red-100 text-red-800 hover:bg-red-100',
};

export function LineReviewControl({
  tourId,
  lineType,
  lineId,
  currentStatus = 'unchecked',
  currentComment,
  editable,
  statusLabels,
}: LineReviewControlProps) {
  const { hasPermission } = useAuth();
  const { busy, updateLine } = useLineReview(tourId);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<LineStatus>(currentStatus);
  const [comment, setComment] = useState(currentComment ?? '');

  const canEdit = editable && hasPermission('review_settlement_line') && !!lineId;

  const badge = (
    <Badge className={cn(STATUS_STYLES[currentStatus], 'font-medium gap-1')} variant="secondary">
      {statusLabels?.[currentStatus] || LINE_STATUS_LABELS[currentStatus]}
      {currentComment && <MessageSquare className="h-3 w-3" />}
    </Badge>
  );

  if (!canEdit) {
    return badge;
  }

  const handleSave = async () => {
    if (!lineId) return;
    const ok = await updateLine({ lineType, lineId }, { lineStatus: status, lineComment: comment });
    if (ok) setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setStatus(currentStatus);
          setComment(currentComment ?? '');
        }
      }}
    >
      <PopoverTrigger asChild>
        <button type="button" className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring rounded">
          {badge}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium block mb-1">Trạng thái kiểm tra</label>
            <Select value={status} onValueChange={(v) => setStatus(v as LineStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(LINE_STATUS_LABELS) as LineStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {LINE_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Ghi chú cho HDV</label>
            <Textarea
              rows={3}
              placeholder="Ví dụ: thiếu hóa đơn, số tiền không khớp..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={busy}>
              Hủy
            </Button>
            <Button size="sm" onClick={handleSave} disabled={busy}>
              {busy ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
