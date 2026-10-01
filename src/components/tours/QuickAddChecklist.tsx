import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { QUICK_ADD_VISIBLE_COUNT, groupQuickAddOptions, quickAddGroupOrderByUsage } from '@/lib/quick-add-utils';
import { TOUR_LINE_LIST_CARD, TOUR_LINE_LIST_HEADER, TOUR_LINE_LIST_TITLE } from '@/lib/tab-styles';
import { QuickAddGroupedList } from '@/components/tours/QuickAddGroupedList';
import { QuickAddOptionRow } from '@/components/tours/QuickAddOptionRow';
import type { QuickAddLinesState } from '@/hooks/useQuickAddLines';
import type { QuickAddGroupView } from '@/types/quick-add';

interface QuickAddChecklistProps {
  title: string;
  quickAdd: QuickAddLinesState;
  /**
   * Có giá trị thì danh sách chia nhóm theo `source.group`: mảng là thứ tự nhóm cố định,
   * `'usage'` là nhóm chứa mục thông dụng hơn đứng trước.
   */
  groupOrder?: string[] | 'usage';
  /** Tên gọi của nhóm trong phần tuỳ chọn hiển thị, vd. "tỉnh". */
  groupLabel?: string;
  /** Khoá lưu tuỳ chọn hiển thị của danh sách chia nhóm. */
  viewStorageKey?: string;
  /** Tuỳ chọn hiển thị ban đầu khi user chưa tự chỉnh. */
  defaultView?: QuickAddGroupView;
}

export function QuickAddChecklist({
  title,
  quickAdd,
  groupOrder,
  groupLabel = 'nhóm',
  viewStorageKey = 'quickAdd.view',
  defaultView,
}: QuickAddChecklistProps) {
  const [expanded, setExpanded] = useState(false);
  const { options, toggle, pendingRemoval, confirmRemoval, cancelRemoval } = quickAdd;
  const groups = useMemo(
    () => {
      if (!groupOrder) return null;
      return groupQuickAddOptions(options, groupOrder === 'usage' ? quickAddGroupOrderByUsage(options) : groupOrder);
    },
    [options, groupOrder],
  );
  if (options.length === 0) return null;

  const visible = expanded ? options : options.slice(0, QUICK_ADD_VISIBLE_COUNT);
  const hiddenCount = options.length - QUICK_ADD_VISIBLE_COUNT;

  return (
    <div className={TOUR_LINE_LIST_CARD}>
      <div className={TOUR_LINE_LIST_HEADER}>
        <h3 className={TOUR_LINE_LIST_TITLE}>{title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">Tick để thêm ngay vào bảng bên dưới.</p>
      </div>

      {groups ? (
        <QuickAddGroupedList
          groups={groups}
          groupLabel={groupLabel}
          storageKey={viewStorageKey}
          defaultView={defaultView}
          onToggle={toggle}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-x-4 p-2 sm:grid-cols-2 md:p-3 lg:grid-cols-3">
            {visible.map((option) => (
              <QuickAddOptionRow key={option.key} option={option} onToggle={toggle} />
            ))}
          </div>
          {hiddenCount > 0 && (
            <div className="border-t px-3 py-2">
              <Button
                type="button"
                variant="ghost"
                className="min-h-11 w-full md:min-h-9 md:w-auto"
                onClick={() => setExpanded((prev) => !prev)}
              >
                {expanded ? 'Thu gọn' : `Xem thêm ${hiddenCount} mục`}
              </Button>
            </div>
          )}
        </>
      )}

      <AlertDialog open={pendingRemoval !== null} onOpenChange={(open) => !open && cancelRemoval()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa dòng "{pendingRemoval?.source.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Dòng này đã có chứng từ hoặc giá khác với danh mục. Xóa sẽ mất các chỉnh sửa đó.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoval}>Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
