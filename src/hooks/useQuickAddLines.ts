import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { useAuth } from '@/contexts/AuthContext';
import {
  QUICK_ADD_FETCH_LIMIT,
  buildQuickAddOptions,
  canUntickQuickAddOption,
  needsQuickAddRemoveConfirm,
} from '@/lib/quick-add-utils';
import type { QuickAddLine, QuickAddLineType, QuickAddOption, QuickAddSource } from '@/types/quick-add';

interface UseQuickAddLinesOptions<T extends QuickAddLine> {
  lineType: QuickAddLineType;
  /** Tắt khi tab chỉ đọc hoặc user không có quyền thêm dòng. */
  enabled: boolean;
  /** Master data mà tab đang dùng cho ô chọn tên. */
  sources: QuickAddSource[];
  lines: T[];
  buildLine: (source: QuickAddSource) => T;
  onAdd: (line: T) => void;
  onRemove: (index: number) => void;
}

export interface QuickAddLinesState {
  options: QuickAddOption[];
  toggle: (option: QuickAddOption) => void;
  pendingRemoval: QuickAddOption | null;
  confirmRemoval: () => void;
  cancelRemoval: () => void;
}

/**
 * Danh sách thêm nhanh cho các tab dòng của tour: tick một mục thông dụng là thêm dòng
 * ngay (không qua form), bỏ tick là xóa dòng — có hỏi lại nếu dòng đã được chỉnh.
 */
export function useQuickAddLines<T extends QuickAddLine>({
  lineType,
  enabled,
  sources,
  lines,
  buildLine,
  onAdd,
  onRemove,
}: UseQuickAddLinesOptions<T>): QuickAddLinesState {
  const { userProfile } = useAuth();
  const [pendingRemoval, setPendingRemoval] = useState<QuickAddOption | null>(null);

  const { data: frequent = [] } = useQuery({
    queryKey: ['frequentTourLines', lineType, userProfile?.id ?? null],
    queryFn: () => store.listFrequentTourLines(lineType, QUICK_ADD_FETCH_LIMIT),
    enabled,
  });

  const options = useMemo(
    () => (enabled ? buildQuickAddOptions(frequent, sources, lines) : []),
    [enabled, frequent, sources, lines],
  );

  const toggle = (option: QuickAddOption) => {
    if (option.lineIndexes.length === 0) {
      onAdd(buildLine(option.source));
      return;
    }
    if (!canUntickQuickAddOption(option)) return;
    const index = option.lineIndexes[0];
    if (needsQuickAddRemoveConfirm(lines[index], option.source)) setPendingRemoval(option);
    else onRemove(index);
  };

  const confirmRemoval = () => {
    // Tính lại vị trí từ danh sách mới nhất: bảng có thể đã đổi trong lúc hộp thoại mở.
    const current = options.find((option) => option.key === pendingRemoval?.key);
    if (current && canUntickQuickAddOption(current)) onRemove(current.lineIndexes[0]);
    setPendingRemoval(null);
  };

  return { options, toggle, pendingRemoval, confirmRemoval, cancelRemoval: () => setPendingRemoval(null) };
}
