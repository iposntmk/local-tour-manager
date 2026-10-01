import { useMemo, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { applyQuickAddGroupView } from '@/lib/quick-add-utils';
import { useQuickAddGroupView } from '@/hooks/useQuickAddGroupView';
import { QuickAddOptionRow } from '@/components/tours/QuickAddOptionRow';
import { QuickAddViewOptions } from '@/components/tours/QuickAddViewOptions';
import type { QuickAddGroup, QuickAddGroupView, QuickAddOption } from '@/types/quick-add';

interface QuickAddGroupedListProps {
  groups: QuickAddGroup[];
  groupLabel: string;
  /** Khoá lưu tuỳ chọn hiển thị (số mục mỗi nhóm, nhóm bị ẩn). */
  storageKey: string;
  defaultView?: QuickAddGroupView;
  onToggle: (option: QuickAddOption) => void;
}

/**
 * Mobile: thanh chip nhóm cuộn ngang, mỗi lần chỉ hiện một nhóm để danh sách không quá dài.
 * Từ md: mọi nhóm hiện cạnh nhau thành cột, theo thứ tự trái → phải.
 */
export function QuickAddGroupedList({ groups, groupLabel, storageKey, defaultView, onToggle }: QuickAddGroupedListProps) {
  const [activeName, setActiveName] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const { view, toggleLimit, toggleGroup } = useQuickAddGroupView(storageKey, defaultView);
  const visibleGroups = useMemo(() => applyQuickAddGroupView(groups, view), [groups, view]);
  const active = visibleGroups.find((group) => group.name === activeName) || visibleGroups[0];
  const customized = view.limit !== null || view.hidden.length > 0;

  return (
    <>
      <div className="flex items-center gap-2 border-b py-2 pl-3 pr-2">
        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto md:hidden" role="tablist">
          {visibleGroups.map((group) => {
            const selected = group.name === active?.name;
            return (
              <button
                key={group.name}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveName(group.name)}
                className={cn(
                  'flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-sm',
                  selected ? 'border-primary bg-primary text-primary-foreground' : 'bg-background text-foreground',
                )}
              >
                {group.name}
                <span className={cn('text-xs tabular-nums', selected ? 'opacity-90' : 'text-muted-foreground')}>
                  {group.checkedCount}/{group.options.length}
                </span>
              </button>
            );
          })}
        </div>
        <Button
          type="button"
          variant={customized ? 'secondary' : 'ghost'}
          size="sm"
          className="h-9 shrink-0 md:ml-auto"
          aria-expanded={showOptions}
          onClick={() => setShowOptions((prev) => !prev)}
        >
          <SlidersHorizontal className="h-4 w-4 md:mr-2" />
          <span className="sr-only md:not-sr-only">Tuỳ chọn hiển thị</span>
        </Button>
      </div>

      {showOptions && (
        <QuickAddViewOptions
          groups={groups}
          groupLabel={groupLabel}
          view={view}
          onToggleLimit={toggleLimit}
          onToggleGroup={toggleGroup}
        />
      )}

      {visibleGroups.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">Đã ẩn hết các {groupLabel}. Mở tuỳ chọn hiển thị để bật lại.</p>
      ) : (
        <div className="p-2 md:grid md:grid-cols-3 md:gap-x-3 md:gap-y-4 md:p-3 lg:grid-cols-5">
          {visibleGroups.map((group) => (
            <section
              key={group.name}
              className={cn('min-w-0 md:block', group.name === active?.name ? 'block' : 'hidden')}
            >
              <h4 className="mb-1 hidden border-b px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:block">
                {group.name}
              </h4>
              {group.options.map((option) => (
                <QuickAddOptionRow key={option.key} option={option} onToggle={onToggle} />
              ))}
            </section>
          ))}
        </div>
      )}
    </>
  );
}
