import fs from 'fs';
import path from 'path';

// Read the sample tour data
const tourData = JSON.parse(fs.readFileSync('1TourArmy.json', 'utf8'));
const sampleTour = tourData[0];

// Convert the sample data to match the Tour interface structure
const tour = {
  id: 'test-tour-1',
  tourCode: sampleTour.tour.tourCode,
  companyRef: { id: '1', nameAtBooking: sampleTour.tour.company },
  guideRef: { id: '1', nameAtBooking: sampleTour.tour.tourGuide || 'Cao Hữu Tú' },
  clientNationalityRef: { id: '1', nameAtBooking: sampleTour.tour.clientNationality },
  clientName: sampleTour.tour.clientName,
  adults: sampleTour.tour.adults,
  children: sampleTour.tour.children,
  totalGuests: sampleTour.tour.totalGuests,
  driverName: sampleTour.tour.driverName || '',
  clientPhone: sampleTour.tour.clientPhone || '',
  startDate: sampleTour.tour.startDate,
  endDate: sampleTour.tour.endDate,
  totalDays: sampleTour.tour.totalDays,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  destinations: sampleTour.subcollections.destinations.map(dest => ({
    id: `dest_${Date.now()}_${Math.random()}`,
    name: dest.name,
    price: dest.price || 0,
    date: dest.date,
    matchedId: dest.matchedId,
    matchedPrice: dest.matchedPrice
  })),
  expenses: sampleTour.subcollections.expenses.map(exp => ({
    id: `exp_${Date.now()}_${Math.random()}`,
    name: exp.name,
    price: exp.price || 0,
    date: exp.date,
    matchedId: exp.matchedId,
    matchedPrice: exp.matchedPrice
  })),
  meals: sampleTour.subcollections.meals.map(meal => ({
    id: `meal_${Date.now()}_${Math.random()}`,
    name: meal.name,
    price: meal.price || 0,
    date: meal.date,
    matchedId: meal.matchedId,
    matchedPrice: meal.matchedPrice
  })),
  allowances: sampleTour.subcollections.allowances.map(allow => ({
    id: `allow_${Date.now()}_${Math.random()}`,
    date: allow.date,
    province: allow.province,
    amount: allow.amount || 0
  })),
  summary: {
    totalTabs: 0,
    advancePayment: 1000000,
    totalAfterAdvance: 0,
    companyTip: 20000000,
    totalAfterTip: 0,
    collectionsForCompany: 0,
    totalAfterCollections: 0,
    finalTotal: 0
  }
};

console.log('Sample Tour Data:');
console.log('Tour Code:', tour.tourCode);
console.log('Client:', tour.clientName);
console.log('Guests:', tour.totalGuests);
console.log('Destinations:', tour.destinations.length);
console.log('Expenses:', tour.expenses.length);
console.log('Meals:', tour.meals.length);
console.log('Allowances:', tour.allowances.length);

// Export the tour data to a JSON file for testing
fs.writeFileSync('sample-tour.json', JSON.stringify(tour, null, 2));
console.log('\nSample tour data exported to sample-tour.json');

// Create a simple HTML test page
const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Excel Export Test</title>
    <script src="https://unpkg.com/exceljs@4.4.0/dist/exceljs.min.js"></script>
