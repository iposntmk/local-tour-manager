import type { Row, Worksheet } from 'exceljs';
import type { Tour } from '@/types/tour';
import { formatDateDisplay } from '@/lib/date-utils';
import {
  currencyFormat, thinBorder, headerFill, totalsFill, infoFill,
  loadExcelJS, validateTourNumbers, getDuplicateNames, ensureUniqueSheetName,
  isTourDraftForExport, applyRowBorder, downloadWorkbook,
  formatNgayRangeForExcel, buildServiceItems, appendSummarySection,
} from './excel-helpers';
import { buildTourWorksheet } from './excel-worksheet';
import { TOUR_SHEET_COLUMNS, TOUR_SHEET_HEADER2_LABELS } from './tour-sheet-layout';

const writeTourTotalsRow = (
  worksheet: Worksheet,
  currentRow: number,
  dataStartRow: number,
  dataEndRow: number,
  applyBorder: (row: Row) => void,
) => {
  const totalsRow = worksheet.getRow(currentRow);
  worksheet.mergeCells(`C${currentRow}:F${currentRow}`);
  totalsRow.getCell(3).value = 'dịch vụ';
  totalsRow.getCell(3).font = { bold: true, size: 12 };
  totalsRow.getCell(3).fill = totalsFill;
  totalsRow.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };
  totalsRow.getCell(1).fill = totalsFill;
  totalsRow.getCell(2).fill = totalsFill;
  totalsRow.getCell(7).value = dataEndRow >= dataStartRow ? { formula: `SUM(G${dataStartRow}:G${dataEndRow})` } : 0;
  totalsRow.getCell(7).numFmt = currencyFormat;
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
  totalsRow.getCell(13).value = { formula: `G${currentRow}+L${currentRow}` };
  totalsRow.getCell(13).numFmt = currencyFormat;
  totalsRow.getCell(13).font = { bold: true, size: 12 };
  totalsRow.getCell(13).fill = totalsFill;
  applyBorder(totalsRow);
};

const writeGrandTotalRow = (worksheet: Worksheet, currentRow: number, allTourTotalCells: string[]) => {
  const row = worksheet.getRow(currentRow);
  worksheet.mergeCells(`A${currentRow}:L${currentRow}`);
  row.getCell(1).value = 'TỔNG CỘNG TẤT CẢ TOURS';
  row.getCell(1).font = { bold: true, size: 14 };
  row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6600' } };
  row.getCell(13).value = { formula: allTourTotalCells.join('+') };
  row.getCell(13).numFmt = currencyFormat;
  row.getCell(13).font = { bold: true, size: 14 };
  row.getCell(13).alignment = { horizontal: 'right', vertical: 'middle' };
  row.getCell(13).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6600' } };
  for (let col = 1; col <= 17; col++) row.getCell(col).border = thinBorder;
  row.height = 30;
};

