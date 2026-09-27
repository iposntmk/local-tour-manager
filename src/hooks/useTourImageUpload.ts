import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { store } from '@/lib/datastore';
import { compressImageFile } from '@/lib/image-compress';
import { mapWithConcurrency } from '@/lib/async-utils';
import { generateTourImageStoragePath } from '@/lib/tour-image-path';
import type { TourImage } from '@/types/tour';

/** Ảnh gốc tối đa được chọn (trước nén) và kích thước tối đa sau nén. */
const MAX_INPUT_BYTES = 30 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const UPLOAD_CONCURRENCY = 3;
// 2560px đủ nét để xem/zoom chứng từ, dung lượng thường chỉ 300–800KB thay vì 3–10MB.
const STORAGE_COMPRESS = { maxLongEdge: 2560, quality: 0.85, passthroughBytes: 600 * 1024 };

export interface UploadProgress {
  done: number;
  total: number;
}

const validateFile = (file: File): string | null => {
  if (!file.type.startsWith('image/')) return `${file.name} không phải file ảnh`;
  if (file.size > MAX_INPUT_BYTES) return `${file.name} quá lớn (tối đa 30MB)`;
  return null;
};

async function prepareAndUpload(tourId: string, tourCode: string, file: File): Promise<TourImage> {
  const prepared = await compressImageFile(file, STORAGE_COMPRESS).catch(() => file);
  if (prepared.size > MAX_UPLOAD_BYTES) throw new Error('ảnh vẫn lớn hơn 5MB sau khi nén');
  const path = generateTourImageStoragePath(tourId, tourCode, prepared);
  return store.uploadTourImage(tourId, prepared, path);
}

export function useTourImageUpload(tourId: string, tourCode: string) {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<UploadProgress | null>(null);

  const uploadFiles = async (files: File[]) => {
    const valid = files.filter((file) => {
      const error = validateFile(file);
      if (error) toast.error(error);
      return !error;
    });
    if (valid.length === 0) return;

    let done = 0;
    setProgress({ done, total: valid.length });
    const uploaded: TourImage[] = [];
    try {
      await mapWithConcurrency(valid, UPLOAD_CONCURRENCY, async (file) => {
        try {
          const image = await prepareAndUpload(tourId, tourCode, file);
          uploaded.push(image);
          // Chèn ngay vào cache để ảnh hiện dần, không phải refetch cả danh sách.
          queryClient.setQueryData<TourImage[]>(['tourImages', tourId], (old = []) => [image, ...old]);
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Lỗi không xác định';
          toast.error(`Upload ${file.name} thất bại: ${msg}`);
        } finally {
          done += 1;
          setProgress({ done, total: valid.length });
        }
      });
    } finally {
      setProgress(null);
    }
    if (uploaded.length > 0) toast.success(`Đã upload ${uploaded.length}/${valid.length} ảnh`);
  };

  return { uploadFiles, progress, uploading: progress !== null };
}
