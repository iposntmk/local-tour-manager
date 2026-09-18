import { describe, it, expect } from 'vitest';
import {
  buildAllowanceRows,
  buildDestinationRows,
  buildShoppingRows,
  toBulkInsertError,
} from '../tour-bulk-insert';

const TOUR_ID = 'tour-1';

describe('tour bulk insert rows', () => {
  it('gắn tour_id và giữ nguyên các cột dòng chi tiết', () => {
    const rows = buildDestinationRows(TOUR_ID, [
      { date: '2026-09-14', name: 'Hội An', price: 120000, guests: 2 },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ tour_id: TOUR_ID, name: 'Hội An', price: 120000, guests: 2 });
  });

  it('mặc định quantity của công tác phí là 1', () => {
    const rows = buildAllowanceRows(TOUR_ID, [{ date: '2026-09-14', name: 'CTP', price: 500000 }]);
    expect(rows[0]).toMatchObject({ tour_id: TOUR_ID, quantity: 1, category_id: null });
  });

  it('map các cột PIT của mua sắm về null khi không có', () => {
    const rows = buildShoppingRows(TOUR_ID, [{ date: '2026-09-14', name: 'Shop', price: 0 }]);
    expect(rows[0]).toMatchObject({ withholds_pit: null, pit_rate: null, pit_amount: null, net_commission: null });
  });

  it('trả về danh sách rỗng khi không có dòng nào', () => {
    expect(buildDestinationRows(TOUR_ID, [])).toEqual([]);
  });

  it('nêu rõ bảng con nào lỗi', () => {
    expect(toBulkInsertError('meal', { code: '23502' }).message).toContain('meal');
    expect(toBulkInsertError('expense', { code: 'XX000', message: 'boom' }).message).toContain('boom');
  });
});
