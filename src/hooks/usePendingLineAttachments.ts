import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { store } from '@/lib/datastore';
import type { AttachmentLineType } from '@/types/tour';

export function usePendingLineAttachments(tourId?: string) {
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const queryClient = useQueryClient();

  const clearPendingFiles = () => setPendingFiles([]);

  const uploadPendingFiles = async (lineType: AttachmentLineType, lineId?: string) => {
    if (!tourId || !lineId || pendingFiles.length === 0) return;
    try {
      for (const file of pendingFiles) {
        await store.uploadTourLineAttachment(tourId, lineType, lineId, file);
      }
      toast.success('Đã tải chứng từ');
      clearPendingFiles();
      await queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
    } catch (error: any) {
      toast.error(error?.message || 'Không thể tải chứng từ.');
    }
  };

  return { pendingFiles, setPendingFiles, clearPendingFiles, uploadPendingFiles };
}
