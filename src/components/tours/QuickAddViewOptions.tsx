import type { ReactNode } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { QUICK_ADD_GROUP_LIMITS, normalizeQuickAddName } from '@/lib/quick-add-utils';
import type { QuickAddGroup, QuickAddGroupView } from '@/types/quick-add';

interface QuickAddViewOptionsProps {
  groups: QuickAddGroup[];
  groupLabel: string;
  view: QuickAddGroupView;
  onToggleLimit: (limit: number) => void;
  onToggleGroup: (name: string) => void;
}

function OptionCheckbox({ checked, onToggle, children }: { checked: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2 text-sm active:bg-muted md:min-h-8 md:hover:bg-muted/50">
      <Checkbox className="h-5 w-5 md:h-4 md:w-4" checked={checked} onCheckedChange={onToggle} />
      {children}
    </label>
  );
}

/** Bảng tuỳ chọn: số mục thông dụng mỗi nhóm và nhóm nào được hiện. */
export function QuickAddViewOptions({ groups, groupLabel, view, onToggleLimit, onToggleGroup }: QuickAddViewOptionsProps) {
  const hidden = new Set(view.hidden.map(normalizeQuickAddName));

  return (
    <div className="space-y-2 border-b bg-muted/30 px-3 py-2">
      <fieldset>
        <legend className="px-2 text-xs font-medium text-muted-foreground">Số mục mỗi {groupLabel}</legend>
        <div className="grid grid-cols-4 gap-x-1 md:flex md:flex-wrap">
          {QUICK_ADD_GROUP_LIMITS.map((limit) => (
            <OptionCheckbox key={limit} checked={view.limit === limit} onToggle={() => onToggleLimit(limit)}>
              {limit}
            </OptionCheckbox>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="px-2 text-xs font-medium text-muted-foreground">Hiện {groupLabel}</legend>
        <div className="grid grid-cols-2 gap-x-1 md:flex md:flex-wrap">
          {groups.map((group) => (
            <OptionCheckbox
              key={group.name}
              checked={!hidden.has(normalizeQuickAddName(group.name))}
              onToggle={() => onToggleGroup(group.name)}
            >
              <span className="truncate">{group.name}</span>
            </OptionCheckbox>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
