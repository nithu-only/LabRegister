/**
 * controllers/exportController.js
 * -----------------------------------------------------------------------------
 * Generates downloadable exports (Excel / CSV / PDF) of session data.
 * Reuses reportController.exportSessions so exports always honour the same
 * filters as the on-screen table.
 * -----------------------------------------------------------------------------
 */
const reportController = require('./reportController');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { writeLog } = require('../services/logService');

const COLUMNS = [
  { header: 'Register No', key: 'registerNumber' },
  { header: 'Name', key: 'name' },
  { header: 'Department', key: 'department' },
  { header: 'Year', key: 'year' },
  { header: 'Login', key: 'loginTime' },
  { header: 'Logout', key: 'logoutTime' },
  { header: 'Duration', key: 'duration' },
  { header: 'Status', key: 'status' },
  { header: 'Date', key: 'date' },
];

async function exportSessions(req, res) {
  const { range, data } = reportController.exportSessions(req);
  const format = (req.query.format || 'excel').toLowerCase();
  const stamp = range.dateFrom === range.dateTo ? range.dateFrom : `${range.dateFrom}_to_${range.dateTo}`;

  if (format === 'csv') {
    // UTF-8 BOM so Excel renders non-ASCII names (accents, etc.) correctly.
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="sessions_${stamp}.csv"`);
    const header = COLUMNS.map((c) => c.header).join(',');
    const lines = data.map((row) =>
      COLUMNS.map((c) => `"${(row[c.key] ?? '').toString().replace(/"/g, '""')}"`).join(',')
    );
    return res.send('﻿' + [header, ...lines].join('\n'));
  }

  if (format === 'pdf') {
    const doc = new PDFDocument({ margin: 30, size: 'A4', landscape: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="sessions_${stamp}.pdf"`);
    doc.pipe(res);
    doc.fontSize(16).text('Lab Register — Session Report', { align: 'center' });
    doc.fontSize(10).text(`Range: ${range.dateFrom} to ${range.dateTo}`, { align: 'center' });
    doc.moveDown();

    const tableTop = doc.y;
    const colWidths = [90, 130, 90, 70, 140, 140, 70, 70, 80];
    let x = 30;
    doc.font('Helvetica-Bold').fontSize(8);
    COLUMNS.forEach((c, i) => { doc.text(c.header, x, tableTop, { width: colWidths[i] }); x += colWidths[i]; });
    doc.font('Helvetica').fontSize(8);
    let y = tableTop + 14;
    data.forEach((row) => {
      if (y > 540) { doc.addPage(); y = 40; }
      x = 30;
      COLUMNS.forEach((c, i) => {
        doc.text(String(row[c.key] ?? ''), x, y, { width: colWidths[i] });
        x += colWidths[i];
      });
      y += 14;
    });
    doc.end();
    writeLog('event', 'PDF export', { rows: data.length });
    return;
  }

  // Default: Excel
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Sessions');
  ws.columns = COLUMNS.map((c) => ({ header: c.header, key: c.key, width: 18 }));
  ws.getRow(1).font = { bold: true };
  data.forEach((row) => ws.addRow(row));
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="sessions_${stamp}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
  writeLog('event', 'Excel export', { rows: data.length });
}

module.exports = { exportSessions };
