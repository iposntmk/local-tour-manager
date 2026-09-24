import { describe, expect, it } from 'vitest';
import {
  buildAttachmentDisplayName,
  buildAttachmentFileLabels,
  formatDateForFileName,
} from '@/lib/attachment-label';

describe('formatDateForFileName', () => {
  it('đổi YYYY-MM-DD sang DD-MM-YYYY', () => {
    expect(formatDateForFileName('2026-06-12')).toBe('12-06-2026');
  });

  it('trả rỗng khi không có ngày hoặc ngày sai định dạng', () => {
    expect(formatDateForFileName()).toBe('');
    expect(formatDateForFileName('khong-phai-ngay')).toBe('');
  });
});

describe('buildAttachmentDisplayName', () => {
  it('ghép tên dòng + ngày + số lượng và giữ phần mở rộng', () => {
    expect(
      buildAttachmentDisplayName({
        lineName: 'Chùa Cầu',
        lineDate: '2026-06-12',
        quantity: 10,
        originalFileName: 'IMG_0023.JPG',
      }),
    ).toBe('Chùa Cầu - 12-06-2026 - 10 pax.jpg');
  });

  it('bỏ qua phần thiếu thay vì để dấu phân cách rỗng', () => {
    expect(
      buildAttachmentDisplayName({ lineName: 'Ăn trưa', originalFileName: 'bill.pdf' }),
    ).toBe('Ăn trưa.pdf');
  });

  it('loại ký tự không hợp lệ trong tên file', () => {
    expect(
      buildAttachmentDisplayName({ lineName: 'Vé  Bà Nà/Hills', originalFileName: 'a.png' }),
    ).toBe('Vé Bà Nà Hills.png');
  });

  it('thêm số thứ tự khi một dòng có nhiều file', () => {
    expect(
      buildAttachmentDisplayName({
        lineName: 'Nước uống',
        lineDate: '2026-01-05',
        quantity: 24,
        originalFileName: 'a.png',
        index: 2,
        total: 3,
      }),
    ).toBe('Nước uống - 05-01-2026 - 24 pax (2).png');
  });

  it('dùng tên file gốc khi dòng không có dữ liệu nào', () => {
    expect(buildAttachmentDisplayName({ originalFileName: 'scan.pdf' })).toBe('scan.pdf');
    expect(buildAttachmentDisplayName({})).toBe('chung-tu');
  });
});

describe('buildAttachmentFileLabels', () => {
  it('trả undefined khi dòng không có chứng từ', () => {
    expect(buildAttachmentFileLabels(undefined, { lineName: 'X' })).toBeUndefined();
    expect(buildAttachmentFileLabels([], { lineName: 'X' })).toBeUndefined();
  });

  it('giữ filePath gốc và gắn displayName cho từng file', () => {
    const labels = buildAttachmentFileLabels(
      [
        { fileName: 'a.jpg', filePath: 'tour/dest/1/a.jpg' },
        { fileName: 'b.pdf', filePath: 'tour/dest/1/b.pdf' },
      ],
      { lineName: 'Ngũ Hành Sơn', lineDate: '2026-03-08', quantity: 4 },
    );
    expect(labels).toEqual([
      {
        fileName: 'a.jpg',
        filePath: 'tour/dest/1/a.jpg',
        displayName: 'Ngũ Hành Sơn - 08-03-2026 - 4 pax (1).jpg',
      },
      {
        fileName: 'b.pdf',
        filePath: 'tour/dest/1/b.pdf',
        displayName: 'Ngũ Hành Sơn - 08-03-2026 - 4 pax (2).pdf',
      },
    ]);
  });
});
