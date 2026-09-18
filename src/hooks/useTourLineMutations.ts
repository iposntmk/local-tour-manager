import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { invalidateTourAggregateCaches } from '@/lib/query-cache';
import {
  appendTourCacheLine,
  getTourLineCacheSnapshot,
  patchTourCacheLineRef,
  replaceTourCacheLine,
  restoreTourLineCacheSnapshot,
  tourCollectionQueryKey,
  type TourCollectionKey,
  type TourLineCacheSnapshot,
} from '@/lib/tour-cache-updates';
import { toVietnameseError } from '@/lib/error-messages';
import type { AttachmentLineType } from '@/types/tour';

export interface TourLineRecord {
  id?: string;
  date?: string;
}

interface UseTourLineMutationsOptions<T extends TourLineRecord> {
  tourId?: string;
  collection: TourCollectionKey;
  lineType: AttachmentLineType;
  items: T[];
  /** Tour chưa lưu: ghi thẳng vào state của form cha thay vì gọi store. */
  onChange?: (items: T[]) => void;
  addLine: (line: T) => Promise<string | undefined>;
  updateLine: (index: number, line: T) => Promise<void>;
  removeLine: (index: number, line?: T) => Promise<void>;
  uploadPendingFiles: (lineType: AttachmentLineType, lineId?: string) => Promise<unknown>;
  /** Dọn form ngay khi bấm lưu (không chờ server) — nguồn chính của cảm giác "nhanh". */
  onOptimisticSubmit?: () => void;
  /** Trả lại dữ liệu đang nhập khi lưu hỏng, để user không mất công gõ lại. */
  onRestoreForm?: (line: T) => void;
  onSettledForm?: () => void;
  messages: { added: string; updated: string; deleted: string };
}

interface AddContext<T> {
  snapshot?: TourLineCacheSnapshot;
  optimisticLine?: T;
}

/**
 * Add/update/delete cho các tab dòng của tour với cập nhật lạc quan.
 *
 * Trước đây mỗi lần thêm dòng phải chờ INSERT → tính lại tổng kết → refetch xong mới thấy
 * dòng mới và form mới trống (4+ round-trip nối tiếp). Ở đây cache được vá ngay trong
 * `onMutate`, còn refetch chạy nền ở `onSettled` để lấy dữ liệu chuẩn từ server.
 */
export function useTourLineMutations<T extends TourLineRecord>({
  tourId,
  collection,
  lineType,
  items,
  onChange,
  addLine,
  updateLine,
  removeLine,
  uploadPendingFiles,
  onOptimisticSubmit,
  onRestoreForm,
  onSettledForm,
  messages,
}: UseTourLineMutationsOptions<T>) {
  const queryClient = useQueryClient();

  const invalidateAfterWrite = () => {
    if (!tourId) return;
    queryClient.invalidateQueries({ queryKey: tourCollectionQueryKey(tourId, collection) });
    queryClient.invalidateQueries({ queryKey: ['tour', tourId], exact: true, refetchType: 'none' });
    void invalidateTourAggregateCaches(queryClient, 'none');
  };

  const addMutation = useMutation<string | undefined, Error, T, AddContext<T>>({
    mutationFn: async (line) => {
      if (!tourId) {
        onChange?.([...items, line]);
        return undefined;
      }
      return addLine(line);
    },
    onMutate: (line) => {
      onOptimisticSubmit?.();
      if (!tourId) return {};
      const snapshot = getTourLineCacheSnapshot(queryClient, tourId, collection);
      // Bỏ id: "nhân bản dòng" truyền vào nguyên dòng gốc, giữ lại id sẽ khiến thao tác
      // sửa dòng mới (trước khi refetch xong) ghi nhầm sang dòng gốc.
      const optimisticLine = { ...line, id: undefined } as T;
      const applied = appendTourCacheLine(queryClient, tourId, collection, optimisticLine);
      return applied ? { snapshot, optimisticLine } : { snapshot };
    },
    onSuccess: async (lineId, _line, context) => {
      if (tourId && lineId && context?.optimisticLine) {
        patchTourCacheLineRef(queryClient, tourId, collection, context.optimisticLine, { id: lineId } as Partial<T>);
      }
      await uploadPendingFiles(lineType, lineId);
      onSettledForm?.();
      toast.success(messages.added);
    },
    onError: (error, line, context) => {
      if (tourId) restoreTourLineCacheSnapshot(queryClient, tourId, collection, context?.snapshot);
      onRestoreForm?.(line);
      toast.error(toVietnameseError(error, `${messages.added} thất bại.`));
    },
    onSettled: invalidateAfterWrite,
  });

  const updateMutation = useMutation<
    void,
    Error,
    { index: number; line: T },
    { snapshot?: TourLineCacheSnapshot }
  >({
    mutationFn: async ({ index, line }) => {
      if (!tourId) {
        const next = [...items];
        next[index] = line;
        onChange?.(next);
        return;
      }
      await updateLine(index, line);
    },
    onMutate: ({ index, line }) => {
      onOptimisticSubmit?.();
      if (!tourId) return {};
      const snapshot = getTourLineCacheSnapshot(queryClient, tourId, collection);
      replaceTourCacheLine(queryClient, tourId, collection, index, line);
      return { snapshot };
    },
    onSuccess: async (_result, { line }) => {
      await uploadPendingFiles(lineType, line.id);
      onSettledForm?.();
      toast.success(messages.updated);
    },
    onError: (error, { line }, context) => {
      if (tourId) restoreTourLineCacheSnapshot(queryClient, tourId, collection, context?.snapshot);
      onRestoreForm?.(line);
      toast.error(toVietnameseError(error, `${messages.updated} thất bại.`));
    },
    onSettled: invalidateAfterWrite,
  });

  // Xóa vẫn chờ server: index dòng phải khớp thứ tự thật, xóa lạc quan dễ lệch khi
  // user bấm xóa nhiều dòng liên tiếp.
  const deleteMutation = useMutation<void, Error, number>({
    mutationFn: async (index) => {
      if (!tourId) return;
      await removeLine(index, items[index]);
    },
    onSuccess: (_result, index) => {
      if (!tourId) onChange?.(items.filter((_, i) => i !== index));
      toast.success(messages.deleted);
    },
    onError: (error) => toast.error(toVietnameseError(error, `${messages.deleted} thất bại.`)),
    onSettled: invalidateAfterWrite,
  });

  return { addMutation, updateMutation, deleteMutation };
}
