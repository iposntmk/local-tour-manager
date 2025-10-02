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
    { key: 'code', width: 15 },           // A - code
    { key: 'date', width: 25 },           // B - ngày
    { key: 'service', width: 30 },        // C - vé + ăn + uống + chi phí
    { key: 'price', width: 15 },          // D - giá vé/đơn giá
    { key: 'quantity', width: 12 },       // E - số khách
    { key: 'total', width: 15 },          // F - thành tiền
    { key: 'location', width: 20 },       // G - Địa điểm/tỉnh
    { key: 'days', width: 12 },            // H - số ngày
    { key: 'ctp', width: 15 },            // I - CTP
    { key: 'ctpTotal', width: 15 },       // J - thành tiền
    { key: 'tourTotal', width: 15 },      // K - Tổng tour
  ];

  // Row 1: Header row 1 theo mẫu ImageTourExport.png
  const header1Row = worksheet.getRow(1);
  header1Row.height = 30;

  // Merge cells cho header row 1 theo mẫu
  worksheet.mergeCells('A1:B1');  // code + ngày
  worksheet.mergeCells('C1:F1');  // vé + ăn + uống + chi phí
  worksheet.mergeCells('G1:J1');  // Công tác phí (CTP) + ngủ
  // K1 không merge

  const h1Cells = [
    { cell: 'A1', value: 'code', fill: headerFill },
    { cell: 'C1', value: 'vé + ăn + uống + chi phí', fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00B050' } } }, // Green
    { cell: 'G1', value: 'Công tác phí (CTP) + ngủ', fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00B050' } } }, // Green
    { cell: 'K1', value: 'Tổng tour', fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } } }, // Orange
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
  for (let col = 1; col <= 11; col++) {
    header1Row.getCell(col).border = thinBorder;
  }

  // Row 2: Header row 2 theo mẫu ImageTourExport.png
  const headerRow = worksheet.getRow(2);
  const headers = [
    'code',                    // A
    'ngày',                    // B
    'vé/ăn/uống/chi phí',      // C
    'giá vé/đơn giá',          // D
    'số khách',                // E
    'thành tiền',              // F
    'Địa điểm/tỉnh',           // G
    'số ngày',                 // H
    'CTP',                     // I
    'thành tiền',              // J
    '',                        // K (empty for Tổng tour)
  ];

  headers.forEach((header, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = header;
    cell.font = { bold: true };
    cell.border = thinBorder;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });

  headerRow.height = 30;

  worksheet.views = [{ state: 'frozen', ySplit: 2 }]; // Freeze first 2 rows

  const totalGuests = tour.totalGuests || tour.adults + tour.children;
  const dataStartRow = 3; // Bắt đầu từ row 3
  let currentRow = dataStartRow;

  // Helper function để thêm row với border cho 11 cột (A-K)
  const applyRowBorder = (row: ExcelJS.Row) => {
    for (let col = 1; col <= 11; col += 1) {
      row.getCell(col).border = thinBorder;
    }
  };

  let firstDataRow = true;

  // Collect all services (destinations + expenses + meals)
  const allServices = [
    ...(tour.destinations?.map(d => ({ name: `vé ${d.name || ''}`, price: d.price || 0 })) || []),
    ...(tour.expenses?.map(e => ({ name: e.name || '', price: e.price || 0 })) || []),
    ...(tour.meals?.map(m => ({ name: m.name || '', price: m.price || 0 })) || []),
  ];

  const allowances = tour.allowances || [];
  const maxRows = Math.max(allServices.length, allowances.length);

  // Thêm rows cho cả services và allowances
  for (let i = 0; i < maxRows; i++) {
    const row = worksheet.getRow(currentRow);
    const service = allServices[i];
    const allowance = allowances[i];

    // Columns A-F: Services (vé + ăn + uống + chi phí)
    if (service) {
      // A: code (chỉ row đầu tiên)
      if (firstDataRow) {
        row.getCell(1).value = `${tour.tourCode} x ${totalGuests} pax`;
      }

      // B: ngày (chỉ row đầu tiên)
      if (firstDataRow) {
        row.getCell(2).value = `${tour.startDate} - ${tour.endDate}`;
        firstDataRow = false;
      }

      // C: vé/ăn/uống/chi phí
      row.getCell(3).value = service.name;
      row.getCell(3).alignment = { wrapText: true, vertical: 'middle' };

      // D: giá vé/đơn giá
      row.getCell(4).value = service.price;
      row.getCell(4).numFmt = currencyFormat;

      // E: số khách
      row.getCell(5).value = totalGuests;
      row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };

      // F: thành tiền (formula: D*E)
      row.getCell(6).value = { formula: `D${currentRow}*E${currentRow}` };
      row.getCell(6).numFmt = currencyFormat;
    }

    // Columns G-J: Allowances (CTP)
    if (allowance) {
      // G: Địa điểm/tỉnh
      row.getCell(7).value = allowance.province || '';

      // H: số ngày
      row.getCell(8).value = 1;
      row.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' };

      // I: CTP
      row.getCell(9).value = allowance.amount || 0;
      row.getCell(9).numFmt = currencyFormat;

      // J: thành tiền (CTP total = I * H, but H is always 1)
      row.getCell(10).value = allowance.amount || 0;
      row.getCell(10).numFmt = currencyFormat;
    }

    // K: Tổng tour (formula: F + J)
    if (service || allowance) {
      const fValue = service ? `F${currentRow}` : '0';
      const jValue = allowance ? `J${currentRow}` : '0';
      row.getCell(11).value = { formula: `${fValue}+${jValue}` };
      row.getCell(11).numFmt = currencyFormat;
    }

    applyRowBorder(row);
    currentRow++;
  }

  const dataEndRow = currentRow - 1;

  // Row tổng cộng với background vàng theo mẫu
  const totalsRow = worksheet.getRow(currentRow);
  currentRow++;

  // Merge A-C cho "dịch vụ"
  worksheet.mergeCells(`A${totalsRow.number}:C${totalsRow.number}`);
  totalsRow.getCell(1).value = 'dịch vụ';
  totalsRow.getCell(1).font = { bold: true };
  totalsRow.getCell(1).fill = totalsFill;
  totalsRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };

  // D-E: Empty with yellow fill
  totalsRow.getCell(4).fill = totalsFill;
  totalsRow.getCell(5).fill = totalsFill;

  // F: Tổng thành tiền (vé + ăn + uống + chi phí)
  totalsRow.getCell(6).value = { formula: `SUM(F${dataStartRow}:F${dataEndRow})` };
  totalsRow.getCell(6).numFmt = currencyFormat;
  totalsRow.getCell(6).fill = totalsFill;

  // Merge G-I cho "CTP"
  worksheet.mergeCells(`G${totalsRow.number}:I${totalsRow.number}`);
  totalsRow.getCell(7).value = 'CTP';
  totalsRow.getCell(7).font = { bold: true };
  totalsRow.getCell(7).fill = totalsFill;
  totalsRow.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };

  // J: Tổng CTP
  totalsRow.getCell(10).value = { formula: `SUM(J${dataStartRow}:J${dataEndRow})` };
  totalsRow.getCell(10).numFmt = currencyFormat;
  totalsRow.getCell(10).fill = totalsFill;

  // K: Tổng tour (F + J)
  totalsRow.getCell(11).value = { formula: `F${totalsRow.number}+J${totalsRow.number}` };
  totalsRow.getCell(11).numFmt = currencyFormat;
  totalsRow.getCell(11).fill = totalsFill;

  applyRowBorder(totalsRow);

  // TỔNG KẾT section theo mẫu
  currentRow++; // Empty row

  // Row: TỔNG KẾT title
  const summaryTitleRow = worksheet.getRow(currentRow);
  currentRow++;

  worksheet.mergeCells(`A${summaryTitleRow.number}:G${summaryTitleRow.number}`);
  summaryTitleRow.getCell(1).value = 'TỔNG KẾT';
  summaryTitleRow.getCell(1).font = { bold: true };
  summaryTitleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  summaryTitleRow.getCell(1).fill = summaryTitleFill;

  applyRowBorder(summaryTitleRow);

  // Helper function for summary rows
  const addSummaryRow = (label: string, formula?: string, value?: number) => {
    const row = worksheet.getRow(currentRow);
    currentRow++;

    // A: Label
    row.getCell(1).value = label;
    row.getCell(1).font = { bold: true };
    row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };

    // K: Value/formula
    if (formula) {
      row.getCell(11).value = { formula };
    } else if (value !== undefined) {
      row.getCell(11).value = value;
    }
    row.getCell(11).numFmt = currencyFormat;
    row.getCell(11).font = { bold: true };

    // Apply borders
    applyRowBorder(row);

    return row;
  };

  // Row: Tổng tabs
  const totalTabsRow = addSummaryRow('Tổng tabs', `K${totalsRow.number}`);

  // Row: Tạm ứng
  const advanceRow = addSummaryRow('Tạm ứng', undefined, tour.summary?.advancePayment ?? 1000000);

  // Row: Sau tạm ứng
  const afterAdvanceRow = addSummaryRow('Sau tạm ứng', `K${totalTabsRow.number}-K${advanceRow.number}`);

  // Row: Thu của khách
  const collectionsRow = addSummaryRow('Thu của khách', undefined, tour.summary?.collectionsForCompany ?? 0);

  // Row: Sau thu khách
  const afterCollectionsRow = addSummaryRow('Sau thu khách', `K${afterAdvanceRow.number}-K${collectionsRow.number}`);

  // Row: Tip HDV
  const tipRow = addSummaryRow('Tip HDV', undefined, tour.summary?.companyTip ?? 20000000);

  // Row: Sau tip HDV
  const afterTipRow = addSummaryRow('Sau tip HDV', `K${afterCollectionsRow.number}+K${tipRow.number}`);

  // Row: TỔNG CỘNG
  const finalTotalRow = addSummaryRow('TỔNG CỘNG', `K${afterTipRow.number}`);
  finalTotalRow.getCell(1).font = { bold: true };
  finalTotalRow.getCell(11).font = { bold: true };

  return {
    sheetName,
    finalTotalCell: `K${finalTotalRow.number}`,
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
