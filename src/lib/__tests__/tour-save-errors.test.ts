import { describe, it, expect } from 'vitest';
import { toTourSaveErrorMessage } from '../tour-save-errors';

describe('toTourSaveErrorMessage', () => {
  it('không báo trùng mã tour khi lỗi 23505 đến từ tour_nationalities', () => {
    const error = new Error(
      'duplicate key value violates unique constraint "tour_nationalities_tour_nationality_unique"'
    );
    const message = toTourSaveErrorMessage(error, 'Cập nhật tour thất bại');
    expect(message).not.toContain('Mã tour');
    expect(message).toContain('quốc tịch');
  });

  it('báo trùng mã tour khi lỗi thật sự về mã tour', () => {
    const error = new Error('A tour with this tour code already exists');
    expect(toTourSaveErrorMessage(error, 'Cập nhật tour thất bại')).toContain('Mã tour này đã tồn tại');
  });

  it('dùng thông báo tiếng Việt chung cho lỗi khác', () => {
    const error = new Error('new row violates row-level security policy for table "tours"');
    expect(toTourSaveErrorMessage(error, 'Cập nhật tour thất bại')).toContain('không có quyền');
  });
});
