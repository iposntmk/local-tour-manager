import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { invalidateTourAggregateCaches } from '@/lib/query-cache';
import {
  getTourLineCacheSnapshot,
  replaceTourCacheLine,
  restoreTourLineCacheSnapshot,
  type TourCollectionKey,
  type TourLineCacheSnapshot,
} from '@/lib/tour-cache-updates';
import { toVietnameseError } from '@/lib/error-messages';

interface UseTourLineAutosaveOptions<T> {
  tourId?: string;
  collection: TourCollectionKey;
  items: T[];
  onChange?: (items: T[]) => void;
  saveLine: (index: number, line: T) => Promise<void>;
  successMessage: string;
  delayMs?: number;
}

interface PendingSave<T> {
  index: number;
  line: T;
  snapshot?: TourLineCacheSnapshot;
}

export function useTourLineAutosave<T>({
  tourId,
  collection,
  items,
  onChange,
  saveLine,
  successMessage,
  delayMs = 300,
}: UseTourLineAutosaveOptions<T>) {
  const queryClient = useQueryClient();
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const pending = useRef(new Map<string, PendingSave<T>>());

  const runSave = useCallback(async (key: string) => {
    const task = pending.current.get(key);
    if (!task || !tourId) return;
    try {
      await saveLine(task.index, task.line);
      toast.success(successMessage);
      queryClient.invalidateQueries({ queryKey: ['tour', tourId], refetchType: 'none' });
      void invalidateTourAggregateCaches(queryClient, 'none');
    } catch (error) {
      restoreTourLineCacheSnapshot(queryClient, tourId, collection, task.snapshot);
      toast.error(toVietnameseError(error, 'Không thể tự động lưu.'));
    } finally {
      pending.current.delete(key);
      timers.current.delete(key);
    }
  }, [collection, queryClient, saveLine, successMessage, tourId]);

  return useCallback((index: number, line: T) => {
    if (!tourId) {
      const updated = [...items];
      updated[index] = line;
      onChange?.(updated);
      return;
    }

    const lineId = (line as { id?: string }).id;
    const key = `${collection}:${lineId || index}`;
    const existing = pending.current.get(key);
    const snapshot = existing?.snapshot ?? getTourLineCacheSnapshot(queryClient, tourId, collection);
    replaceTourCacheLine(queryClient, tourId, collection, index, line);
    pending.current.set(key, { index, line, snapshot });

    const currentTimer = timers.current.get(key);
    if (currentTimer) clearTimeout(currentTimer);
    timers.current.set(key, setTimeout(() => void runSave(key), delayMs));
  }, [collection, delayMs, items, onChange, queryClient, runSave, tourId]);
}