</head>
<body>
    <h1>Excel Export Test</h1>
    <button onclick="exportTour()">Export Tour to Excel</button>
    <div id="status"></div>

    <script>
        // Sample tour data
        const tourData = ${JSON.stringify(tour)};

        // Import the excel-utils functions (simplified version for testing)
        const currencyFormat = '#,##0';
        const workbookMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

        const thinBorder = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
        };

        const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00B0F0' } };
        const totalsFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
        const summaryTitleFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

        const formatDisplayDate = (value) => {
            if (!value) return '';
            const parts = value.split('-');
            if (parts.length === 3) {
                const [year, month, day] = parts;
                return \`\${day}/\${month}/\${year}\`;
            }
            return value;
        };

        const downloadWorkbook = async (workbook, filename) => {
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

        const buildTourWorksheet = (workbook, tour) => {
            const sheetName = tour.tourCode || 'Tour';
            const worksheet = workbook.addWorksheet(sheetName);

            worksheet.properties.defaultRowHeight = 20;
            worksheet.columns = [
                { key: 'code', width: 15 },
                { key: 'date', width: 25 },
                { key: 'service', width: 30 },
                { key: 'price', width: 15 },
                { key: 'quantity', width: 12 },
                { key: 'total', width: 15 },
                { key: 'location', width: 20 },
                { key: 'days', width: 12 },
                { key: 'ctp', width: 15 },
                { key: 'ctpTotal', width: 15 },
                { key: 'tourTotal', width: 15 }
            ];

            // Row 1: Header row 1 theo mẫu ImageTourExport.png
            const header1Row = worksheet.getRow(1);
            header1Row.height = 30;

            // Merge cells cho header row 1 theo mẫu
            worksheet.mergeCells('A1:B1');
            worksheet.mergeCells('C1:F1');
            worksheet.mergeCells('G1:J1');

            const h1Cells = [
                { cell: 'A1', value: 'code', fill: headerFill },
                { cell: 'C1', value: 'vé + ăn + uống + chi phí', fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00B050' } } },
                { cell: 'G1', value: 'Công tác phí (CTP) + ngủ', fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00B050' } } },
                { cell: 'K1', value: 'Tổng tour', fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } } }
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
                'code', 'ngày', 'vé/ăn/uống/chi phí', 'giá vé/đơn giá', 'số khách',
                'thành tiền', 'Địa điểm/tỉnh', 'số ngày', 'CTP', 'thành tiền', ''
            ];

            headers.forEach((header, idx) => {
                const cell = headerRow.getCell(idx + 1);
                cell.value = header;
                cell.font = { bold: true };
                cell.border = thinBorder;
                cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            });

            headerRow.height = 30;
            worksheet.views = [{ state: 'frozen', ySplit: 2 }];

            const totalGuests = tour.totalGuests || tour.adults + tour.children;
            const dataStartRow = 3;
            let currentRow = dataStartRow;

            const applyRowBorder = (row) => {
                for (let col = 1; col <= 11; col += 1) {
                    row.getCell(col).border = thinBorder;
                }
            };

            let firstDataRow = true;

            // Tạo map ngày -> allowance để match CTP với destinations/expenses/meals
            const allowancesByDate = new Map();
            tour.allowances?.forEach(allowance => {
                if (allowance.date) {
                    allowancesByDate.set(allowance.date, allowance);
                }
            });

            // Thêm destination rows
            tour.destinations?.forEach((destination) => {
                const row = worksheet.getRow(currentRow);

                if (firstDataRow) {
                    row.getCell(1).value = \`\${tour.tourCode} x \${totalGuests} pax\`;
                    firstDataRow = false;
                }

                row.getCell(2).value = \`\${tour.startDate} - \${tour.endDate}\`;
                row.getCell(3).value = \`vé \${destination.name || ''}\`;
                row.getCell(3).alignment = { wrapText: true, vertical: 'middle' };
                row.getCell(4).value = destination.price || 0;
                row.getCell(4).numFmt = currencyFormat;
                row.getCell(5).value = totalGuests;
                row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };

                row.getCell(6).value = { formula: \`D\${currentRow}*E\${currentRow}\` };
                row.getCell(6).numFmt = currencyFormat;

                const allowance = allowancesByDate.get(destination.date);
                row.getCell(7).value = allowance?.province || '';
                row.getCell(8).value = 1;
                row.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' };
                row.getCell(9).value = allowance?.amount || 0;
                row.getCell(9).numFmt = currencyFormat;
                row.getCell(10).value = allowance?.amount || 0;
                row.getCell(10).numFmt = currencyFormat;

                row.getCell(11).value = { formula: \`F\${currentRow}+J\${currentRow}\` };
                row.getCell(11).numFmt = currencyFormat;

                applyRowBorder(row);
                currentRow++;
            });

            // Thêm expense rows
            tour.expenses?.forEach(expense => {
                const row = worksheet.getRow(currentRow);

                row.getCell(3).value = expense.name;
                row.getCell(3).alignment = { wrapText: true, vertical: 'middle' };
                row.getCell(4).value = expense.price || 0;
                row.getCell(4).numFmt = currencyFormat;
                row.getCell(5).value = totalGuests;
                row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };

                row.getCell(6).value = { formula: \`D\${currentRow}*E\${currentRow}\` };
                row.getCell(6).numFmt = currencyFormat;

                const allowance = allowancesByDate.get(expense.date);
                row.getCell(7).value = allowance?.province || '';
                row.getCell(8).value = 1;
                row.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' };
                row.getCell(9).value = allowance?.amount || 0;
                row.getCell(9).numFmt = currencyFormat;
                row.getCell(10).value = allowance?.amount || 0;
                row.getCell(10).numFmt = currencyFormat;

                row.getCell(11).value = { formula: \`F\${currentRow}+J\${currentRow}\` };
                row.getCell(11).numFmt = currencyFormat;

                applyRowBorder(row);
                currentRow++;
            });

            // Thêm meal rows
            tour.meals?.forEach(meal => {
                const row = worksheet.getRow(currentRow);

                row.getCell(3).value = meal.name;
                row.getCell(3).alignment = { wrapText: true, vertical: 'middle' };
                row.getCell(4).value = meal.price || 0;
                row.getCell(4).numFmt = currencyFormat;
                row.getCell(5).value = totalGuests;
                row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };

                row.getCell(6).value = { formula: \`D\${currentRow}*E\${currentRow}\` };
                row.getCell(6).numFmt = currencyFormat;

                const allowance = allowancesByDate.get(meal.date);
                row.getCell(7).value = allowance?.province || '';
                row.getCell(8).value = 1;
                row.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' };
                row.getCell(9).value = allowance?.amount || 0;
                row.getCell(9).numFmt = currencyFormat;
                row.getCell(10).value = allowance?.amount || 0;
                row.getCell(10).numFmt = currencyFormat;

                row.getCell(11).value = { formula: \`F\${currentRow}+J\${currentRow}\` };
                row.getCell(11).numFmt = currencyFormat;

                applyRowBorder(row);
                currentRow++;
            });

            const dataEndRow = currentRow - 1;

            // Row tổng cộng với background vàng theo mẫu
            const totalsRow = worksheet.getRow(currentRow);
            currentRow++;

            worksheet.mergeCells(\`A\${totalsRow.number}:C\${totalsRow.number}\`);
            totalsRow.getCell(1).value = 'dịch vụ';
            totalsRow.getCell(1).font = { bold: true };
            totalsRow.getCell(1).fill = totalsFill;
            totalsRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };

            totalsRow.getCell(4).fill = totalsFill;
            totalsRow.getCell(5).fill = totalsFill;

            totalsRow.getCell(6).value = { formula: \`SUM(F\${dataStartRow}:F\${dataEndRow})\` };
            totalsRow.getCell(6).numFmt = currencyFormat;
            totalsRow.getCell(6).fill = totalsFill;

            worksheet.mergeCells(\`G\${totalsRow.number}:I\${totalsRow.number}\`);
            totalsRow.getCell(7).value = 'CTP';
            totalsRow.getCell(7).font = { bold: true };
            totalsRow.getCell(7).fill = totalsFill;
            totalsRow.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };

            totalsRow.getCell(10).value = { formula: \`SUM(J\${dataStartRow}:J\${dataEndRow})\` };
            totalsRow.getCell(10).numFmt = currencyFormat;
            totalsRow.getCell(10).fill = totalsFill;

            totalsRow.getCell(11).value = { formula: \`F\${totalsRow.number}+J\${totalsRow.number}\` };
            totalsRow.getCell(11).numFmt = currencyFormat;
            totalsRow.getCell(11).fill = totalsFill;

            applyRowBorder(totalsRow);

            // TỔNG KẾT section theo mẫu
            currentRow++;

            const summaryTitleRow = worksheet.getRow(currentRow);
            currentRow++;

            worksheet.mergeCells(\`A\${summaryTitleRow.number}:G\${summaryTitleRow.number}\`);
            summaryTitleRow.getCell(1).value = 'TỔNG KẾT';
            summaryTitleRow.getCell(1).font = { bold: true };
            summaryTitleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
            summaryTitleRow.getCell(1).fill = summaryTitleFill;

            applyRowBorder(summaryTitleRow);

            const addSummaryRow = (label, formula, value) => {
                const row = worksheet.getRow(currentRow);
                currentRow++;

                row.getCell(1).value = label;
                row.getCell(1).font = { bold: true };
                row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };

                if (formula) {
                    row.getCell(11).value = { formula };
                } else if (value !== undefined) {
                    row.getCell(11).value = value;
                }
                row.getCell(11).numFmt = currencyFormat;
                row.getCell(11).font = { bold: true };

                applyRowBorder(row);
                return row;
            };

            const totalTabsRow = addSummaryRow('Tổng tabs', \`K\${totalsRow.number}\`);
            const advanceRow = addSummaryRow('Tạm ứng', undefined, tour.summary?.advancePayment ?? 1000000);
            const afterAdvanceRow = addSummaryRow('Sau tạm ứng', \`K\${totalTabsRow.number}-K\${advanceRow.number}\`);
            const collectionsRow = addSummaryRow('Thu của khách', undefined, tour.summary?.collectionsForCompany ?? 0);
            const afterCollectionsRow = addSummaryRow('Sau thu khách', \`K\${afterAdvanceRow.number}-K\${collectionsRow.number}\`);
            const tipRow = addSummaryRow('Tip HDV', undefined, tour.summary?.companyTip ?? 20000000);
            const afterTipRow = addSummaryRow('Sau tip HDV', \`K\${afterCollectionsRow.number}+K\${tipRow.number}\`);
            const finalTotalRow = addSummaryRow('TỔNG CỘNG', \`K\${afterTipRow.number}\`);
            finalTotalRow.getCell(1).font = { bold: true };
            finalTotalRow.getCell(11).font = { bold: true };

            return {
                sheetName,
                finalTotalCell: \`K\${finalTotalRow.number}\`
            };
        };

        async function exportTour() {
            try {
                document.getElementById('status').innerHTML = 'Đang tạo file Excel...';
                
                const workbook = new ExcelJS.Workbook();
                workbook.creator = 'Local Tour Manager';
                workbook.calcProperties.fullCalcOnLoad = true;

                buildTourWorksheet(workbook, tourData);

                await downloadWorkbook(workbook, \`Tour_\${tourData.tourCode}_\${Date.now()}.xlsx\`);
                
                document.getElementById('status').innerHTML = '✅ File Excel đã được tạo thành công!';
            } catch (error) {
                console.error('Error:', error);
                document.getElementById('status').innerHTML = '❌ Lỗi: ' + error.message;
            }
        }
    </script>
</body>
</html>
`;

fs.writeFileSync('test-excel-export.html', htmlContent);
console.log('Test HTML page created: test-excel-export.html');
console.log('\nTo test the Excel export:');
console.log('1. Open test-excel-export.html in a web browser');
console.log('2. Click the "Export Tour to Excel" button');
console.log('3. The Excel file should download automatically');