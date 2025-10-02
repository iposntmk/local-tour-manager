import ExcelJS from 'exceljs';
import type { Alignment, Fill } from 'exceljs';
import type { Tour } from '@/types/tour';

const currencyFormat = '#,##0';
const workbookMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const thinBorder = {
  top: { style: 'thin', color: { argb: 'FF000000' } },
  left: { style: 'thin', color: { argb: 'FF000000' } },
  bottom: { style: 'thin', color: { argb: 'FF000000' } },
  right: { style: 'thin', color: { argb: 'FF000000' } },
} as const;

const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF4B2' } } as const;
const totalsFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } } as const;
const summaryTitleFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE69C' } } as const;
const summaryInputFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE699' } } as const;
const infoFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDEDED' } } as const;
const finalFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBDD7EE' } } as const;

interface TourSheetBuildResult {
  sheetName: string;
  finalTotalCell: string;
}

const formatDisplayDate = (value?: string | null) => {
  if (!value) return '';
  const parts = value.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  return value;
};

const sanitizeSheetName = (name: string) => {
  const invalidChars = /[\[\]:\\/?*]/g;
  const cleaned = name.replace(invalidChars, ' ').trim() || 'Tour';
  return cleaned.length > 31 ? cleaned.slice(0, 31) : cleaned;
};

