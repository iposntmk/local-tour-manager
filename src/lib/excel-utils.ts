import type { Alignment, Fill, Row, Worksheet, Workbook } from 'exceljs';
import type { Tour } from '@/types/tour';
import { formatDateDisplay, formatDateRangeDisplay } from '@/lib/date-utils';

const currencyFormat = '#,##0';
const workbookMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

type ExcelJSType = typeof import('exceljs');

let ExcelJSModule: ExcelJSType | undefined;

const loadExcelJS = async (): Promise<ExcelJSType> => {
  ExcelJSModule ??= await import('exceljs');
  return ExcelJSModule;
};

const thinBorder = {
  top: { style: 'thin', color: { argb: 'FF000000' } },
  left: { style: 'thin', color: { argb: 'FF000000' } },
  bottom: { style: 'thin', color: { argb: 'FF000000' } },
  right: { style: 'thin', color: { argb: 'FF000000' } },
} as const;

// Màu theo mẫu ImageTourExport.png
const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00B0F0' } } as const; // Blue header
const totalsFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } } as const; // Yellow totals
const summaryTitleFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } } as const; // Yellow
const summaryInputFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } } as const; // Yellow
const infoFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDEDED' } } as const;
const finalFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBDD7EE' } } as const;

interface TourSheetBuildResult {
  sheetName: string;
  finalTotalCell: string;
}

// Use shared date display helpers across the app

const sanitizeSheetName = (name: string) => {
  const invalidChars = /[\[\]:\\/?*]/g;
  const cleaned = name.replace(invalidChars, ' ').trim() || 'Tour';
  return cleaned.length > 31 ? cleaned.slice(0, 31) : cleaned;
};

const ensureUniqueSheetName = (workbook: Workbook, baseName: string) => {
  const name = sanitizeSheetName(baseName);
  let attempt = 1;
  let uniqueName = name;
  while (workbook.getWorksheet(uniqueName)) {
    const suffix = ` (${attempt})`;
    const maxLength = 31 - suffix.length;
    uniqueName = `${name.slice(0, Math.max(maxLength, 0))}${suffix}`;
    attempt += 1;
  }
  return uniqueName;
};

const applyRowBorder = (row: Row, start = 1, end = 13) => {
  for (let col = start; col <= end; col += 1) {
    row.getCell(col).border = thinBorder;
  }
};

