import { useState } from 'react';
import { FileText, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SummaryLineAttachmentsDialog } from './SummaryLineAttachmentsDialog';
import { t } from '@/lib/i18n';
import type { TourLineAttachment } from '@/types/tour';

interface LineAttachmentsButtonProps {
  attachments?: TourLineAttachment[];
  emptyLabel?: string;
  compact?: boolean;
}

export function LineAttachmentsButton({
  attachments = [],
  emptyLabel = '0',
  compact = false,
}: LineAttachmentsButtonProps) {
  const [open, setOpen] = useState(false);

  if (attachments.length === 0) {
    return (
      <div className="inline-flex items-center gap-px text-muted-foreground sm:gap-0.5">
        <FileText className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
        <span className="text-xs sm:text-sm">{emptyLabel}</span>
      </div>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={compact
          ? 'h-5 gap-px px-1 text-xs sm:h-6 sm:gap-0.5 sm:px-1.5 sm:text-sm'
          : 'h-6 gap-0.5 px-1.5 text-xs sm:h-7 sm:gap-1 sm:px-2 sm:text-sm'}
        onClick={() => setOpen(true)}
        title={t('tourEvidence.openAttachments')}
      >
        <Paperclip className={compact ? 'h-2 w-2 sm:h-2.5 sm:w-2.5' : 'h-3 w-3 sm:h-3.5 sm:w-3.5'} />
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
