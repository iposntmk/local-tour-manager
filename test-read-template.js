const ExcelJS = require('exceljs');
const fs = require('fs');

async function readTemplate() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('./exportTour.xlsx');

  console.log('Worksheets:', workbook.worksheets.map(ws => ws.name));

  const firstSheet = workbook.worksheets[0];
  console.log('\n=== First Sheet:', firstSheet.name, '===');
  console.log('Row count:', firstSheet.rowCount);
  console.log('Column count:', firstSheet.columnCount);

  // Print first 20 rows with details
  for (let i = 1; i <= Math.min(30, firstSheet.rowCount); i++) {
    const row = firstSheet.getRow(i);
    const cells = [];
    for (let j = 1; j <= 8; j++) {
      const cell = row.getCell(j);
      cells.push({
        value: cell.value,
        type: cell.type,
        formula: cell.formula,
        fill: cell.fill,
        border: cell.border,
        font: cell.font,
        alignment: cell.alignment,
        numFmt: cell.numFmt,
        merge: cell.isMerged ? 'MERGED' : ''
      });
    }
    console.log(`\nRow ${i}:`, JSON.stringify(cells, null, 2));
  }

  // Check merged cells
  console.log('\n=== Merged Cells ===');
  console.log(JSON.stringify(firstSheet.model.merges, null, 2));
}

readTemplate().catch(console.error);
