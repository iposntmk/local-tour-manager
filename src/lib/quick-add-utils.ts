import type {
  FrequentTourLine,
  QuickAddGroup,
  QuickAddGroupView,
  QuickAddLine,
  QuickAddOption,
  QuickAddSource,
} from '@/types/quick-add';

export const QUICK_ADD_VISIBLE_COUNT = 12;
export const QUICK_ADD_FETCH_LIMIT = 60;
export const QUICK_ADD_UNGROUPED_LABEL = 'Khác';
export const QUICK_ADD_GROUP_LIMITS = [2, 3, 5, 10];
export const DEFAULT_QUICK_ADD_GROUP_VIEW: QuickAddGroupView = { limit: null, hidden: [] };

export const normalizeQuickAddName = (name: string | null | undefined) => (name || '').trim().toLowerCase();

/**
 * Ghép bảng xếp hạng tần suất với master data của tab: giữ thứ tự tần suất, lấy giá
 * từ master, bỏ tên không còn trong master và đánh dấu dòng đã có trong bảng.
 */
export function buildQuickAddOptions(
  frequent: FrequentTourLine[],
  sources: QuickAddSource[],
  lines: QuickAddLine[],
): QuickAddOption[] {
  const sourceByName = new Map<string, QuickAddSource>();
  sources.forEach((source) => {
    const key = normalizeQuickAddName(source.name);
    if (key && !sourceByName.has(key)) sourceByName.set(key, source);
  });

  const indexesByName = new Map<string, number[]>();
  lines.forEach((line, index) => {
    const key = normalizeQuickAddName(line.name);
    if (!key) return;
    indexesByName.set(key, [...(indexesByName.get(key) || []), index]);
  });

  const seen = new Set<string>();
  const options: QuickAddOption[] = [];
  frequent.forEach((item) => {
    const key = normalizeQuickAddName(item.name);
    const source = sourceByName.get(key);
    if (!source || seen.has(key)) return;
    seen.add(key);
    options.push({ key, source, count: item.count, lineIndexes: indexesByName.get(key) || [] });
  });
  return options;
}

/** Bỏ tick chỉ xóa được khi đúng một dòng trùng tên; nhiều dòng thì phải xóa ở bảng. */
export const canUntickQuickAddOption = (option: QuickAddOption) => option.lineIndexes.length === 1;

/** Dòng đã có chứng từ hoặc đã sửa giá khác master thì phải hỏi trước khi xóa. */
export function needsQuickAddRemoveConfirm(line: QuickAddLine | undefined, source: QuickAddSource): boolean {
  if (!line) return false;
  return (line.attachments?.length || 0) > 0 || line.price !== source.price;
}

/**
 * Chia lựa chọn theo nhóm, giữ thứ tự tần suất trong từng nhóm. Nhóm có trong `groupOrder`
 * đứng trước theo đúng thứ tự đó, các nhóm còn lại xếp theo tên, mục không có nhóm xếp cuối.
 */
export function groupQuickAddOptions(options: QuickAddOption[], groupOrder: string[]): QuickAddGroup[] {
  const rankByName = new Map(groupOrder.map((name, index) => [normalizeQuickAddName(name), index]));
  const groups = new Map<string, QuickAddGroup>();
  options.forEach((option) => {
    const name = option.source.group?.trim() || QUICK_ADD_UNGROUPED_LABEL;
    const key = normalizeQuickAddName(name);
    const group = groups.get(key) || { name, options: [], checkedCount: 0 };
    group.options.push(option);
    if (option.lineIndexes.length > 0) group.checkedCount += 1;
    groups.set(key, group);
  });

  const rank = (group: QuickAddGroup) => {
    if (group.name === QUICK_ADD_UNGROUPED_LABEL) return Number.POSITIVE_INFINITY;
    return rankByName.get(normalizeQuickAddName(group.name)) ?? groupOrder.length;
  };
  return Array.from(groups.values()).sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, 'vi'));
}

/** Áp tuỳ chọn hiển thị: bỏ nhóm bị ẩn và chỉ giữ `limit` mục thông dụng nhất mỗi nhóm. */
export function applyQuickAddGroupView(groups: QuickAddGroup[], view: QuickAddGroupView): QuickAddGroup[] {
  const hidden = new Set(view.hidden.map(normalizeQuickAddName));
  return groups
    .filter((group) => !hidden.has(normalizeQuickAddName(group.name)))
    .map((group) => {
      if (view.limit === null || group.options.length <= view.limit) return group;
      const options = group.options.slice(0, view.limit);
      return { ...group, options, checkedCount: options.filter((o) => o.lineIndexes.length > 0).length };
    });
}

/** Thứ tự nhóm theo mức dùng: nhóm chứa mục thông dụng hơn đứng trước. */
export function quickAddGroupOrderByUsage(options: QuickAddOption[]): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  options.forEach((option) => {
    const name = option.source.group?.trim();
    const key = normalizeQuickAddName(name);
    if (!name || seen.has(key)) return;
    seen.add(key);
    order.push(name);
  });
  return order;
}

interface CategorizedMasterItem {
  name: string;
  price: number;
  categoryRef?: { id?: string; nameAtBooking?: string } | null;
}

/** Chi phí chi tiết → nguồn thêm nhanh, nhóm theo hạng mục chi phí. */
export function toCategorizedQuickAddSources(items: CategorizedMasterItem[]): QuickAddSource[] {
  return items.map((item) => ({
    name: item.name,
    price: item.price,
    categoryId: item.categoryRef?.id,
    group: item.categoryRef?.nameAtBooking,
  }));
}