const ensureUniqueSheetName = (workbook: ExcelJS.Workbook, baseName: string) => {
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

const applyRowBorder = (row: ExcelJS.Row, start = 1, end = 8) => {
  for (let col = start; col <= end; col += 1) {
    row.getCell(col).border = thinBorder;
  }
};

const styleMergedRange = (worksheet: ExcelJS.Worksheet, range: string, value: string, options?: {
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
    const worksheetRow = worksheet.getRow(row);
    for (let col = startCell.col; col <= endCell.col; col += 1) {
      const cell = worksheetRow.getCell(col);
      cell.fill = infoFill;
      cell.border = thinBorder;
      cell.alignment = options?.alignment ?? { vertical: 'middle', horizontal: 'left' };
    }
  }
};

const downloadWorkbook = async (workbook: ExcelJS.Workbook, filename: string) => {
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

const buildTourWorksheet = (workbook: ExcelJS.Workbook, tour: Tour): TourSheetBuildResult => {
  const sheetName = ensureUniqueSheetName(workbook, tour.tourCode || 'Tour');
  const worksheet = workbook.addWorksheet(sheetName);

  worksheet.properties.defaultRowHeight = 20;
  worksheet.columns = [
    { key: 'code', width: 18 },
    { key: 'date', width: 16 },
    { key: 'service', width: 40 },
    { key: 'quantity', width: 12 },
    { key: 'amount', width: 18 },
    { key: 'ctp', width: 32 },
    { key: 'ctpAmount', width: 18 },
    { key: 'total', width: 18 },
  ];

  worksheet.mergeCells('A1:H1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = `BẢNG THANH TOÁN TOUR - ${tour.tourCode}`;
  titleCell.font = { bold: true, size: 16, color: { argb: 'FF1F4E78' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  titleCell.fill = finalFill;
  applyRowBorder(worksheet.getRow(1));

  styleMergedRange(worksheet, 'A2:C2', `Khách: ${tour.clientName || ''}`, { bold: true });
  styleMergedRange(worksheet, 'D2:E2', `SĐT: ${tour.clientPhone || ''}`);
  styleMergedRange(worksheet, 'F2:H2', `Quốc tịch: ${tour.clientNationalityRef?.nameAtBooking || ''}`);

  styleMergedRange(worksheet, 'A3:C3', `Công ty: ${tour.companyRef?.nameAtBooking || ''}`);
  styleMergedRange(worksheet, 'D3:E3', `Hướng dẫn: ${tour.guideRef?.nameAtBooking || ''}`);
  styleMergedRange(worksheet, 'F3:H3', `Tài xế: ${tour.driverName || ''}`);

  styleMergedRange(
    worksheet,
    'A4:C4',
    `Ngày: ${formatDisplayDate(tour.startDate)} - ${formatDisplayDate(tour.endDate)}`,
  );
  styleMergedRange(worksheet, 'D4:E4', `Số ngày: ${tour.totalDays ?? ''}`);
  styleMergedRange(
    worksheet,
    'F4:H4',
    `Tổng khách: ${tour.totalGuests ?? tour.adults + tour.children} (NL ${tour.adults} / TE ${tour.children})`,
  );

  const headerRow = worksheet.addRow([
    'code',
    'ngày',
    'vé ăn - ngủ - dịch vụ',
    'số lượng',
    'thành tiền',
    'Công tác phí (CTP)',
    'thành tiền',
    'Tổng tour',
  ]);
  headerRow.height = 22;
  headerRow.font = { bold: true };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  headerRow.eachCell(cell => {
    cell.fill = headerFill;
    cell.border = thinBorder;
  });

  worksheet.views = [{ state: 'frozen', ySplit: headerRow.number }];

  const totalGuests = tour.totalGuests || tour.adults + tour.children;
  const dataStartRow = worksheet.rowCount + 1;
  let firstCodeAssigned = false;

  const assignCodeCell = (row: ExcelJS.Row) => {
    if (!firstCodeAssigned) {
      row.getCell(1).value = tour.tourCode;
      firstCodeAssigned = true;
    }
  };

  const addServiceRow = (label: string, date: string, price: number) => {
    const row = worksheet.addRow(['', formatDisplayDate(date), label, totalGuests, null, '', null, null]);
    assignCodeCell(row);
    row.getCell(3).alignment = { wrapText: true };
    row.getCell(4).alignment = { horizontal: 'center' };
    row.getCell(5).value = { formula: `${price || 0}*D${row.number}` };
    row.getCell(5).numFmt = currencyFormat;
    row.getCell(8).value = { formula: `IF(E${row.number}="",0,E${row.number})+IF(G${row.number}="",0,G${row.number})` };
    row.getCell(8).numFmt = currencyFormat;
    applyRowBorder(row);
  };

  const addAllowanceRow = (label: string, date: string, amount: number) => {
    const row = worksheet.addRow(['', formatDisplayDate(date), '', '', null, label, amount ?? 0, null]);
    assignCodeCell(row);
    row.getCell(6).alignment = { wrapText: true };
    row.getCell(7).numFmt = currencyFormat;
    row.getCell(8).value = { formula: `IF(E${row.number}="",0,E${row.number})+IF(G${row.number}="",0,G${row.number})` };
    row.getCell(8).numFmt = currencyFormat;
    applyRowBorder(row);
  };

  tour.destinations?.forEach(destination => {
    addServiceRow(`[Điểm đến] ${destination.name}`, destination.date, destination.price);
  });

  tour.expenses?.forEach(expense => {
    addServiceRow(`[Chi phí] ${expense.name}`, expense.date, expense.price);
  });

  tour.meals?.forEach(meal => {
    addServiceRow(`[Bữa ăn] ${meal.name}`, meal.date, meal.price);
  });

  tour.allowances?.forEach(allowance => {
    addAllowanceRow(`CTP ${allowance.province}`, allowance.date, allowance.amount);
  });

  const dataEndRow = worksheet.rowCount;
  const hasDataRows = dataEndRow >= dataStartRow;

  const totalsRow = worksheet.addRow(['', '', 'Tổng cộng', '', null, '', null, null]);
  totalsRow.font = { bold: true };
  totalsRow.getCell(3).fill = totalsFill;
  totalsRow.alignment = { vertical: 'middle' };
  applyRowBorder(totalsRow);

  if (hasDataRows) {
    totalsRow.getCell(5).value = { formula: `SUM(E${dataStartRow}:E${dataEndRow})` };
    totalsRow.getCell(7).value = { formula: `SUM(G${dataStartRow}:G${dataEndRow})` };
    totalsRow.getCell(8).value = { formula: `SUM(H${dataStartRow}:H${dataEndRow})` };
  } else {
    totalsRow.getCell(5).value = 0;
    totalsRow.getCell(7).value = 0;
    totalsRow.getCell(8).value = 0;
  }
  totalsRow.getCell(5).numFmt = currencyFormat;
  totalsRow.getCell(7).numFmt = currencyFormat;
  totalsRow.getCell(8).numFmt = currencyFormat;

  worksheet.addRow([]);

  const summaryTitleRow = worksheet.addRow(['', '', '', '', '', '', '', '']);
  const summaryTitleAddress = `C${summaryTitleRow.number}:F${summaryTitleRow.number}`;
  worksheet.mergeCells(summaryTitleAddress);
  const summaryTitleCell = worksheet.getCell(`C${summaryTitleRow.number}`);
  summaryTitleCell.value = 'TỔNG KẾT';
  summaryTitleCell.font = { bold: true };
  summaryTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  summaryTitleCell.fill = summaryTitleFill;
  applyRowBorder(summaryTitleRow);

const addSummaryRow = (label: string, value: number | { formula: string }, options?: { fill?: Fill; bold?: boolean }) => {
    const row = worksheet.addRow(['', '', label, '', '', '', '', null]);
    applyRowBorder(row);
    const labelCell = row.getCell(3);
    labelCell.alignment = { vertical: 'middle', horizontal: 'left' };
    if (options?.bold) {
      labelCell.font = { bold: true };
    }
    const valueCell = row.getCell(8);
    if (typeof value === 'number') {
      valueCell.value = value;
    } else {
      valueCell.value = { formula: value.formula };
    }
    valueCell.numFmt = currencyFormat;
    valueCell.alignment = { horizontal: 'right', vertical: 'middle' };
    if (options?.fill) {
      valueCell.fill = options.fill;
    }
    return row.number;
  };

  const totalsRowNumber = totalsRow.number;
  const summary = tour.summary || {};

  const totalTabsRowNumber = addSummaryRow('Tổng tabs', { formula: `H${totalsRowNumber}` });
  const advanceRowNumber = addSummaryRow('Tiền ứng', summary.advancePayment ?? 0, { fill: summaryInputFill });
  const afterAdvanceRowNumber = addSummaryRow('Sau trừ ứng', {
    formula: `H${totalTabsRowNumber} - H${advanceRowNumber}`,
  });
  const collectionsRowNumber = addSummaryRow('Thu hộ công ty', summary.collectionsForCompany ?? 0, {
    fill: summaryInputFill,
  });
  const afterCollectionsRowNumber = addSummaryRow('Sau thu hộ công ty', {
    formula: `H${afterAdvanceRowNumber} + H${collectionsRowNumber}`,
  });
  const tipRowNumber = addSummaryRow('Tip công ty', summary.companyTip ?? 0, { fill: summaryInputFill });
  const afterTipRowNumber = addSummaryRow('Sau tip', {
    formula: `H${afterCollectionsRowNumber} + H${tipRowNumber}`,
  });
  const finalTotalRowNumber = addSummaryRow('Tổng cuối', { formula: `H${afterTipRowNumber}` }, { bold: true });

  const finalValueCell = worksheet.getCell(`H${finalTotalRowNumber}`);
  finalValueCell.font = { bold: true };
  finalValueCell.fill = finalFill;

  return {
    sheetName,
    finalTotalCell: `H${finalTotalRowNumber}`,
  };
};

const formatSheetNameForFormula = (name: string) => {
  if (/['\s]/.test(name)) {
    return `'${name.replace(/'/g, "''")}'`;
  }
  return name;
};

const populateOverviewSheet = (
  worksheet: ExcelJS.Worksheet,
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
  headerRow.font = { bold: true };
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
      formatDisplayDate(tour.startDate),
      formatDisplayDate(tour.endDate),
      tour.totalGuests ?? tour.adults + tour.children,
      { formula: `${formatSheetNameForFormula(entry.sheetName)}!${entry.finalTotalCell}` },
    ]);
    row.getCell(7).alignment = { horizontal: 'center' };
    row.getCell(8).numFmt = currencyFormat;
    applyRowBorder(row);
  });

  const endDataRow = worksheet.rowCount;
  const totalsRow = worksheet.addRow(['', '', '', '', '', '', 'Tổng cộng', null]);
  totalsRow.font = { bold: true };
  applyRowBorder(totalsRow);
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
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Local Tour Manager';
  workbook.calcProperties.fullCalcOnLoad = true;

  buildTourWorksheet(workbook, tour);

  await downloadWorkbook(workbook, `Tour_${tour.tourCode}_${Date.now()}.xlsx`);
};

export const exportAllToursToExcel = async (tours: Tour[]) => {
  if (!tours.length) return;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Local Tour Manager';
  workbook.calcProperties.fullCalcOnLoad = true;

  const overviewSheet = workbook.addWorksheet('Tổng hợp');
  const entries = tours.map(tour => buildTourWorksheet(workbook, tour));
  populateOverviewSheet(overviewSheet, tours, entries);

  await downloadWorkbook(workbook, `All_Tours_${Date.now()}.xlsx`);
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
            province: row.Province,
            date: row.Date,
            amount: Number(row.Amount) || 0,
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
