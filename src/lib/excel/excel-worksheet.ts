import type { Row, Workbook, Worksheet } from 'exceljs';
import type { Tour } from '@/types/tour';
import { formatDateDisplay } from '@/lib/date-utils';
import {
  currencyFormat, thinBorder, headerFill, totalsFill, infoFill,
  TourSheetBuildResult, ServiceItem,
  loadExcelJS, validateTourNumbers, getDuplicateNames, ensureUniqueSheetName,
  isTourDraftForExport, applyRowBorder, styleMergedRange, downloadWorkbook,
  formatNgayRangeForExcel, buildServiceItems, appendSummarySection, formatTourNationalities,
} from './excel-helpers';
import {
  TOUR_SHEET_COLUMN_KEYS,
  TOUR_SHEET_COLUMN_WIDTHS,
  TOUR_SHEET_HEADER2_LABELS,
} from './tour-sheet-layout';

const writeWorksheetHeaders = (worksheet: Worksheet, isDraft: boolean) => {
  if (isDraft) {
    worksheet.headerFooter.oddHeader = '&C&"Arial,Bold"&14&Kff0000BẢN NHÁP — CHƯA DUYỆT';
    worksheet.headerFooter.evenHeader = worksheet.headerFooter.oddHeader;
  }
  worksheet.properties.defaultRowHeight = 20;
  worksheet.columns = TOUR_SHEET_COLUMN_KEYS.map((key, i) => ({ key, width: TOUR_SHEET_COLUMN_WIDTHS[i] }));

  const h1 = worksheet.getRow(1);
  h1.height = 40;
  worksheet.mergeCells('A1:B1');
  worksheet.mergeCells('C1:G1');
  worksheet.mergeCells('H1:L1');
  worksheet.mergeCells('N1:Q1');
  const h1Cells = [
    { cell: 'A1', value: 'code', fill: headerFill },
    { cell: 'C1', value: 'vé + ăn + uống + chi phí', fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF00B050' } } },
    { cell: 'H1', value: 'Công tác phí (CTP) + ngủ', fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF00B050' } } },
    { cell: 'M1', value: 'Tổng tour', fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFFC000' } } },
    { cell: 'N1', value: 'VAT + chứng từ', fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFFC000' } } },
  ];
  h1Cells.forEach(({ cell, value, fill }) => {
    const c = worksheet.getCell(cell);
    c.value = value; c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = fill; c.border = thinBorder;
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });
  for (let col = 1; col <= 17; col++) h1.getCell(col).border = thinBorder;

  const h2 = worksheet.getRow(2);
  h2.height = 40;
  TOUR_SHEET_HEADER2_LABELS.forEach((label, idx) => {
    const cell = h2.getCell(idx + 1);
    cell.value = label; cell.font = { bold: true }; cell.fill = headerFill;
    cell.border = thinBorder; cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });
  worksheet.views = [{ state: 'frozen', ySplit: 2 }];
};

export const buildTourWorksheet = (workbook: Workbook, tour: Tour): TourSheetBuildResult => {
  const isDraft = isTourDraftForExport(tour);
  const sheetName = ensureUniqueSheetName(workbook, isDraft ? `[NHÁP] ${tour.tourCode || 'Tour'}` : (tour.tourCode || 'Tour'));
  const worksheet = workbook.addWorksheet(sheetName);
  writeWorksheetHeaders(worksheet, isDraft);

  const totalGuests = tour.totalGuests || tour.adults + tour.children;
  const dataStartRow = 3;
  const applyBorderAll = (row: Row) => applyRowBorder(row, 1, 17);

  let firstDataRow = true;
  const setCodeAndDateCells = (row: Row) => {
    if (!firstDataRow) return;
    row.getCell(1).value = `${tour.tourCode} x ${totalGuests} pax`;
    const cell2 = row.getCell(2);
    cell2.value = formatNgayRangeForExcel(tour.startDate, tour.endDate);
    cell2.numFmt = '@';
    firstDataRow = false;
  };

  const { serviceItems, allowanceItems } = buildServiceItems(tour);
  const duplicateDestNames = getDuplicateNames((tour.destinations || []).map(d => d.name || ''));
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
      if (service.kind === 'dest' && service.baseName && duplicateDestNames.has(service.baseName.trim().toLowerCase())) {
        row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
      }
      row.getCell(4).value = service.date ? formatDateDisplay(service.date) : '';
      row.getCell(5).value = service.price;
      row.getCell(5).numFmt = currencyFormat;
      if (!service.price) row.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
      row.getCell(6).value = service.guests !== undefined ? service.guests : totalGuests;
      row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(7).value = { formula: `E${rowNumber}*F${rowNumber}` };
      row.getCell(7).numFmt = currencyFormat;
      row.getCell(14).value = service.vatRate || 0;
      row.getCell(14).numFmt = '0.00';
      row.getCell(15).value = service.vatAmount || 0;
      row.getCell(15).numFmt = currencyFormat;
      row.getCell(16).value = service.guideNote || '';
      row.getCell(16).alignment = { wrapText: true, vertical: 'middle' };
      row.getCell(17).value = service.attachmentCount || 0;
      row.getCell(17).alignment = { horizontal: 'center', vertical: 'middle' };
    }
    if (allowance) {
      row.getCell(8).value = allowance.name;
      row.getCell(8).alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell(9).value = allowance.date ? formatDateDisplay(allowance.date) : '';
      row.getCell(10).value = allowance.quantity && allowance.quantity > 0 ? allowance.quantity : 1;
      row.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(11).value = allowance.price;
      row.getCell(11).numFmt = currencyFormat;
      if (!allowance.price) row.getCell(11).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
      row.getCell(12).value = { formula: `J${rowNumber}*K${rowNumber}` };
      row.getCell(12).numFmt = currencyFormat;
    }
    applyBorderAll(row);
    lastDataRow = rowNumber;
  }

  const dataEndRow = lastDataRow;
  const totalsRowIndex = dataEndRow >= dataStartRow ? dataEndRow + 1 : dataStartRow;
  const totalsRow = worksheet.getRow(totalsRowIndex);
  let currentRow = totalsRowIndex + 1;

  worksheet.mergeCells(`C${totalsRowIndex}:F${totalsRowIndex}`);
  totalsRow.getCell(3).value = 'dịch vụ';
  totalsRow.getCell(3).font = { bold: true, size: 12 };
  totalsRow.getCell(3).fill = totalsFill;
  totalsRow.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };
  totalsRow.getCell(1).fill = totalsFill;
  totalsRow.getCell(2).fill = totalsFill;
  totalsRow.getCell(7).value = dataEndRow >= dataStartRow ? { formula: `SUM(G${dataStartRow}:G${dataEndRow})` } : 0;
  totalsRow.getCell(7).numFmt = currencyFormat;
  totalsRow.getCell(7).font = { bold: true, size: 12 };
  totalsRow.getCell(7).fill = totalsFill;
  totalsRow.getCell(8).value = 'công tác phí';
  totalsRow.getCell(8).font = { bold: true, size: 12 };
  totalsRow.getCell(8).fill = totalsFill;
  totalsRow.getCell(8).alignment = { horizontal: 'left', vertical: 'middle' };
  totalsRow.height = 22;
  [9, 10, 11].forEach(c => { totalsRow.getCell(c).fill = totalsFill; });
  totalsRow.getCell(12).value = dataEndRow >= dataStartRow ? { formula: `SUM(L${dataStartRow}:L${dataEndRow})` } : 0;
  totalsRow.getCell(12).numFmt = currencyFormat;
  totalsRow.getCell(12).font = { bold: true, size: 12 };
  totalsRow.getCell(12).fill = totalsFill;
  totalsRow.getCell(13).value = { formula: `G${totalsRowIndex}+L${totalsRowIndex}` };
  totalsRow.getCell(13).numFmt = currencyFormat;
  totalsRow.getCell(13).font = { bold: true, size: 12 };
  totalsRow.getCell(13).fill = totalsFill;
  applyBorderAll(totalsRow);

  let finalTotalRowNumber = totalsRowIndex;
  const summaryResult = appendSummarySection(worksheet, totalsRowIndex, tour, currentRow + 1, applyBorderAll);
  if (summaryResult) {
    currentRow = summaryResult.nextRow;
    finalTotalRowNumber = summaryResult.finalTotalRowNumber;
  }

  if (tour.notes && String(tour.notes).trim().length > 0) {
    currentRow++;
    styleMergedRange(worksheet, `A${currentRow}:Q${currentRow}`, `Ghi chú: ${tour.notes}`, {
      bold: false,
      alignment: { horizontal: 'left', vertical: 'top', wrapText: true, shrinkToFit: false, indent: 0, readingOrder: 'ltr', textRotation: 0 },
    });
    worksheet.getRow(currentRow).getCell(1).font = { color: { argb: 'FFFF0000' } };
    worksheet.getRow(currentRow).height = 30;
  }

  worksheet.pageSetup = {
    orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 1,
    margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
  };

  return { sheetName, finalTotalCell: `M${finalTotalRowNumber}` };
};

const formatSheetNameForFormula = (name: string) =>
  /['\s]/.test(name) ? `'${name.replace(/'/g, "''")}'` : name;

export const populateOverviewSheet = (worksheet: Worksheet, tours: Tour[], entries: TourSheetBuildResult[]) => {
  worksheet.columns = [
    { key: 'code', width: 18 }, { key: 'client', width: 28 }, { key: 'nationality', width: 20 },
    { key: 'company', width: 24 }, { key: 'start', width: 16 }, { key: 'end', width: 16 },
    { key: 'guests', width: 12 }, { key: 'total', width: 18 },
  ];
  const headerRow = worksheet.addRow(['Mã tour', 'Khách hàng', 'Quốc tịch', 'Công ty', 'Ngày bắt đầu', 'Ngày kết thúc', 'Khách', 'Tổng cuối']);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.eachCell(cell => { cell.fill = headerFill; cell.border = thinBorder; });
  const startDataRow = headerRow.number + 1;
  tours.forEach((tour, index) => {
    const entry = entries[index];
    const row = worksheet.addRow([
      tour.tourCode, tour.clientName, formatTourNationalities(tour),
      tour.companyRef?.nameAtBooking, formatDateDisplay(tour.startDate), formatDateDisplay(tour.endDate),
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
  totalsRow.getCell(8).value = endDataRow >= startDataRow ? { formula: `SUM(H${startDataRow}:H${endDataRow})` } : 0;
  totalsRow.getCell(8).numFmt = currencyFormat;
  totalsRow.getCell(8).fill = totalsFill;
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];
};

export const exportTourToExcel = async (tour: Tour) => {
  const ExcelJS = await loadExcelJS();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Local Tour Manager';
  workbook.calcProperties.fullCalcOnLoad = true;
  const issues = validateTourNumbers(tour);
  const dupNames = getDuplicateNames((tour.destinations || []).map(d => d.name || ''));
  if (dupNames.size > 0) issues.push('Duplicate destination names: ' + Array.from(dupNames).join(', '));
  if (issues.length > 0 && typeof window !== 'undefined') {
    window.alert(`Excel export warning for ${tour.tourCode}:\n` + issues.join('\n'));
  }
  buildTourWorksheet(workbook, tour);
  await downloadWorkbook(workbook, `Tour_${tour.tourCode}_${Date.now()}.xlsx`);
};
