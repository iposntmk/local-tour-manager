import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { store } from '@/lib/datastore';
import type { AttachmentLineType } from '@/types/tour';

const pendingFilesCache = new Map<string, File[]>();

export function usePendingLineAttachments(tourId?: string, scopeKey = 'default') {
  const cacheKey = `${tourId || 'new'}:${scopeKey}`;
  const [pendingFiles, setPendingFilesState] = useState<File[]>(() => pendingFilesCache.get(cacheKey) || []);
  const queryClient = useQueryClient();

  useEffect(() => {
    setPendingFilesState(pendingFilesCache.get(cacheKey) || []);
  }, [cacheKey]);

  const setPendingFiles = (files: File[]) => {
    pendingFilesCache.set(cacheKey, files);
    setPendingFilesState(files);
  };

  const clearPendingFiles = () => setPendingFiles([]);

  const uploadPendingFiles = async (lineType: AttachmentLineType, lineId?: string) => {
    if (!tourId || !lineId || pendingFiles.length === 0) return true;
    try {
      for (const file of pendingFiles) {
        await store.uploadTourLineAttachment(tourId, lineType, lineId, file);
      }
      toast.success('Đã tải chứng từ');
      clearPendingFiles();
      await queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
      return true;
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Không thể tải chứng từ.');
      return false;
    }
  };

  return { pendingFiles, setPendingFiles, clearPendingFiles, uploadPendingFiles };
}
