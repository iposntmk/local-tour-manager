import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/datastore', () => ({ store: {} }));

import { getAttachmentCellValues, getAttachmentLastCol } from '../excel-attachments';
import type { Tour } from '@/types/tour';
import type { ServiceItem } from '../excel-helpers';

const file = (n: number) => ({ fileName: `f${n}.jpg`, filePath: `path/${n}`, displayName: `Chua Cau (${n}).jpg` });
const service = (count: number) =>
  ({ attachmentFiles: Array.from({ length: count }, (_, i) => file(i + 1)) }) as ServiceItem;
const urls = { 'path/1': 'https://x/1', 'path/2': 'https://x/2' };

describe('getAttachmentCellValues', () => {
  it('returns a single 0 when the line has no attachments', () => {
    expect(getAttachmentCellValues({} as ServiceItem, urls)).toEqual([0]);
  });

  it('returns one clickable hyperlink per attachment', () => {
    expect(getAttachmentCellValues(service(2), urls)).toEqual([
      { text: 'Chua Cau (1).jpg', hyperlink: 'https://x/1' },
      { text: 'Chua Cau (2).jpg', hyperlink: 'https://x/2' },
    ]);
  });

  it('falls back to the display name when a link is missing', () => {
    expect(getAttachmentCellValues(service(2), { 'path/1': 'https://x/1' })).toEqual([
      { text: 'Chua Cau (1).jpg', hyperlink: 'https://x/1' },
      'Chua Cau (2).jpg',
    ]);
  });
});

describe('getAttachmentLastCol', () => {
  const line = (count: number) => ({ attachments: Array.from({ length: count }, () => ({})) });

  it('stays at column Q (17) when no line has more than one attachment', () => {
    expect(getAttachmentLastCol([{ destinations: [line(1)], expenses: [], meals: [line(0)] } as unknown as Tour])).toBe(17);
  });

  it('adds one column per extra attachment on the busiest line', () => {
    expect(getAttachmentLastCol([{ destinations: [line(1)], expenses: [line(3)], meals: [line(2)] } as unknown as Tour])).toBe(19);
  });
});

describe('buildTourWorksheet attachment columns', () => {
  it('writes each attachment of a line into its own hyperlink cell, left to right', async () => {
    const ExcelJS = (await import('exceljs')).default;
    const { buildTourWorksheet } = await import('../excel-worksheet');
    const attachment = (n: number) => ({ fileName: `f${n}.jpg`, filePath: `path/${n}` });
    const tour = {
      tourCode: 'T1', startDate: '2026-06-12', endDate: '2026-06-12', adults: 2, children: 0, totalGuests: 2,
      destinations: [{ name: 'Chua Cau', date: '2026-06-12', price: 100, attachments: [attachment(1), attachment(2)] }],
      expenses: [], meals: [], allowances: [],
    } as unknown as Tour;

    const worksheet = new ExcelJS.Workbook();
    buildTourWorksheet(worksheet, tour, urls);
    const sheet = worksheet.worksheets[0];

    expect(sheet.getCell('Q3').value).toMatchObject({ hyperlink: 'https://x/1' });
    expect(sheet.getCell('R3').value).toMatchObject({ hyperlink: 'https://x/2' });
    expect(sheet.getCell('R2').value).toBe('Chứng từ/ảnh 2');
    expect(sheet.getCell('R1').master.address).toBe('N1');
  });
});
