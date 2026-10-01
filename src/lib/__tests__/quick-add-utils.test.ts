import { describe, expect, it } from 'vitest';
import {
  applyQuickAddGroupView,
  buildQuickAddOptions,
  canUntickQuickAddOption,
  groupQuickAddOptions,
  needsQuickAddRemoveConfirm,
  quickAddGroupOrderByUsage,
  toCategorizedQuickAddSources,
} from '@/lib/quick-add-utils';

const sources = [
  { name: 'Đại Nội', price: 200000 },
  { name: 'Chùa Thiên Mụ', price: 0 },
  { name: 'Lăng Khải Định', price: 150000 },
];

describe('buildQuickAddOptions', () => {
  it('keeps frequency order and takes price from master data', () => {
    const options = buildQuickAddOptions(
      [{ name: 'Lăng Khải Định', count: 9 }, { name: 'Đại Nội', count: 4 }],
      sources,
      [],
    );
    expect(options.map((o) => [o.source.name, o.source.price, o.count])).toEqual([
      ['Lăng Khải Định', 150000, 9],
      ['Đại Nội', 200000, 4],
    ]);
  });

  it('drops names missing from master data and duplicate rankings', () => {
    const options = buildQuickAddOptions(
      [{ name: 'Đã xoá', count: 9 }, { name: 'Đại Nội', count: 4 }, { name: ' đại nội ', count: 1 }],
      sources,
      [],
    );
    expect(options).toHaveLength(1);
    expect(options[0].count).toBe(4);
  });

  it('matches existing lines ignoring case and surrounding spaces', () => {
    const options = buildQuickAddOptions(
      [{ name: 'Đại Nội', count: 4 }, { name: 'Chùa Thiên Mụ', count: 2 }],
      sources,
      [{ name: 'Khác', price: 1 }, { name: ' ĐẠI NỘI', price: 200000 }, { name: 'đại nội', price: 5 }],
    );
    expect(options[0].lineIndexes).toEqual([1, 2]);
    expect(options[1].lineIndexes).toEqual([]);
  });
});

describe('canUntickQuickAddOption', () => {
  const option = (lineIndexes: number[]) => ({ key: 'k', source: sources[0], count: 1, lineIndexes });

  it('allows untick only when exactly one line matches', () => {
    expect(canUntickQuickAddOption(option([3]))).toBe(true);
    expect(canUntickQuickAddOption(option([1, 2]))).toBe(false);
    expect(canUntickQuickAddOption(option([]))).toBe(false);
  });
});

describe('needsQuickAddRemoveConfirm', () => {
  it('skips confirmation for an untouched line', () => {
    expect(needsQuickAddRemoveConfirm({ name: 'Đại Nội', price: 200000 }, sources[0])).toBe(false);
  });

  it('asks when the price differs from master data', () => {
    expect(needsQuickAddRemoveConfirm({ name: 'Đại Nội', price: 180000 }, sources[0])).toBe(true);
  });

  it('asks when the line has attachments', () => {
    expect(needsQuickAddRemoveConfirm({ name: 'Đại Nội', price: 200000, attachments: [{}] }, sources[0])).toBe(true);
  });
});

describe('groupQuickAddOptions', () => {
  const option = (name: string, group: string | undefined, lineIndexes: number[] = []) => ({
    key: name.toLowerCase(), source: { name, price: 0, group }, count: 1, lineIndexes,
  });
  const order = ['Quảng Nam', 'Đà Nẵng', 'Huế'];

  it('orders groups by the given order, then by name, ungrouped last', () => {
    const groups = groupQuickAddOptions(
      [option('a', 'Huế'), option('b', undefined), option('c', 'Bình Định'), option('d', 'Quảng Nam'), option('e', 'An Giang')],
      order,
    );
    expect(groups.map((g) => g.name)).toEqual(['Quảng Nam', 'Huế', 'An Giang', 'Bình Định', 'Khác']);
  });

  it('keeps frequency order inside a group and counts ticked options', () => {
    const groups = groupQuickAddOptions(
      [option('a', 'Huế', [0]), option('b', 'Huế'), option('c', ' huế ', [1, 2])],
      order,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].options.map((o) => o.source.name)).toEqual(['a', 'b', 'c']);
    expect(groups[0].checkedCount).toBe(2);
  });
});

describe('applyQuickAddGroupView', () => {
  const option = (name: string, lineIndexes: number[] = []) => ({
    key: name, source: { name, price: 0 }, count: 1, lineIndexes,
  });
  const groups = [
    { name: 'Quảng Nam', options: [option('a'), option('b', [0]), option('c', [1])], checkedCount: 2 },
    { name: 'Huế', options: [option('d')], checkedCount: 0 },
  ];

  it('returns groups untouched with the default view', () => {
    expect(applyQuickAddGroupView(groups, { limit: null, hidden: [] })).toEqual(groups);
  });

  it('keeps only the top N options per group and recounts ticked ones', () => {
    const [quangNam, hue] = applyQuickAddGroupView(groups, { limit: 2, hidden: [] });
    expect(quangNam.options.map((o) => o.key)).toEqual(['a', 'b']);
    expect(quangNam.checkedCount).toBe(1);
    expect(hue.options).toHaveLength(1);
  });

  it('removes hidden groups', () => {
    const result = applyQuickAddGroupView(groups, { limit: null, hidden: ['huế'] });
    expect(result.map((g) => g.name)).toEqual(['Quảng Nam']);
  });
});

describe('quickAddGroupOrderByUsage', () => {
  it('lists groups by first appearance, skipping ungrouped and repeats', () => {
    const option = (name: string, group?: string) => ({ key: name, source: { name, price: 0, group }, count: 1, lineIndexes: [] });
    expect(quickAddGroupOrderByUsage([
      option('a', 'Vé'), option('b'), option('c', 'Ăn uống'), option('d', ' vé '),
    ])).toEqual(['Vé', 'Ăn uống']);
  });
});

describe('toCategorizedQuickAddSources', () => {
  it('maps the category to group and categoryId', () => {
    expect(toCategorizedQuickAddSources([
      { name: 'Nước', price: 10000, categoryRef: { id: 'c1', nameAtBooking: 'Chi phí chung' } },
      { name: 'Lẻ', price: 5 },
    ])).toEqual([
      { name: 'Nước', price: 10000, categoryId: 'c1', group: 'Chi phí chung' },
      { name: 'Lẻ', price: 5, categoryId: undefined, group: undefined },
    ]);
  });
});
