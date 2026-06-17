import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { store } from '@/lib/datastore';
import { t } from '@/lib/i18n';
import type { TourLineAttachment } from '@/types/tour';

interface SummaryLineAttachmentsDialogProps {
  open: boolean;
  attachments: TourLineAttachment[];
  onOpenChange: (open: boolean) => void;
  title?: string;
}

const isImage = (attachment: TourLineAttachment) => attachment.fileType?.startsWith('image/');

export function SummaryLineAttachmentsDialog({
  open,
  attachments,
  onOpenChange,
  title = t('tourEvidence.attachmentDialogTitle'),
}: SummaryLineAttachmentsDialogProps) {
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const selected = attachments.find((item) => item.id === selectedId) || attachments[0];
  const attachmentPathKey = attachments.map((attachment) => `${attachment.id}:${attachment.filePath}`).join('|');
  const { data: attachmentUrls = {} } = useQuery({
    queryKey: ['tourLineAttachmentUrls', attachmentPathKey],
    queryFn: async () => Object.fromEntries(
      await Promise.all(attachments.map(async (attachment) => [
        attachment.filePath,
        await store.getTourLineAttachmentUrl(attachment.filePath),
      ]))
    ),
    enabled: open && attachments.length > 0,
    staleTime: 30 * 60 * 1000,
  });
  const selectedUrl = selected ? attachmentUrls[selected.filePath] ?? '' : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-5xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {attachments.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">Chưa có chứng từ</div>
        ) : (
          <div className="grid flex-1 gap-4 overflow-hidden md:grid-cols-[220px_1fr]">
            <div className="space-y-2 overflow-y-auto pr-1">
              {attachments.map((attachment) => (
                <button
                  key={attachment.id}
                  type="button"
                  onClick={() => setSelectedId(attachment.id)}
                  className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm ${
                    selected?.id === attachment.id ? 'border-primary bg-primary/10' : 'bg-background'
                  }`}
                >
                  {isImage(attachment) ? (
                    <img src={attachmentUrls[attachment.filePath] ?? ''} alt="" className="h-10 w-10 rounded object-cover" />
                  ) : (
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  )}
                  <span className="truncate">{attachment.fileName}</span>
                </button>
              ))}
            </div>

            <div className="flex min-h-0 flex-col overflow-hidden rounded-md border bg-muted/20">
              <div className="flex items-center justify-between gap-2 border-b bg-background px-3 py-2">
                <span className="truncate text-sm font-medium">{selected?.fileName}</span>
                <Button variant="outline" size="sm" onClick={() => window.open(selectedUrl, '_blank')} disabled={!selectedUrl}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Mở
                </Button>
              </div>
              <div className="flex flex-1 items-center justify-center overflow-auto p-3">
                {selected && isImage(selected) ? (
                  <img src={selectedUrl} alt={selected.fileName} className="max-h-full max-w-full rounded object-contain" />
                ) : (
                  <iframe title={selected?.fileName || 'PDF'} src={selectedUrl} className="h-full min-h-[480px] w-full rounded bg-white" />
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
