import { describe, it, expect } from 'vitest';
import { buildTourImportJson } from '../tour-image-parser';
import { extractVisitCandidates } from '../visit-candidates';
import { inferNationalityFromPhone } from '../ocr-extractors';
import type { AnalyzeResult } from '../ocr-text-utils';

const sampleAnalyzeResult: AnalyzeResult = {
  pages: [{
    lines: [
      { content: 'Code đoàn: TEST-001' },
      { content: 'Số khách: 02 +972543052905' },
      { content: 'Hướng dẫn: Cao Huu Tu' },
      { content: 'Lái xe: Mr Linh' },
      { content: 'Tên khách: LIRON DANIEL' },
    ],
  }],
  tables: [{
    cells: [
      { rowIndex: 0, columnIndex: 0, content: 'Ngày' },
      { rowIndex: 0, columnIndex: 1, content: 'Tham quan' },
      { rowIndex: 1, columnIndex: 0, content: '4/9' },
      { rowIndex: 1, columnIndex: 1, content: 'Tham Đại Nội' },
      { rowIndex: 2, columnIndex: 0, content: '5/9' },
      { rowIndex: 2, columnIndex: 1, content: 'Tham Hội An' },
    ],
  }],
};

const destinations = [
  { name: 'vé_Đại Nội', rawName: 'Imperial City', price: 100000 },
  { name: 'vé_Hội An', rawName: 'Old Town', price: 50000 },
  { name: 'Hải Vân', price: 0 }, // price 0 -> "free", không thêm vào kết quả
];

describe('buildTourImportJson', () => {
  const [result] = buildTourImportJson(sampleAnalyzeResult, destinations, { year: 2025 });
  const { tour, subcollections } = result;

  it('trích xuất thông tin tour chính từ header', () => {
    expect(tour.tourCode).toBe('TEST-001');
    expect(tour.tourGuide).toBe('Cao Huu Tu');
    expect(tour.driverName).toBe('Mr Linh');
    expect(tour.totalGuests).toBe(2);
    expect(tour.adults).toBe(2);
  });

  it('suy luận quốc tịch từ đầu số điện thoại', () => {
    expect(tour.clientPhone).toBe('+972543052905');
    expect(tour.clientNationality).toBe('Israeli (ISR)');
  });

  it('tính ngày bắt đầu/kết thúc theo năm chỉ định', () => {
    expect(tour.startDate).toBe('2025-09-04');
    expect(tour.endDate).toBe('2025-09-05');
    expect(tour.totalDays).toBe(2);
  });

  it('khớp điểm tham quan với DB qua token/fuzzy (lấy tên + giá DB)', () => {
    const byName = new Map(subcollections.destinations.map((d) => [d.name, d.price]));
    expect(byName.get('vé_Đại Nội')).toBe(100000);
    expect(byName.get('vé_Hội An')).toBe(50000);
  });

  it('khớp địa điểm OCR qua rawName của DB để lấy name chuẩn', () => {
    const [rawNameResult] = buildTourImportJson({
      tables: [{
        cells: [
          { rowIndex: 0, columnIndex: 0, content: 'Ngày' },
          { rowIndex: 0, columnIndex: 1, content: 'Tham quan' },
          { rowIndex: 1, columnIndex: 0, content: '4/9' },
          { rowIndex: 1, columnIndex: 1, content: 'Tham Imperial City, Old Town' },
        ],
      }],
    }, destinations, { year: 2025 });

    expect(rawNameResult.subcollections.destinations.map((d) => d.name))
      .toEqual(['vé_Đại Nội', 'vé_Hội An']);
  });
});

describe('extractVisitCandidates', () => {
  it('tách nhiều điểm và lột động từ dẫn nhập', () => {
    expect(extractVisitCandidates('Di Hue, tham Vinh Moc, Hien Luong\nTham Dai Noi, oto Thien Mu'))
      .toEqual(['Hue', 'Vinh Moc', 'Hien Luong', 'Dai Noi', 'Thien Mu']);
  });

  it('giữ điểm chưa có trong DB, bỏ cụm đón/tiễn sân bay và mã chuyến bay', () => {
    expect(extractVisitCandidates('Don sb Dong Hoi VN1591=9.50\nTham Thien Duong'))
      .toEqual(['Thien Duong']);
  });

  it('bỏ cụm đặt dịch vụ (book/HDV) và số điện thoại', () => {
    expect(extractVisitCandidates('Tham NHS, cau Rong. Tham Bana, hầm rượu- GP book voi Mr Loi 0905288977'))
      .toEqual(['NHS', 'cau Rong', 'Bana', 'hầm rượu']);
  });
});

describe('inferNationalityFromPhone', () => {
  it('ưu tiên đầu số dài hơn', () => {
    expect(inferNationalityFromPhone('+972543052905')).toBe('Israeli (ISR)');
    expect(inferNationalityFromPhone('+33123456789')).toBe('French (FRA)');
  });
});
