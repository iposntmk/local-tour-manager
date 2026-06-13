import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { store } from '@/lib/datastore';
import { toVietnameseError } from '@/lib/error-messages';
import {
  getTourCacheSnapshot,
  patchTourLineReviewInCache,
  restoreTourCacheSnapshot,
} from '@/lib/tour-cache-updates';
import type { LineStatus, LineType } from '@/types/tour';

export interface LineReviewTarget {
  lineType: LineType;
  lineId: string;
}

export interface LineReviewValue {
  lineStatus: LineStatus;
  lineComment?: string;
}

/**
 * Shared mutation logic for reviewing settlement lines. Handles the store call,
 * toast feedback and tour cache invalidation so UI components stay presentational.
 */
export function useLineReview(tourId: string | undefined) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['tour', tourId], refetchType: 'none' });

  const updateLine = async (target: LineReviewTarget, value: LineReviewValue): Promise<boolean> => {
    if (!tourId || !target.lineId) return false;
    setBusy(true);
    const snapshot = getTourCacheSnapshot(queryClient, tourId);
    patchTourLineReviewInCache(queryClient, tourId, [target], value);
    try {
      await store.updateLineReview(tourId, target.lineType, target.lineId, {
        lineStatus: value.lineStatus,
        lineComment: value.lineComment?.trim() || undefined,
      });
      toast.success('Đã cập nhật trạng thái.');
      await invalidate();
      return true;
    } catch (e) {
      restoreTourCacheSnapshot(queryClient, tourId, snapshot);
      toast.error(toVietnameseError(e, 'Không thể cập nhật.'));
      return false;
    } finally {
      setBusy(false);
    }
  };

  /** Set many lines to the same status at once (e.g. approve a whole section). */
  const updateMany = async (targets: LineReviewTarget[], value: LineReviewValue): Promise<boolean> => {
    if (!tourId) return false;
    const pending = targets.filter((t) => t.lineId);
    if (!pending.length) return false;
    setBusy(true);
    const snapshot = getTourCacheSnapshot(queryClient, tourId);
    patchTourLineReviewInCache(queryClient, tourId, pending, value);
    try {
      await Promise.all(
        pending.map((t) =>
          store.updateLineReview(tourId, t.lineType, t.lineId, {
            lineStatus: value.lineStatus,
            lineComment: value.lineComment?.trim() || undefined,
          })
        )
      );
      toast.success(`Đã duyệt ${pending.length} dòng.`);
      await invalidate();
      return true;
    } catch (e) {
      restoreTourCacheSnapshot(queryClient, tourId, snapshot);
      toast.error(toVietnameseError(e, 'Không thể cập nhật.'));
      return false;
    } finally {
      setBusy(false);
    }
  };

  return { busy, updateLine, updateMany };
}
