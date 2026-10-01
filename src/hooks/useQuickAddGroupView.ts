import { useCallback, useState } from 'react';
import { DEFAULT_QUICK_ADD_GROUP_VIEW, normalizeQuickAddName } from '@/lib/quick-add-utils';
import type { QuickAddGroupView } from '@/types/quick-add';

function readView(storageKey: string, defaultView: QuickAddGroupView): QuickAddGroupView {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (!saved || typeof saved !== 'object') return defaultView;
    return {
      limit: typeof saved.limit === 'number' && saved.limit > 0 ? saved.limit : null,
      hidden: Array.isArray(saved.hidden) ? saved.hidden.filter((name: unknown) => typeof name === 'string') : [],
    };
  } catch {
    return defaultView;
  }
}

/**
 * Tuỳ chọn hiển thị danh sách thêm nhanh (số mục mỗi nhóm, nhóm bị ẩn), nhớ theo trình duyệt.
 * `defaultView` chỉ dùng khi user chưa từng đổi tuỳ chọn.
 */
export function useQuickAddGroupView(storageKey: string, defaultView = DEFAULT_QUICK_ADD_GROUP_VIEW) {
  const [view, setView] = useState<QuickAddGroupView>(() => readView(storageKey, defaultView));

  const update = useCallback((next: QuickAddGroupView) => {
    setView(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Trình duyệt chặn lưu trữ: tuỳ chọn vẫn có hiệu lực trong phiên này.
    }
  }, [storageKey]);

  /** Tick lại đúng số đang chọn thì bỏ giới hạn. */
  const toggleLimit = (limit: number) => update({ ...view, limit: view.limit === limit ? null : limit });

  const toggleGroup = (name: string) => {
    const key = normalizeQuickAddName(name);
    const isHidden = view.hidden.some((item) => normalizeQuickAddName(item) === key);
    update({
      ...view,
      hidden: isHidden ? view.hidden.filter((item) => normalizeQuickAddName(item) !== key) : [...view.hidden, name],
    });
  };

  return { view, toggleLimit, toggleGroup };
}
