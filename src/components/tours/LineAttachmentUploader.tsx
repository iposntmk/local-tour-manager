import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FileText, Image, Paperclip, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { store } from '@/lib/datastore';
import { toVietnameseError } from '@/lib/error-messages';
import { t } from '@/lib/i18n';
import type { AttachmentLineType, TourLineAttachment } from '@/types/tour';

interface LineAttachmentUploaderProps {
  tourId?: string;
  lineType: AttachmentLineType;
  lineId?: string;
  attachments?: TourLineAttachment[];
  pendingFiles: File[];
  onPendingFilesChange: (files: File[]) => void;
  disabled?: boolean;
}

const ACCEPTED = 'image/jpeg,image/jpg,image/png,image/webp,application/pdf';
const MAX_SIZE = 10 * 1024 * 1024;

const isImage = (attachment: TourLineAttachment) => attachment.fileType?.startsWith('image/');

export function LineAttachmentUploader({
  tourId,
  lineType,
  lineId,
  attachments = [],
  pendingFiles,
  onPendingFilesChange,
  disabled = false,
}: LineAttachmentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const canUploadNow = Boolean(tourId && lineId);

  const validateFile = (file: File) => {
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') return `${file.name}: chỉ hỗ trợ ảnh hoặc PDF.`;
    if (file.size > MAX_SIZE) return `${file.name}: file tối đa 10MB.`;
    return null;
  };

  const refreshTour = async () => {
    if (tourId) await queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []);
    event.target.value = '';
    if (!selected.length || disabled) return;

    const validFiles = selected.filter((file) => {
      const issue = validateFile(file);
      if (issue) toast.error(issue);
      return !issue;
    });
    if (!validFiles.length) return;
    if (!tourId) {
      toast.warning(t('tourEvidence.saveTourFirst'));
      return;
    }
    if (!canUploadNow) {
      onPendingFilesChange([...pendingFiles, ...validFiles]);
      toast.info(t('tourEvidence.pendingUpload'));
      return;
    }

    setBusy(true);
    try {
      for (const file of validFiles) {
        await store.uploadTourLineAttachment(tourId, lineType, lineId!, file);
      }
      toast.success('Đã tải chứng từ');
      await refreshTour();
    } catch (error) {
      toast.error(toVietnameseError(error, 'Không thể tải chứng từ.'));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (attachment: TourLineAttachment) => {
    if (disabled) return;
    setBusy(true);
    try {
      await store.deleteTourLineAttachment(attachment);
      toast.success('Đã xóa chứng từ');
      await refreshTour();
    } catch (error) {
      toast.error(toVietnameseError(error, 'Không thể xóa chứng từ.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2 rounded-md border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium">{t('tourEvidence.attachments')}</div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || busy || !tourId}
        >
          <Upload className="mr-2 h-4 w-4" />
          {busy ? 'Đang tải...' : t('tourEvidence.upload')}
        </Button>
      </div>
      <input ref={inputRef} type="file" accept={ACCEPTED} multiple className="hidden" onChange={handleFileSelect} />

      {!tourId && <p className="text-xs text-muted-foreground">{t('tourEvidence.saveTourFirst')}</p>}
      {tourId && !lineId && pendingFiles.length > 0 && (
        <div className="space-y-1">
          {pendingFiles.map((file, index) => (
            <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded border bg-background px-2 py-1 text-xs">
              <span className="truncate"><Paperclip className="mr-1 inline h-3 w-3" />{file.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2"
                onClick={() => onPendingFilesChange(pendingFiles.filter((_, i) => i !== index))}
              >
                Xóa
              </Button>
            </div>
          ))}
        </div>
      )}

      {attachments.length === 0 && pendingFiles.length === 0 && (
        <p className="text-xs text-muted-foreground">{t('tourEvidence.noAttachments')}</p>
      )}
      {attachments.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {attachments.map((attachment) => (
            <div key={attachment.id} className="relative rounded-md border bg-background p-2">
              <button
                type="button"
                className="flex w-full items-center gap-2 text-left text-xs"
                onClick={() => window.open(store.getTourLineAttachmentUrl(attachment.filePath), '_blank')}
              >
                {isImage(attachment) ? <Image className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                <span className="truncate">{attachment.fileName}</span>
              </button>
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1 h-6 w-6 text-destructive"
                  onClick={() => handleDelete(attachment)}
                  disabled={busy}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