const styleMergedRange = (worksheet: Worksheet, range: string, value: string, options?: {
  bold?: boolean;
  alignment?: Alignment;
}) => {
  worksheet.mergeCells(range);
  const [startAddress, endAddress] = range.split(':');
  const startCell = worksheet.getCell(startAddress);
  const endCell = worksheet.getCell(endAddress ?? startAddress);
  startCell.value = value;
  startCell.alignment = options?.alignment ?? { vertical: 'middle', horizontal: 'left' };
  if (options?.bold) {
    startCell.font = { bold: true };
  }

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

// (Removed auto-fit; we configure page setup to fit on one printed page.)

const downloadWorkbook = async (workbook: Workbook, filename: string) => {
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

const buildTourWorksheet = (workbook: Workbook, tour: Tour): TourSheetBuildResult => {
  const sheetName = ensureUniqueSheetName(workbook, tour.tourCode || 'Tour');
  const worksheet = workbook.addWorksheet(sheetName);

  worksheet.properties.defaultRowHeight = 20;
  worksheet.columns = [
    { key: 'code', width: 14 },           // A - code
    { key: 'date', width: 10 },           // B - ngày (tour range)
    { key: 'service', width: 24 },        // C - vé + ăn + uống + chi phí
    { key: 'serviceDate', width: 8 },     // D - ngày (dịch vụ) smaller
    { key: 'price', width: 12 },          // E - giá vé/đơn giá
    { key: 'quantity', width: 10 },       // F - số khách
    { key: 'total', width: 12 },          // G - thành tiền
    { key: 'location', width: 22 },       // H - Địa điểm/tỉnh
    { key: 'locationDate', width: 8 },    // I - ngày (Địa điểm/tỉnh) smaller
    { key: 'days', width: 8 },            // J - số ngày smaller
    { key: 'ctp', width: 8 },             // K - CTP smaller
    { key: 'ctpTotal', width: 10 },       // L - thành tiền (CTP) smaller
    { key: 'tourTotal', width: 14 },      // M - Tổng tour
  ];

  // Row 1: Header row 1 theo mẫu ImageTourExport.png
  const header1Row = worksheet.getRow(1);
  header1Row.height = 40; // higher header

  // Merge cells cho header row 1 theo mẫu
  worksheet.mergeCells('A1:B1');  // code + ngày
  worksheet.mergeCells('C1:G1');  // vé + ăn + uống + chi phí + ngày DV
  worksheet.mergeCells('H1:L1');  // Công tác phí (CTP) + ngủ
  // M1 không merge

  const h1Cells = [
    { cell: 'A1', value: 'code', fill: headerFill },
    { cell: 'C1', value: 'vé + ăn + uống + chi phí', fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF00B050' } } }, // Green
    { cell: 'H1', value: 'Công tác phí (CTP) + ngủ', fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF00B050' } } }, // Green
    { cell: 'M1', value: 'Tổng tour', fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFFC000' } } }, // Orange
  ];

  h1Cells.forEach(({ cell, value, fill }) => {
    const c = worksheet.getCell(cell);
    c.value = value;
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = fill;
    c.border = thinBorder;
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });

  // Apply border to all cells in row 1
  for (let col = 1; col <= 13; col++) {
    header1Row.getCell(col).border = thinBorder;
  }

  // Row 2: Header row 2 theo mẫu ImageTourExport.png
  const headerRow = worksheet.getRow(2);
  const headers = [
    'code',                    // A
    'ngày',                    // B (tour range)
    'vé/ăn/uống/chi phí',      // C
    'ngày',                    // D (dịch vụ)
    'giá vé/đơn giá',          // E
    'số khách/ số ngày/ tổng số chai nước uống',       // F
    'thành tiền',              // G
    'Địa điểm/tỉnh',           // H
    'ngày',                    // I (Địa điểm/tỉnh)
    'số ngày',                 // J
    'CTP',                     // K
    'thành tiền',              // L
    '',                        // M (empty for Tổng tour)
  ];

  headers.forEach((header, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = header;
    cell.font = { bold: true };
    cell.fill = headerFill;
    cell.border = thinBorder;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });

  headerRow.height = 40; // higher header

  worksheet.views = [{ state: 'frozen', ySplit: 2 }]; // Freeze first 2 rows

  const totalGuests = tour.totalGuests || tour.adults + tour.children;
  const dataStartRow = 3; // Bắt đầu từ row 3

  // Helper function để thêm border cho tất cả 13 cột (A-M)
  const applyRowBorderAll = (row: Row) => {
    for (let col = 1; col <= 13; col += 1) {
      row.getCell(col).border = thinBorder;
    }
  };

  let firstDataRow = true;

  const setCodeAndDateCells = (row: Row) => {
    if (!firstDataRow) return;
    row.getCell(1).value = `${tour.tourCode} x ${totalGuests} pax`;
    row.getCell(2).value = `${formatDateRangeDisplay(tour.startDate, tour.endDate)}`;
    firstDataRow = false;
  };

  const allowances = tour.allowances || [];

  const serviceItems: { name: string; date?: string; price: number; guests?: number; kind: 'dest'|'exp' }[] = [];
    if (tour.destinations && tour.destinations.length > 0) {
      tour.destinations.forEach(d => {
        serviceItems.push({ kind: 'dest', name: `vé ${d.name || ''}`, date: d.date, price: d.price || 0, guests: typeof d.guests === 'number' ? d.guests : undefined });
      });
    }
    if (tour.expenses && tour.expenses.length > 0) {
      const MERGE_NAMES = [
        'Nước uống cho khách 15k/1 khách / 1 ngày',
        'Nước uống cho khách 10k/1 khách / 1 ngày',
      ];
      const otherList = tour.expenses.filter(e => !MERGE_NAMES.includes(e.name || ''));
      otherList.forEach(e => {
        serviceItems.push({ kind: 'exp', name: e.name || '', date: e.date, price: e.price || 0, guests: e.guests });
      });
      MERGE_NAMES.forEach(NAME => {
        const mergeList = tour.expenses.filter(e => (e.name || '') === NAME);
        if (mergeList.length > 0) {
          const sumGuests = mergeList.reduce((sum, e) => sum + (typeof e.guests === 'number' ? e.guests : 0), 0);
          const unitPrice = mergeList[0].price || 0;
          const earliestDate = mergeList.reduce<string | undefined>((min, e) => {
            if (!e.date) return min;
            if (!min) return e.date;
            return e.date < min ? e.date : min;
          }, undefined);
          serviceItems.push({ kind: 'exp', name: NAME, date: earliestDate, price: unitPrice, guests: sumGuests });
        }
      });
    }
    if (tour.meals && tour.meals.length > 0) {
      tour.meals.forEach(m => {
        // treat meals as expenses group for ordering
        serviceItems.push({ kind: 'exp', name: m.name || '', date: m.date, price: m.price || 0, guests: typeof m.guests === 'number' ? m.guests : undefined });
      });
    }
    // Sort services: destinations first, then expenses; within group by name
    serviceItems.sort((a, b) => {
      const ra = a.kind === 'dest' ? 0 : 1;
      const rb = b.kind === 'dest' ? 0 : 1;
      if (ra !== rb) return ra - rb;
      const na = (a.name || '').localeCompare(b.name || '');
      return na;
    });

  // Do not group allowances — list each entry, sort by name
  const allowanceItems = allowances
    .slice()
    .sort((a, b) => {
      const n = (a.name || '').localeCompare(b.name || '');
      return n;
    })
    .map(a => ({ name: a.name || '', date: a.date || '', price: a.price || 0 }));
  const dataRowCount = Math.max(serviceItems.length, allowanceItems.length);
  let lastDataRow = dataStartRow - 1;

  for (let index = 0; index < dataRowCount; index += 1) {
    const rowNumber = dataStartRow + index;
    const row = worksheet.getRow(rowNumber);

    setCodeAndDateCells(row);

    const service = serviceItems[index];
    const allowance = allowanceItems[index];

    if (service) {
      row.getCell(3).value = service.name;
      row.getCell(3).alignment = { wrapText: true, vertical: 'middle' };

      row.getCell(4).value = service.date ? formatDateDisplay(service.date) : '';

      row.getCell(5).value = service.price;
      row.getCell(5).numFmt = currencyFormat;

      // Follow single-tour logic: only take guests from row field; leave blank if not provided
      row.getCell(6).value = (service.guests !== undefined ? service.guests : '');
      row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };

      row.getCell(7).value = { formula: `E${rowNumber}*F${rowNumber}` };
      row.getCell(7).numFmt = currencyFormat;
    }

    if (allowance) {
      row.getCell(8).value = allowance.name;
      row.getCell(8).alignment = { vertical: 'middle', horizontal: 'left' };

      row.getCell(9).value = allowance.date ? formatDateDisplay(allowance.date) : '';

      // Days = 1 per allowance row
      row.getCell(10).value = 1;
      row.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' };

      // Price per row
      row.getCell(11).value = allowance.price;
      row.getCell(11).numFmt = currencyFormat;

      // Column L: Use formula J * K
      row.getCell(12).value = { formula: `J${rowNumber}*K${rowNumber}` };
      row.getCell(12).numFmt = currencyFormat;
    }

    // Don't show total in column K for data rows (only from totals row onwards)

    applyRowBorderAll(row);
    lastDataRow = rowNumber;
  }

  const dataEndRow = lastDataRow;
  const totalsRowIndex = dataEndRow >= dataStartRow ? dataEndRow + 1 : dataStartRow;
  const totalsRow = worksheet.getRow(totalsRowIndex);
  let currentRow = totalsRowIndex + 1;

  // Row tổng cộng với background vàng theo mẫu

  // Merge C-E cho "dịch vụ"
  worksheet.mergeCells(`C${totalsRow.number}:F${totalsRow.number}`);
  totalsRow.getCell(3).value = 'dịch vụ';
  totalsRow.getCell(3).font = { bold: true };
  totalsRow.getCell(3).fill = totalsFill;
  totalsRow.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };

  // A-B: Empty with yellow fill
  totalsRow.getCell(1).fill = totalsFill;
  totalsRow.getCell(2).fill = totalsFill;

  // G: Tổng thành tiền (vé + ăn + uống + chi phí)
  if (dataEndRow >= dataStartRow) {
    totalsRow.getCell(7).value = { formula: `SUM(G${dataStartRow}:G${dataEndRow})` };
  } else {
    totalsRow.getCell(7).value = 0;
  }
  totalsRow.getCell(7).numFmt = currencyFormat;
  totalsRow.getCell(7).font = { bold: true, size: 12 };
  totalsRow.getCell(7).fill = totalsFill;

  // H: công tác phí label (same row as dịch vụ)
  totalsRow.getCell(8).value = 'công tác phí';
  totalsRow.getCell(8).font = { bold: true, size: 12 };
  totalsRow.getCell(8).fill = totalsFill;
  totalsRow.getCell(8).alignment = { horizontal: 'left', vertical: 'middle' };
  // Style the "dịch vụ" label more prominently as well
  totalsRow.getCell(3).font = { bold: true, size: 12 };
  // Slightly taller row for emphasis
  totalsRow.height = 22;

  // I-K: Empty with yellow fill
  totalsRow.getCell(9).fill = totalsFill;
  totalsRow.getCell(10).fill = totalsFill;
  totalsRow.getCell(11).fill = totalsFill;

  // L: Tổng CTP
  if (dataEndRow >= dataStartRow) {
    totalsRow.getCell(12).value = { formula: `SUM(L${dataStartRow}:L${dataEndRow})` };
  } else {
    totalsRow.getCell(12).value = 0;
  }
  totalsRow.getCell(12).numFmt = currencyFormat;
  totalsRow.getCell(12).font = { bold: true, size: 12 };
  totalsRow.getCell(12).fill = totalsFill;

  // M: Tổng tour (G + L)
  totalsRow.getCell(13).value = { formula: `G${totalsRow.number}+L${totalsRow.number}` };
  totalsRow.getCell(13).numFmt = currencyFormat;
  totalsRow.getCell(13).font = { bold: true, size: 12 };
  totalsRow.getCell(13).fill = totalsFill;

  applyRowBorderAll(totalsRow);

  // Check if TỔNG KẾT section should be displayed
  const advancePayment = tour.summary?.advancePayment ?? 0;
  const collectionsForCompany = tour.summary?.collectionsForCompany ?? 0;
  const companyTip = tour.summary?.companyTip ?? 0;
  const showSummary = advancePayment !== 0 || collectionsForCompany !== 0 || companyTip !== 0;

  let finalTotalRow: Row;

  if (showSummary) {
    // TỔNG KẾT section theo mẫu
    currentRow++; // Empty row

    // Row: TỔNG KẾT title
    const summaryTitleRow = worksheet.getRow(currentRow);
    currentRow++;

    worksheet.mergeCells(`L${summaryTitleRow.number}:M${summaryTitleRow.number}`);
    summaryTitleRow.getCell(12).value = 'TỔNG KẾT';
    summaryTitleRow.getCell(12).font = { bold: true };
    summaryTitleRow.getCell(12).alignment = { horizontal: 'center', vertical: 'middle' };
    summaryTitleRow.getCell(12).fill = summaryTitleFill;

    applyRowBorder(summaryTitleRow);

    // Helper function for summary rows
    const summaryLabelColumn = 12; // Column L
    const summaryValueColumn = 13; // Column M
    const summaryValueColumnLetter = 'M';

    const addSummaryRow = (label: string, formula?: string, value?: number, labelColor?: string) => {
      const row = worksheet.getRow(currentRow);
      currentRow++;

      // J: Label (right aligned)
      row.getCell(summaryLabelColumn).value = label;
      const labelFont: any = { bold: true };
      if (labelColor) {
        labelFont.color = { argb: labelColor };
      }
      row.getCell(summaryLabelColumn).font = labelFont;
      row.getCell(summaryLabelColumn).alignment = { horizontal: 'right', vertical: 'middle' };

      // K: Value/formula (right aligned)
      if (formula) {
        row.getCell(summaryValueColumn).value = { formula };
      } else if (value !== undefined) {
        row.getCell(summaryValueColumn).value = value;
      }
      row.getCell(summaryValueColumn).numFmt = currencyFormat;
      row.getCell(summaryValueColumn).font = { bold: true, size: 12 };
      row.getCell(summaryValueColumn).alignment = { horizontal: 'right', vertical: 'middle' };

      // Apply borders
      applyRowBorderAll(row);

      return row;
    };

    // Row: Tổng chi phí + công tác phí
    const totalTabsRow = addSummaryRow('Tổng chi phí + công tác phí', `M${totalsRow.number}`);

    // Row: Tạm ứng (red color with - sign)
    const advanceRow = addSummaryRow('- Tạm ứng', undefined, advancePayment, 'FFFF0000');

    // Row: Sau tạm ứng
    const afterAdvanceRow = addSummaryRow(
      'Sau tạm ứng',
      `${summaryValueColumnLetter}${totalTabsRow.number}-${summaryValueColumnLetter}${advanceRow.number}`,
    );

    // Row: Thu của khách (red color with - sign)
    const collectionsRow = addSummaryRow('- Thu của khách', undefined, collectionsForCompany, 'FFFF0000');

    // Row: Sau thu khách
    const afterCollectionsRow = addSummaryRow(
      'Sau thu khách',
      `${summaryValueColumnLetter}${afterAdvanceRow.number}-${summaryValueColumnLetter}${collectionsRow.number}`,
    );

    // Row: Tip HDV nhận từ công ty (blue color with + sign)
    const tipRow = addSummaryRow('+ Tip HDV nhận từ công ty', undefined, companyTip, 'FF0000FF');

    // Row: Sau tip HDV
    const afterTipRow = addSummaryRow(
      'Sau tip HDV',
      `${summaryValueColumnLetter}${afterCollectionsRow.number}+${summaryValueColumnLetter}${tipRow.number}`,
    );

    // Row: TỔNG CỘNG (display in column K only)
    finalTotalRow = addSummaryRow('TỔNG CỘNG', `${summaryValueColumnLetter}${afterTipRow.number}`);
  } else {
    // No summary section, final total is just the totals row
    finalTotalRow = totalsRow;
  }

  // Add tour notes (Ghi chú) below totals/summary if present
  if (tour.notes && String(tour.notes).trim().length > 0) {
    // Add a spacer row
    currentRow++;
    const noteText = `Ghi chú: ${tour.notes}`;
    // Merge across full width A-M for the note
    const range = `A${currentRow}:M${currentRow}`;
    styleMergedRange(worksheet, range, noteText, {
      bold: false,
      alignment: { horizontal: 'left', vertical: 'top', wrapText: true },
    });
    const row = worksheet.getRow(currentRow);
    row.height = 30; // give a bit more space for wrap
  }

  // Print settings: ensure all content fits on a single page (landscape)
  worksheet.pageSetup = {
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 1,
    margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
  };

  return {
    sheetName,
    finalTotalCell: showSummary ? `M${finalTotalRow.number}` : `M${totalsRow.number}`,
  };
};

const formatSheetNameForFormula = (name: string) => {
  if (/['\s]/.test(name)) {
    return `'${name.replace(/'/g, "''")}'`;
  }
  return name;
};

const populateOverviewSheet = (
  worksheet: Worksheet,
  tours: Tour[],
  entries: TourSheetBuildResult[],
) => {
  worksheet.columns = [
    { key: 'code', width: 18 },
    { key: 'client', width: 28 },
    { key: 'nationality', width: 20 },
    { key: 'company', width: 24 },
    { key: 'start', width: 16 },
    { key: 'end', width: 16 },
    { key: 'guests', width: 12 },
    { key: 'total', width: 18 },
  ];

  const headerRow = worksheet.addRow([
    'Mã tour',
    'Khách hàng',
    'Quốc tịch',
    'Công ty',
    'Ngày bắt đầu',
    'Ngày kết thúc',
    'Khách',
    'Tổng cuối',
  ]);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.eachCell(cell => {
    cell.fill = headerFill;
    cell.border = thinBorder;
  });

  const startDataRow = headerRow.number + 1;

  tours.forEach((tour, index) => {
    const entry = entries[index];
    const row = worksheet.addRow([
      tour.tourCode,
      tour.clientName,
      tour.clientNationalityRef?.nameAtBooking,
      tour.companyRef?.nameAtBooking,
      formatDateDisplay(tour.startDate),
      formatDateDisplay(tour.endDate),
      tour.totalGuests ?? tour.adults + tour.children,
      { formula: `${formatSheetNameForFormula(entry.sheetName)}!${entry.finalTotalCell}` },
    ]);
    row.getCell(7).alignment = { horizontal: 'center' };
    row.getCell(8).numFmt = currencyFormat;
    applyRowBorder(row, 1, 8);
  });

  const endDataRow = worksheet.rowCount;
  const totalsRow = worksheet.addRow(['', '', '', '', '', '', 'Tổng cộng', null]);
  totalsRow.font = { bold: true };
  applyRowBorder(totalsRow, 1, 8);
  if (endDataRow >= startDataRow) {
    totalsRow.getCell(8).value = { formula: `SUM(H${startDataRow}:H${endDataRow})` };
  } else {
    totalsRow.getCell(8).value = 0;
  }
  totalsRow.getCell(8).numFmt = currencyFormat;
  totalsRow.getCell(8).fill = totalsFill;

  worksheet.views = [{ state: 'frozen', ySplit: 1 }];
};

export const exportTourToExcel = async (tour: Tour) => {
  const ExcelJS = await loadExcelJS();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Local Tour Manager';
  workbook.calcProperties.fullCalcOnLoad = true;

  buildTourWorksheet(workbook, tour);

  await downloadWorkbook(workbook, `Tour_${tour.tourCode}_${Date.now()}.xlsx`);
};

export const exportAllToursToExcel = async (tours: Tour[]) => {
  if (!tours.length) return;

  const ExcelJS = await loadExcelJS();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Local Tour Manager';
  workbook.calcProperties.fullCalcOnLoad = true;

  // Create single sheet with all tours
  const worksheet = workbook.addWorksheet('All Tours');

  worksheet.properties.defaultRowHeight = 20;
  worksheet.columns = [
    { key: 'code', width: 14 },           // A - code
    { key: 'date', width: 10 },           // B - ngày (tour range)
    { key: 'service', width: 24 },        // C - vé + ăn + uống + chi phí
    { key: 'serviceDate', width: 8 },     // D - ngày (dịch vụ) smaller
    { key: 'price', width: 12 },          // E - giá vé/đơn giá
    { key: 'quantity', width: 10 },       // F - số khách
    { key: 'total', width: 12 },          // G - thành tiền
    { key: 'location', width: 22 },       // H - Địa điểm/tỉnh
    { key: 'locationDate', width: 8 },    // I - ngày (Địa điểm/tỉnh) smaller
    { key: 'days', width: 8 },            // J - số ngày smaller
    { key: 'ctp', width: 8 },             // K - CTP smaller
    { key: 'ctpTotal', width: 10 },       // L - thành tiền smaller
    { key: 'tourTotal', width: 14 },      // M - Tổng tour
  ];

  // Single header for all tours (row 1)
  const header1Row = worksheet.getRow(1);
  header1Row.height = 40; // higher header

  worksheet.mergeCells('A1:B1');
  worksheet.mergeCells('C1:G1');
  worksheet.mergeCells('H1:L1');

  const h1Cells = [
    { cell: 'A1', value: 'code', fill: headerFill },
    { cell: 'C1', value: 'vé + ăn + uống + chi phí', fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF00B050' } } },
    { cell: 'H1', value: 'Công tác phí (CTP) + ngủ', fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF00B050' } } },
    { cell: 'M1', value: 'Tổng tour', fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFFC000' } } },
  ];

  h1Cells.forEach(({ cell, value, fill }) => {
    const c = worksheet.getCell(cell);
    c.value = value;
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = fill;
    c.border = thinBorder;
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });

  for (let col = 1; col <= 13; col++) {
    header1Row.getCell(col).border = thinBorder;
  }

  // Header row 2
  const headerRow = worksheet.getRow(2);
  const headers = [
    'code', 'ngày', 'vé/ăn/uống/chi phí', 'ngày', 'giá vé/đơn giá', 'số khách/ số ngày/ tổng số chai nước uống',
    'thành tiền', 'Địa điểm/tỉnh', 'ngày', 'số ngày', 'CTP', 'thành tiền', '',
  ];

  headers.forEach((header, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = header;
    cell.font = { bold: true };
    cell.fill = headerFill;
    cell.border = thinBorder;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });

  headerRow.height = 40; // higher header

  // Freeze header rows (first 2 rows)
  worksheet.views = [{ state: 'frozen', ySplit: 2 }];

  let currentRow = 3; // Start data from row 3
  const allTourTotalCells: string[] = [];

  let lastMonth: string | undefined;
  tours.forEach((tour, tourIndex) => {
    // Insert month heading line only when month changes from previous tour
    if (tour.startDate) {
      const s = tour.startDate;
      const monthKey = s.length >= 7 ? s.slice(0, 7) : undefined; // YYYY-MM
      if (monthKey && lastMonth && monthKey !== lastMonth) {
        const mm = monthKey.slice(5, 7);
        const yy = monthKey.slice(2, 4);
        const headingRow = worksheet.getRow(currentRow);
        worksheet.mergeCells(`A${currentRow}:M${currentRow}`);
        const title = ` Tour thang ${mm}/${yy} `;
        const totalLen = 120; // approximate target to span merged width
        const side = Math.max(3, Math.floor((totalLen - title.length) / 2));
        const dashLine = `${'-'.repeat(side)}${title}${'-'.repeat(side)}`;
        headingRow.getCell(1).value = dashLine;
        headingRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        for (let col = 1; col <= 13; col += 1) {
          headingRow.getCell(col).border = thinBorder;
        }
        currentRow++;
      }
      lastMonth = monthKey || lastMonth;
    }

    const totalGuests = tour.totalGuests || tour.adults + tour.children;
    const dataStartRow = currentRow;

    const applyRowBorderLocal = (row: Row) => {
    for (let col = 1; col <= 13; col += 1) {
      row.getCell(col).border = thinBorder;
    }
  };

    let firstDataRow = true;
    const setCodeAndDateCells = (row: Row) => {
      if (!firstDataRow) return;
      row.getCell(1).value = `${tour.tourCode} x ${totalGuests} pax`;
      row.getCell(2).value = `${formatDateRangeDisplay(tour.startDate, tour.endDate)}`;
      firstDataRow = false;
    };

    const allowances = tour.allowances || [];
    const serviceItems: { name: string; date?: string; price: number; guests?: number; kind: 'dest'|'exp' }[] = [];

    if (tour.destinations && tour.destinations.length > 0) {
      tour.destinations.forEach(d => {
        serviceItems.push({ kind: 'dest', name: `vé ${d.name || ''}`, date: d.date, price: d.price || 0, guests: typeof d.guests === 'number' ? d.guests : undefined });
      });
    }
    if (tour.expenses && tour.expenses.length > 0) {
      const MERGE_NAMES = [
        'Nước uống cho khách 15k/1 khách / 1 ngày',
        'Nước uống cho khách 10k/1 khách / 1 ngày',
      ];
      const otherList = tour.expenses.filter(e => !MERGE_NAMES.includes(e.name || ''));
      otherList.forEach(e => {
        serviceItems.push({ kind: 'exp', name: e.name || '', date: e.date, price: e.price || 0, guests: e.guests });
      });
      MERGE_NAMES.forEach(NAME => {
        const mergeList = tour.expenses.filter(e => (e.name || '') === NAME);
        if (mergeList.length > 0) {
          const sumGuests = mergeList.reduce((sum, e) => sum + (typeof e.guests === 'number' ? e.guests : 0), 0);
          const unitPrice = mergeList[0].price || 0;
          const earliestDate = mergeList.reduce<string | undefined>((min, e) => {
            if (!e.date) return min;
            if (!min) return e.date;
            return e.date < min ? e.date : min;
          }, undefined);
          serviceItems.push({ kind: 'exp', name: NAME, date: earliestDate, price: unitPrice, guests: sumGuests });
        }
      });
    }
    if (tour.meals && tour.meals.length > 0) {
      tour.meals.forEach(m => {
        serviceItems.push({ kind: 'exp', name: m.name || '', date: m.date, price: m.price || 0, guests: typeof m.guests === 'number' ? m.guests : undefined });
      });
    }

    // Sort services: destinations first, then expenses; within group by name
    (serviceItems as any[]).sort((a, b) => {
      const ra = a.kind === 'dest' ? 0 : 1;
      const rb = b.kind === 'dest' ? 0 : 1;
      if (ra !== rb) return ra - rb;
      const na = (a.name || '').localeCompare(b.name || '');
      return na;
    });

    // Do NOT merge allowance rows — list each row individually, sort by name only
    const allowanceRows = (allowances || []).slice().sort((a, b) => {
      const n = (a.name || '').localeCompare(b.name || '');
      return n;
    });

    const dataRowCount = Math.max(serviceItems.length, allowanceRows.length);

    for (let index = 0; index < dataRowCount; index += 1) {
      const rowNumber = currentRow;
      const row = worksheet.getRow(rowNumber);

      setCodeAndDateCells(row);

      const service = serviceItems[index];
      const allowance = allowanceRows[index];

      if (service) {
        row.getCell(3).value = service.name;
        row.getCell(3).alignment = { wrapText: true, vertical: 'middle' };
        row.getCell(4).value = service.date ? formatDateDisplay(service.date) : '';
        row.getCell(5).value = service.price;
        row.getCell(5).numFmt = currencyFormat;
      // Only take guests from the field on the row; if not set, leave blank
      row.getCell(6).value = (service.guests !== undefined ? service.guests : '');
      row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(7).value = { formula: `E${rowNumber}*F${rowNumber}` };
        row.getCell(7).numFmt = currencyFormat;
      }

      if (allowance) {
        row.getCell(8).value = allowance.name || '';
        row.getCell(8).alignment = { vertical: 'middle', horizontal: 'left' };
        row.getCell(9).value = allowance.date ? formatDateDisplay(allowance.date) : '';
        // Days = quantity or 1 when not provided
        const days = allowance.quantity && allowance.quantity > 0 ? allowance.quantity : 1;
        row.getCell(10).value = days;
        row.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' };
        // Price per unit
        row.getCell(11).value = allowance.price || 0;
        row.getCell(11).numFmt = currencyFormat;
        row.getCell(12).value = { formula: `J${rowNumber}*K${rowNumber}` };
        row.getCell(12).numFmt = currencyFormat;
      }

      applyRowBorderLocal(row);
      currentRow++;
    }

    const dataEndRow = currentRow - 1;
    const totalsRow = worksheet.getRow(currentRow);

    worksheet.mergeCells(`C${currentRow}:F${currentRow}`);
    totalsRow.getCell(3).value = 'dịch vụ';
    totalsRow.getCell(3).font = { bold: true };
    totalsRow.getCell(3).fill = totalsFill;
    totalsRow.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };

    totalsRow.getCell(1).fill = totalsFill;
    totalsRow.getCell(2).fill = totalsFill;

    if (dataEndRow >= dataStartRow) {
      totalsRow.getCell(7).value = { formula: `SUM(G${dataStartRow}:G${dataEndRow})` };
    } else {
      totalsRow.getCell(7).value = 0;
    }
    totalsRow.getCell(7).numFmt = currencyFormat;
    totalsRow.getCell(7).fill = totalsFill;

    totalsRow.getCell(8).value = 'công tác phí';
    totalsRow.getCell(8).font = { bold: true, size: 12 };
    totalsRow.getCell(8).fill = totalsFill;
    totalsRow.getCell(8).alignment = { horizontal: 'left', vertical: 'middle' };
    totalsRow.getCell(3).font = { bold: true, size: 12 };
    totalsRow.height = 22;

    totalsRow.getCell(9).fill = totalsFill;
    totalsRow.getCell(10).fill = totalsFill;
    totalsRow.getCell(11).fill = totalsFill;

    if (dataEndRow >= dataStartRow) {
      totalsRow.getCell(12).value = { formula: `SUM(L${dataStartRow}:L${dataEndRow})` };
    } else {
      totalsRow.getCell(12).value = 0;
    }
    totalsRow.getCell(12).numFmt = currencyFormat;
    totalsRow.getCell(12).font = { bold: true, size: 12 };
    totalsRow.getCell(12).fill = totalsFill;

    totalsRow.getCell(13).value = { formula: `G${currentRow}+L${currentRow}` };
    totalsRow.getCell(13).numFmt = currencyFormat;
    totalsRow.getCell(13).font = { bold: true, size: 12 };
    totalsRow.getCell(13).fill = totalsFill;

    applyRowBorderLocal(totalsRow);

    const totalsRowNumber = currentRow;

    // Check if TỔNG KẾT section should be displayed
    const advancePayment = tour.summary?.advancePayment ?? 0;
    const collectionsForCompany = tour.summary?.collectionsForCompany ?? 0;
    const companyTip = tour.summary?.companyTip ?? 0;
    const showSummary = advancePayment !== 0 || collectionsForCompany !== 0 || companyTip !== 0;

    let finalTotalRowNumber = totalsRowNumber;

    if (showSummary) {
      currentRow++; // Empty row

      // Row: TỔNG KẾT title
      const summaryTitleRowNum = currentRow;
      const summaryTitleRow = worksheet.getRow(summaryTitleRowNum);
      currentRow++;

      worksheet.mergeCells(`L${summaryTitleRowNum}:M${summaryTitleRowNum}`);
      summaryTitleRow.getCell(12).value = 'TỔNG KẾT';
      summaryTitleRow.getCell(12).font = { bold: true };
      summaryTitleRow.getCell(12).alignment = { horizontal: 'center', vertical: 'middle' };
      summaryTitleRow.getCell(12).fill = summaryTitleFill;
      applyRowBorderLocal(summaryTitleRow);

      // Helper function for summary rows
      const addSummaryRow = (label: string, formula?: string, value?: number, labelColor?: string): number => {
        const rowNum = currentRow;
        const row = worksheet.getRow(rowNum);
        currentRow++;

        // L: Label (right aligned)
        row.getCell(12).value = label;
        const labelFont: any = { bold: true };
        if (labelColor) {
          labelFont.color = { argb: labelColor };
        }
        row.getCell(12).font = labelFont;
        row.getCell(12).alignment = { horizontal: 'right', vertical: 'middle' };

        // M: Value/formula (right aligned)
        if (formula) {
          row.getCell(13).value = { formula };
        } else if (value !== undefined) {
          row.getCell(13).value = value;
        }
        row.getCell(13).numFmt = currencyFormat;
        row.getCell(13).font = { bold: true, size: 12 };
        row.getCell(13).alignment = { horizontal: 'right', vertical: 'middle' };

        applyRowBorderLocal(row);
        return rowNum;
      };

      // Row: Tổng chi phí + công tác phí
      const totalTabsRowNum = addSummaryRow('Tổng chi phí + công tác phí', `M${totalsRowNumber}`);

      // Row: Tạm ứng (red color with - sign)
      const advanceRowNum = addSummaryRow('- Tạm ứng', undefined, advancePayment, 'FFFF0000');

      // Row: Sau tạm ứng
      const afterAdvanceRowNum = addSummaryRow(
        'Sau tạm ứng',
        `M${totalTabsRowNum}-M${advanceRowNum}`,
      );

      // Row: Thu của khách (red color with - sign)
      const collectionsRowNum = addSummaryRow('- Thu của khách', undefined, collectionsForCompany, 'FFFF0000');

      // Row: Sau thu khách
      const afterCollectionsRowNum = addSummaryRow(
        'Sau thu khách',
        `M${afterAdvanceRowNum}-M${collectionsRowNum}`,
      );

      // Row: Tip HDV nhận từ công ty (blue color with + sign)
      const tipRowNum = addSummaryRow('+ Tip HDV nhận từ công ty', undefined, companyTip, 'FF0000FF');

      // Row: Sau tip HDV
      const afterTipRowNum = addSummaryRow(
        'Sau tip HDV',
        `M${afterCollectionsRowNum}+M${tipRowNum}`,
      );

      // Row: TỔNG CỘNG
      finalTotalRowNumber = addSummaryRow('TỔNG CỘNG', `M${afterTipRowNum}`);
    }

    allTourTotalCells.push(`M${finalTotalRowNumber}`);

    // Optional notes row for each tour
    if (tour.notes && String(tour.notes).trim().length > 0) {
      currentRow++;
      const noteRow = worksheet.getRow(currentRow);
      worksheet.mergeCells(`A${currentRow}:M${currentRow}`);
      noteRow.getCell(1).value = `Ghi chú: ${tour.notes}`;
      noteRow.getCell(1).alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
      for (let col = 1; col <= 13; col += 1) {
        noteRow.getCell(col).border = thinBorder;
      }
      noteRow.height = 30;
    }

    // Add one blank row (no style) above separator
    currentRow++;

    // Styled separator row: full width, gray background, borders all sides
    const sepRow = worksheet.getRow(currentRow);
    worksheet.mergeCells(`A${currentRow}:M${currentRow}`);
    sepRow.getCell(1).value = '';
    sepRow.getCell(1).fill = infoFill;
    for (let col = 1; col <= 13; col += 1) {
      sepRow.getCell(col).border = thinBorder;
    }
    sepRow.height = 12;

    // Add one blank row (no style) below separator
    currentRow++;
    currentRow++;
  });

  // Grand total row
  const grandTotalRow = worksheet.getRow(currentRow);
  worksheet.mergeCells(`A${currentRow}:L${currentRow}`);
  grandTotalRow.getCell(1).value = 'TỔNG CỘNG TẤT CẢ TOURS';
  grandTotalRow.getCell(1).font = { bold: true, size: 14 };
  grandTotalRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  grandTotalRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6600' } };

  const grandTotalFormula = allTourTotalCells.join('+');
  grandTotalRow.getCell(13).value = { formula: grandTotalFormula };
  grandTotalRow.getCell(13).numFmt = currencyFormat;
  grandTotalRow.getCell(13).font = { bold: true, size: 14 };
  grandTotalRow.getCell(13).alignment = { horizontal: 'right', vertical: 'middle' };
  grandTotalRow.getCell(13).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6600' } };

  for (let col = 1; col <= 13; col++) {
    grandTotalRow.getCell(col).border = thinBorder;
  }

  grandTotalRow.height = 30;

  // Print settings: ensure all content fits on a single page (landscape)
  worksheet.pageSetup = {
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 1,
    margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
  };

  await downloadWorkbook(workbook, `All_Tours_${Date.now()}.xlsx`);
};

// New: Export all tours into a ZIP file with 1 folder per month and 1 Excel per tour
export const exportAllToursToMonthlyZip = async (tours: Tour[]) => {
  if (!tours?.length) return;

  const ExcelJS = await loadExcelJS();
  const JSZip = (await import('jszip')).default;

  // Sort by start date ascending; push tours without date to the end
  const sorted = [...tours].sort((a, b) => {
    const ad = a.startDate ? new Date(a.startDate).getTime() : Number.POSITIVE_INFINITY;
    const bd = b.startDate ? new Date(b.startDate).getTime() : Number.POSITIVE_INFINITY;
    return ad - bd;
  });

  const zip = new JSZip();

  // Group by YYYY-MM
  const ensureMonthFolder = (startDate?: string) => {
    if (!startDate) return zip.folder('unknown');
    const ym = startDate.slice(0, 7); // YYYY-MM
    return zip.folder(ym) as import('jszip').JSZip;
  };

  for (const tour of sorted) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Local Tour Manager';
    workbook.calcProperties.fullCalcOnLoad = true;
    buildTourWorksheet(workbook, tour);

    const buffer = await workbook.xlsx.writeBuffer();

    const folder = ensureMonthFolder(tour.startDate);
    const safeCode = String(tour.tourCode || 'Tour')
      .replace(/[\\/:*?"<>|]/g, '-')
      .slice(0, 60);
    const datePrefix = tour.startDate ? `${tour.startDate}_` : '';
    const filename = `${datePrefix}${safeCode}.xlsx`;
    folder.file(filename, buffer as ArrayBuffer);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
  a.download = `Tours_By_Month_${stamp}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
};
export const importTourFromExcel = async (file: File): Promise<Partial<Tour>> => {
  const XLSX = await import('xlsx');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        const tourData: Partial<Tour> = {};
        
        // Read Tour Info
        const infoSheet = workbook.Sheets['Tour Info'];
        if (infoSheet) {
          const infoData = XLSX.utils.sheet_to_json(infoSheet, { header: 1 }) as any[][];
          infoData.forEach((row: any[]) => {
            if (row[0] === 'Tour Code') tourData.tourCode = row[1];
            if (row[0] === 'Client Name') tourData.clientName = row[1];
            if (row[0] === 'Adults') tourData.adults = Number(row[1]);
            if (row[0] === 'Children') tourData.children = Number(row[1]);
            if (row[0] === 'Driver') tourData.driverName = row[1];
            if (row[0] === 'Client Phone') tourData.clientPhone = row[1];
            if (row[0] === 'Start Date') tourData.startDate = row[1];
            if (row[0] === 'End Date') tourData.endDate = row[1];
          });
        }
        
        // Read Destinations
        const destSheet = workbook.Sheets['Destinations'];
        if (destSheet) {
          const destData = XLSX.utils.sheet_to_json(destSheet) as any[];
          tourData.destinations = destData.map((row: any) => ({
            id: `dest_${Date.now()}_${Math.random()}`,
            name: row.Destination,
            date: row.Date,
            price: Number(row.Price) || 0,
          }));
        }
        
        // Read Expenses
        const expSheet = workbook.Sheets['Expenses'];
        if (expSheet) {
          const expData = XLSX.utils.sheet_to_json(expSheet) as any[];
          tourData.expenses = expData.map((row: any) => ({
            id: `exp_${Date.now()}_${Math.random()}`,
            name: row.Expense,
            date: row.Date,
            price: Number(row.Price) || 0,
          }));
        }
        
        // Read Meals
        const mealSheet = workbook.Sheets['Meals'];
        if (mealSheet) {
          const mealData = XLSX.utils.sheet_to_json(mealSheet) as any[];
          tourData.meals = mealData.map((row: any) => ({
            id: `meal_${Date.now()}_${Math.random()}`,
            name: row.Meal,
            date: row.Date,
            price: 0,
          }));
        }
        
        // Read Allowances
        const allowSheet = workbook.Sheets['Allowances'];
        if (allowSheet) {
          const allowData = XLSX.utils.sheet_to_json(allowSheet) as any[];
          tourData.allowances = allowData.map((row: any) => ({
            id: `allow_${Date.now()}_${Math.random()}`,
            name: row.Province || row.Name,
            date: row.Date,
            price: Number(row.Amount || row.Price) || 0,
          }));
        }
        
        resolve(tourData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsBinaryString(file);
  });
};
