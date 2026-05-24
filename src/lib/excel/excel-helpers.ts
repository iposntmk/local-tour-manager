import type { Alignment, Row, Worksheet, Workbook } from 'exceljs';
import type { Tour, Allowance } from '@/types/tour';
import { formatDateDisplay, formatDateRangeDisplay } from '@/lib/date-utils';

export const currencyFormat = '#,##0';
export const workbookMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

type ExcelJSType = typeof import('exceljs');
let ExcelJSModule: ExcelJSType | undefined;
export const loadExcelJS = async (): Promise<ExcelJSType> => {
  ExcelJSModule ??= await import('exceljs');
  return ExcelJSModule;
};

export const thinBorder = {
  top: { style: 'thin', color: { argb: 'FF000000' } },
  left: { style: 'thin', color: { argb: 'FF000000' } },
  bottom: { style: 'thin', color: { argb: 'FF000000' } },
  right: { style: 'thin', color: { argb: 'FF000000' } },
} as const;

export const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00B0F0' } } as const;
export const totalsFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } } as const;
export const summaryTitleFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } } as const;
export const infoFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDEDED' } } as const;
export const finalFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBDD7EE' } } as const;

export interface TourSheetBuildResult { sheetName: string; finalTotalCell: string; }
export interface ServiceItem { name: string; baseName?: string; date?: string; price: number; guests?: number; kind: 'dest' | 'exp'; }

export const formatTourNationalities = (tour: Tour) => {
  const nationalities = tour.clientNationalities?.length
    ? tour.clientNationalities
    : tour.clientNationalityRef?.id
      ? [{ ...tour.clientNationalityRef, paxCount: tour.totalGuests ?? tour.adults + tour.children }]
      : [];
  return nationalities
    .map((n) => `${n.nameAtBooking}${n.paxCount ? ` (${n.paxCount}p)` : ''}`)
    .join(', ');
};

export const validateTourNumbers = (tour: Tour): string[] => {
  const issues: string[] = [];
  const isBad = (n: any) => typeof n !== 'number' || Number.isNaN(n) || !Number.isFinite(n);
  (tour.destinations || []).forEach((d, i) => {
    if (isBad(Number(d.price))) issues.push(`Destination #${i + 1} has invalid price.`);
    if (d.guests !== undefined && isBad(Number(d.guests))) issues.push(`Destination #${i + 1} has invalid guests.`);
  });
  (tour.expenses || []).forEach((e, i) => {
    if (isBad(Number(e.price))) issues.push(`Expense #${i + 1} has invalid price.`);
    if (e.guests !== undefined && isBad(Number(e.guests))) issues.push(`Expense #${i + 1} has invalid guests.`);
  });
  (tour.meals || []).forEach((m, i) => {
    if (isBad(Number(m.price))) issues.push(`Meal #${i + 1} has invalid price.`);
    if (m.guests !== undefined && isBad(Number(m.guests))) issues.push(`Meal #${i + 1} has invalid guests.`);
  });
  (tour.allowances || []).forEach((a, i) => {
    if (isBad(Number(a.price))) issues.push(`Allowance #${i + 1} has invalid price.`);
    if (a.quantity !== undefined && isBad(Number(a.quantity))) issues.push(`Allowance #${i + 1} has invalid quantity.`);
  });
  return issues;
};

export const getDuplicateNames = (names: string[]): Set<string> => {
  const seen = new Map<string, number>();
  for (const raw of names) {
    const key = (raw || '').trim().toLowerCase();
    if (!key) continue;
    seen.set(key, (seen.get(key) || 0) + 1);
  }
  const dups = new Set<string>();
  for (const [k, count] of seen) { if (count > 1) dups.add(k); }
  return dups;
};

export const sanitizeSheetName = (name: string) => {
  const cleaned = name.replace(/[\[\]:\\/?*]/g, ' ').trim() || 'Tour';
  return cleaned.length > 31 ? cleaned.slice(0, 31) : cleaned;
};

