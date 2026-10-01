import { Checkbox } from '@/components/ui/checkbox';
import { formatCurrency } from '@/lib/currency-utils';
import { canUntickQuickAddOption } from '@/lib/quick-add-utils';
import type { QuickAddOption } from '@/types/quick-add';

interface QuickAddOptionRowProps {
  option: QuickAddOption;
  onToggle: (option: QuickAddOption) => void;
}

/** Một dòng tick. Cao 44px trên mobile để dễ chạm, gọn lại từ md trở lên. */
export function QuickAddOptionRow({ option, onToggle }: QuickAddOptionRowProps) {
  const checked = option.lineIndexes.length > 0;
  const locked = checked && !canUntickQuickAddOption(option);

  return (
    <label
      className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm active:bg-muted md:min-h-9 md:gap-2 md:py-1 md:hover:bg-muted/50"
      title={locked ? 'Có nhiều dòng trùng tên — xóa trực tiếp ở bảng.' : undefined}
    >
      <Checkbox
        className="h-5 w-5 shrink-0 md:h-4 md:w-4"
        checked={checked}
        disabled={locked}
        onCheckedChange={() => onToggle(option)}
      />
      <span className="line-clamp-2 min-w-0 flex-1 break-words leading-snug">{option.source.name}</span>
      {option.lineIndexes.length > 1 && (
        <span className="shrink-0 text-xs text-muted-foreground">×{option.lineIndexes.length}</span>
      )}
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
        {formatCurrency(option.source.price)}
      </span>
    </label>
  );
}
