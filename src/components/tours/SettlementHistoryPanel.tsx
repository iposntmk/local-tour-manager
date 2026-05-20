import { useQuery } from '@tanstack/react-query';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { store } from '@/lib/datastore';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface SettlementHistoryPanelProps {
  tourId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EVENT_LABELS: Record<string, { label: string; className: string }> = {
  submitted: { label: 'Đã gửi kế toán', className: 'bg-blue-100 text-blue-800' },
  returned: { label: 'Trả lại HDV', className: 'bg-orange-100 text-orange-800' },
  approved: { label: 'Đã duyệt', className: 'bg-green-100 text-green-800' },
  reopened: { label: 'Mở khóa', className: 'bg-purple-100 text-purple-800' },
};

export function SettlementHistoryPanel({ tourId, open, onOpenChange }: SettlementHistoryPanelProps) {
  const { data: history, isLoading } = useQuery({
    queryKey: ['tour-submission-history', tourId],
    queryFn: () => store.listSubmissionHistory(tourId),
    enabled: open,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Lịch sử quyết toán</SheetTitle>
          <SheetDescription>Các sự kiện gửi, trả lại, duyệt, mở khóa hồ sơ này.</SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground">Đang tải...</p>}
          {!isLoading && (!history || history.length === 0) && (
            <p className="text-sm text-muted-foreground">Chưa có sự kiện nào.</p>
          )}
          {history?.map((event) => {
            const cfg = EVENT_LABELS[event.event] ?? { label: event.event, className: '' };
            return (
              <div key={event.id} className="border rounded-md p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <Badge className={cfg.className} variant="secondary">
                    {cfg.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(event.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
                  </span>
                </div>
                {event.actorRole && (
                  <p className="text-xs text-muted-foreground">Vai trò: {event.actorRole}</p>
                )}
                {event.note && (
                  <p className="text-sm whitespace-pre-wrap">{event.note}</p>
                )}
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