export const ensureUniqueSheetName = (workbook: Workbook, baseName: string) => {
  const name = sanitizeSheetName(baseName);
  let attempt = 1;
  let uniqueName = name;
  while (workbook.getWorksheet(uniqueName)) {
    const suffix = ` (${attempt})`;
    uniqueName = `${name.slice(0, Math.max(31 - suffix.length, 0))}${suffix}`;
    attempt += 1;
  }
  return uniqueName;
};

export const applyRowBorder = (row: Row, start = 1, end = 13) => {
  for (let col = start; col <= end; col += 1) row.getCell(col).border = thinBorder;
};

export const styleMergedRange = (worksheet: Worksheet, range: string, value: string, options?: { bold?: boolean; alignment?: Alignment }) => {
  worksheet.mergeCells(range);
  const [startAddress, endAddress] = range.split(':');
  const startCell = worksheet.getCell(startAddress);
  const endCell = worksheet.getCell(endAddress ?? startAddress);
  startCell.value = value;
  startCell.alignment = options?.alignment ?? { vertical: 'middle', horizontal: 'left' };
  if (options?.bold) startCell.font = { bold: true };
  for (let row = startCell.row; row <= endCell.row; row += 1) {
    const worksheetRow = worksheet.getRow(Number(row));
    for (let col = startCell.col; col <= endCell.col; col += 1) {
      const cell = worksheetRow.getCell(col);
      cell.fill = infoFill;
      cell.border = thinBorder;
      cell.alignment = options?.alignment ?? { vertical: 'middle', horizontal: 'left' };
    }
  }
};

export const downloadWorkbook = async (workbook: Workbook, filename: string) => {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: workbookMimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
};

export const isTourDraftForExport = (tour: Tour): boolean =>
  tour.settlementStatus !== 'approved' && tour.settlementStatus !== 'closed';

export const formatNgayRangeForExcel = (startDate: string, endDate: string): string => {
  const s = new Date(startDate);
  const e = new Date(endDate);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return '';
  const nowYear = new Date().getFullYear();
  const sameMonthYear = s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth();
  const pad2 = (n: number) => String(n).padStart(2, '0');
  if (!sameMonthYear) {
    const dd1 = pad2(s.getDate()), mm1 = pad2(s.getMonth() + 1);
    const dd2 = pad2(e.getDate()), mm2 = pad2(e.getMonth() + 1);
    const y1 = s.getFullYear(), y2 = e.getFullYear();
    if (y1 !== y2) return `${dd1}/${mm1}/${y1} - ${dd2}/${mm2}/${y2}`;
    if (y1 === nowYear && y2 === nowYear) return `${dd1}/${mm1} - ${dd2}/${mm2}`;
    return `${dd1}/${mm1} - ${dd2}/${mm2}/${y2}`;
  }
  return formatDateRangeDisplay(startDate, endDate);
};

const MERGE_EXPENSE_NAMES = [
  'Nước uống cho khách 15k/1 khách / 1 ngày',
  'Nước uống cho khách 10k/1 khách / 1 ngày',
];

