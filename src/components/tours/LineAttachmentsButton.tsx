import { useState } from 'react';
import { FileText, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SummaryLineAttachmentsDialog } from './SummaryLineAttachmentsDialog';
import { t } from '@/lib/i18n';
import type { TourLineAttachment } from '@/types/tour';

interface LineAttachmentsButtonProps {
  attachments?: TourLineAttachment[];
  emptyLabel?: string;
}

export function LineAttachmentsButton({
  attachments = [],
  emptyLabel = '0',
}: LineAttachmentsButtonProps) {
  const [open, setOpen] = useState(false);

  if (attachments.length === 0) {
    return (
      <div className="inline-flex items-center gap-1 text-muted-foreground">
        <FileText className="h-4 w-4" />
        <span>{emptyLabel}</span>
      </div>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1 px-2"
        onClick={() => setOpen(true)}
        title={t('tourEvidence.openAttachments')}
      >
        <Paperclip className="h-4 w-4" />
        <span>{attachments.length}</span>
      </Button>
      <SummaryLineAttachmentsDialog
        open={open}
        attachments={attachments}
        onOpenChange={setOpen}
        title={t('tourEvidence.attachmentDialogTitle')}
      />
    </>
  );
}