export const exportAllToursToExcel = async (tours: Tour[]) => {
  if (!tours.length) return;
  const ExcelJS = await loadExcelJS();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Local Tour Manager';
  workbook.calcProperties.fullCalcOnLoad = true;
  const hasUnapproved = tours.some(isTourDraftForExport);
  const worksheet = workbook.addWorksheet(
    ensureUniqueSheetName(workbook, hasUnapproved ? 'NHÁP All Tours' : 'All Tours'),
  );
  if (hasUnapproved) {
    worksheet.headerFooter.oddHeader = '&C&"Arial,Bold"&14&Kff0000BẢN NHÁP — CHƯA DUYỆT';
    worksheet.headerFooter.evenHeader = worksheet.headerFooter.oddHeader;
  }
  worksheet.properties.defaultRowHeight = 20;
  worksheet.columns = TOUR_SHEET_COLUMNS.map(({ key, width }) => ({ key, width }));

  const h1 = worksheet.getRow(1);
  h1.height = 40;
  worksheet.mergeCells('A1:B1');
  worksheet.mergeCells('C1:G1');
  worksheet.mergeCells('H1:L1');
  worksheet.mergeCells('N1:Q1');
  [
    { cell: 'A1', value: 'code', fill: headerFill },
    { cell: 'C1', value: 'vé + ăn + uống + chi phí', fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF00B050' } } },
    { cell: 'H1', value: 'Công tác phí (CTP) + ngủ', fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF00B050' } } },
    { cell: 'M1', value: 'Tổng tour', fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFFC000' } } },
    { cell: 'N1', value: 'VAT + chứng từ', fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFFC000' } } },
  ].forEach(({ cell, value, fill }) => {
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

  let currentRow = 3;
  const allTourTotalCells: string[] = [];
  const invalidTourCodes: string[] = [];
  const duplicateNameTourCodes: string[] = [];
  let lastMonth: string | undefined;
  const applyBorder17 = (row: Row) => applyRowBorder(row, 1, 17);

  tours.forEach((tour) => {
    const issues = validateTourNumbers(tour);
    if (issues.length > 0) invalidTourCodes.push(tour.tourCode || tour.id);
    const dupNames = getDuplicateNames((tour.destinations || []).map(d => d.name || ''));
    if (dupNames.size > 0) duplicateNameTourCodes.push(tour.tourCode || tour.id);

    if (tour.startDate) {
      const monthKey = tour.startDate.length >= 7 ? tour.startDate.slice(0, 7) : undefined;
      if (monthKey && lastMonth && monthKey !== lastMonth) {
        const mm = monthKey.slice(5, 7), yy = monthKey.slice(2, 4);
        const headingRow = worksheet.getRow(currentRow);
        worksheet.mergeCells(`A${currentRow}:Q${currentRow}`);
        const title = ` Tour thang ${mm}/${yy} `;
        const side = Math.max(3, Math.floor((120 - title.length) / 2));
        headingRow.getCell(1).value = `${'-'.repeat(side)}${title}${'-'.repeat(side)}`;
        headingRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        for (let col = 1; col <= 17; col++) headingRow.getCell(col).border = thinBorder;
        currentRow++;
      }
      lastMonth = monthKey || lastMonth;
    }

    const totalGuests = tour.totalGuests || tour.adults + tour.children;
    const dataStartRow = currentRow;
    const duplicateDestNames = getDuplicateNames((tour.destinations || []).map(d => d.name || ''));
    const { serviceItems, allowanceItems } = buildServiceItems(tour);
    const dataRowCount = Math.max(serviceItems.length, allowanceItems.length);

    let firstDataRow = true;
    const setCodeAndDateCells = (row: Row) => {
      if (!firstDataRow) return;
      row.getCell(1).value = `${tour.tourCode} x ${totalGuests} pax`;
      const c2 = row.getCell(2);
      c2.value = formatNgayRangeForExcel(tour.startDate, tour.endDate);
      c2.numFmt = '@';
      firstDataRow = false;
    };

    for (let index = 0; index < dataRowCount; index += 1) {
      const rowNumber = currentRow;
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
        row.getCell(8).value = allowance.name || '';
        row.getCell(8).alignment = { vertical: 'middle', horizontal: 'left' };
        row.getCell(9).value = allowance.date ? formatDateDisplay(allowance.date) : '';
        const days = allowance.quantity && allowance.quantity > 0 ? allowance.quantity : 1;
        row.getCell(10).value = days;
        row.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(11).value = allowance.price || 0;
        row.getCell(11).numFmt = currencyFormat;
        if (!allowance.price) row.getCell(11).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
        row.getCell(12).value = { formula: `J${rowNumber}*K${rowNumber}` };
        row.getCell(12).numFmt = currencyFormat;
      }
      applyBorder17(row);
      currentRow++;
    }

    const dataEndRow = currentRow - 1;
    const totalsRowNumber = currentRow;
    writeTourTotalsRow(worksheet, totalsRowNumber, dataStartRow, dataEndRow, applyBorder17);

    const summaryResult = appendSummarySection(worksheet, totalsRowNumber, tour, totalsRowNumber + 1, applyBorder17);
    let finalTotalRowNumber = totalsRowNumber;
    if (summaryResult) {
      currentRow = summaryResult.nextRow;
      finalTotalRowNumber = summaryResult.finalTotalRowNumber;
    } else {
      currentRow = totalsRowNumber;
    }
    allTourTotalCells.push(`M${finalTotalRowNumber}`);

    if (tour.notes && String(tour.notes).trim().length > 0) {
      currentRow++;
      const noteRow = worksheet.getRow(currentRow);
      worksheet.mergeCells(`A${currentRow}:Q${currentRow}`);
      noteRow.getCell(1).value = `Ghi chú: ${tour.notes}`;
      noteRow.getCell(1).alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
      noteRow.getCell(1).font = { color: { argb: 'FFFF0000' } };
      for (let col = 1; col <= 17; col++) noteRow.getCell(col).border = thinBorder;
      noteRow.height = 30;
    }

    currentRow++;
    const sepRow = worksheet.getRow(currentRow);
    worksheet.mergeCells(`A${currentRow}:Q${currentRow}`);
    sepRow.getCell(1).value = '';
    sepRow.getCell(1).fill = infoFill;
    for (let col = 1; col <= 17; col++) sepRow.getCell(col).border = thinBorder;
    sepRow.height = 12;
    currentRow++;
    currentRow++;
  });

  writeGrandTotalRow(worksheet, currentRow, allTourTotalCells);
  worksheet.pageSetup = {
    orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 1,
    margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
  };

  if ((invalidTourCodes.length > 0 || duplicateNameTourCodes.length > 0) && typeof window !== 'undefined') {
    window.alert([
      invalidTourCodes.length ? `Numeric issues that may cause sum errors in: ${invalidTourCodes.join(', ')}` : null,
      duplicateNameTourCodes.length ? `Duplicate destination names in: ${duplicateNameTourCodes.join(', ')}` : null,
    ].filter(Boolean).join('\n'));
  }

  await downloadWorkbook(workbook, `All_Tours_${Date.now()}.xlsx`);
};

export const exportAllToursToMonthlyZip = async (tours: Tour[]) => {
  if (!tours?.length) return;
  const ExcelJS = await loadExcelJS();
  const JSZip = (await import('jszip')).default;
  const sorted = [...tours].sort((a, b) => {
    const ad = a.startDate ? new Date(a.startDate).getTime() : Number.POSITIVE_INFINITY;
    const bd = b.startDate ? new Date(b.startDate).getTime() : Number.POSITIVE_INFINITY;
    return ad - bd;
  });
  const zip = new JSZip();
  const ensureMonthFolder = (startDate?: string) => {
    if (!startDate) return zip.folder('unknown');
    return zip.folder(startDate.slice(0, 7));
  };
  for (const tour of sorted) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Local Tour Manager';
    workbook.calcProperties.fullCalcOnLoad = true;
    buildTourWorksheet(workbook, tour);
    const buffer = await workbook.xlsx.writeBuffer();
    const folder = ensureMonthFolder(tour.startDate);
    const safeCode = String(tour.tourCode || 'Tour').replace(/[\\/:*?"<>|]/g, '-').slice(0, 60);
    const datePrefix = tour.startDate ? `${tour.startDate}_` : '';
    folder.file(`${datePrefix}${safeCode}.xlsx`, buffer as ArrayBuffer);
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Tours_By_Month_${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12)}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
};