export const buildServiceItems = (tour: Tour): { serviceItems: ServiceItem[]; allowanceItems: Allowance[] } => {
  const serviceItems: ServiceItem[] = [];
  (tour.destinations || []).forEach(d => {
    serviceItems.push({ kind: 'dest', name: `vé ${d.name || ''}`, baseName: d.name || '', date: d.date, price: d.price || 0, guests: typeof d.guests === 'number' ? d.guests : undefined });
  });
  if (tour.expenses && tour.expenses.length > 0) {
    tour.expenses.filter(e => !MERGE_EXPENSE_NAMES.includes(e.name || '')).forEach(e => {
      serviceItems.push({ kind: 'exp', name: e.name || '', date: e.date, price: e.price || 0, guests: e.guests });
    });
    MERGE_EXPENSE_NAMES.forEach(NAME => {
      const mergeList = tour.expenses!.filter(e => (e.name || '') === NAME);
      if (mergeList.length > 0) {
        const sumGuests = mergeList.reduce((sum, e) => sum + (typeof e.guests === 'number' ? e.guests : 0), 0);
        const earliestDate = mergeList.reduce<string | undefined>((min, e) => (!e.date ? min : !min || e.date < min ? e.date : min), undefined);
        serviceItems.push({ kind: 'exp', name: NAME, date: earliestDate, price: mergeList[0].price || 0, guests: sumGuests });
      }
    });
  }
  (tour.meals || []).forEach(m => {
    serviceItems.push({ kind: 'exp', name: m.name || '', date: m.date, price: m.price || 0, guests: typeof m.guests === 'number' ? m.guests : undefined });
  });
  const sortByDate = (a: { date?: string }, b: { date?: string }) => {
    const da = a.date || '', db = b.date || '';
    if (!da && db) return 1; if (da && !db) return -1; if (!da && !db) return 0;
    return da.localeCompare(db);
  };
  serviceItems.sort(sortByDate);
  const allowanceItems: Allowance[] = (tour.allowances || []).slice().sort(sortByDate);
  return { serviceItems, allowanceItems };
};

export function appendSummarySection(
  worksheet: Worksheet,
  totalsRowNumber: number,
  tour: Tour,
  titleStartRow: number,
  applyBorder: (row: Row) => void,
): { finalTotalRowNumber: number; nextRow: number } | null {
  const advancePayment = tour.summary?.advancePayment ?? 0;
  const collectionsForCompany = tour.summary?.collectionsForCompany ?? 0;
  const companyTip = tour.summary?.companyTip ?? 0;
  if (advancePayment === 0 && collectionsForCompany === 0 && companyTip === 0) return null;

  let row = titleStartRow;
  const title = worksheet.getRow(row);
  worksheet.mergeCells(`L${row}:M${row}`);
  title.getCell(12).value = 'TỔNG KẾT';
  title.getCell(12).font = { bold: true };
  title.getCell(12).alignment = { horizontal: 'center', vertical: 'middle' };
  title.getCell(12).fill = summaryTitleFill;
  applyBorder(title);
  row++;

  const addRow = (label: string, formula?: string, value?: number, labelColor?: string): number => {
    const n = row++;
    const r = worksheet.getRow(n);
    r.getCell(12).value = label;
    const font: any = { bold: true };
    if (labelColor) font.color = { argb: labelColor };
    r.getCell(12).font = font;
    r.getCell(12).alignment = { horizontal: 'right', vertical: 'middle' };
    if (formula) r.getCell(13).value = { formula };
    else if (value !== undefined) r.getCell(13).value = value;
    r.getCell(13).numFmt = currencyFormat;
    r.getCell(13).font = { bold: true, size: 12 };
    r.getCell(13).alignment = { horizontal: 'right', vertical: 'middle' };
    applyBorder(r);
    return n;
  };

  const totalTabsN = addRow('Tổng chi phí + công tác phí', `M${totalsRowNumber}`);
  const advanceN = addRow('- Tạm ứng', undefined, advancePayment, 'FFFF0000');
  const afterAdvanceN = addRow('Sau tạm ứng', `M${totalTabsN}-M${advanceN}`);
  const collectionsN = addRow('- Thu của khách', undefined, collectionsForCompany, 'FFFF0000');
  const afterCollectionsN = addRow('Sau thu khách', `M${afterAdvanceN}-M${collectionsN}`);
  const tipN = addRow('+ Tip HDV nhận từ công ty', undefined, companyTip, 'FF0000FF');
  const afterTipN = addRow('Sau tip HDV', `M${afterCollectionsN}+M${tipN}`);
  const finalTotalRowNumber = addRow('TỔNG CỘNG', `M${afterTipN}`);

  return { finalTotalRowNumber, nextRow: row };
}
