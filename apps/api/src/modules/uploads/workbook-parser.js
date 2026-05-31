import ExcelJS from 'exceljs';
import { parse as parseCsv } from 'csv-parse/sync';

// Turns an uploaded buffer into normalized rows for the ingestion service. Two
// shapes are supported:
//   - .xlsx with a `clients` sheet and a `health_reports` sheet (the company file)
//   - .csv of health_reports (the brief's original "upload health report CSV")
//
// Output rows are plain objects keyed by lower-cased header, each tagged with its
// 1-based source row number so per-row errors point back at the file. Dates are
// normalized to YYYY-MM-DD; everything else passes through to Zod for coercion.

const norm = (h) => String(h ?? '').trim().toLowerCase();

// Normalize an xlsx Date cell to a YYYY-MM-DD string. We round to the nearest UTC
// day so a timezone offset applied during parsing (a known spreadsheet foot-gun)
// can't shift a date-only value onto the wrong calendar day.
function dateToIso(date) {
  const rounded = Math.round(date.getTime() / 86_400_000) * 86_400_000;
  return new Date(rounded).toISOString().slice(0, 10);
}

function cellValue(value) {
  if (value == null) return '';
  if (value instanceof Date) return dateToIso(value);
  if (typeof value === 'object') {
    if (Array.isArray(value.richText)) return value.richText.map((t) => t.text).join('');
    if ('text' in value) return value.text;
    if ('result' in value) return value.result; // formula result
    if ('error' in value) return '';
    return String(value);
  }
  return value; // number | string | boolean
}

function sheetToRows(worksheet) {
  const headers = [];
  worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col] = norm(cell.value);
  });

  const rows = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // header
    const data = {};
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      const key = headers[col];
      if (key) data[key] = cellValue(cell.value);
    });
    rows.push({ row: rowNumber, data });
  });

  return { headers: headers.filter(Boolean), rows };
}

async function parseXlsx(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const byName = new Map();
  workbook.eachSheet((ws) => byName.set(norm(ws.name), ws));

  let reportsSheet = byName.get('health_reports');
  // Be forgiving: a single-sheet workbook is treated as the reports sheet.
  if (!reportsSheet && workbook.worksheets.length === 1) {
    [reportsSheet] = workbook.worksheets;
  }
  if (!reportsSheet) {
    throw new Error('Workbook has no "health_reports" sheet');
  }

  const clientsSheet = byName.get('clients');
  return {
    format: 'xlsx',
    clients: clientsSheet ? sheetToRows(clientsSheet) : null,
    reports: sheetToRows(reportsSheet),
  };
}

function parseCsvBuffer(buffer) {
  let headers = [];
  const records = parseCsv(buffer, {
    bom: true,
    trim: true,
    skip_empty_lines: true,
    columns: (header) => {
      headers = header.map(norm);
      return headers;
    },
  });
  // header is line 1, so the first data record is line 2.
  const rows = records.map((data, index) => ({ row: index + 2, data }));
  return { format: 'csv', clients: null, reports: { headers, rows } };
}

export async function parseUpload(buffer, filename = '') {
  const isXlsx =
    filename.toLowerCase().endsWith('.xlsx') ||
    // xlsx files are zip archives: they start with the "PK" local-file signature.
    (buffer.length > 1 && buffer[0] === 0x50 && buffer[1] === 0x4b);
  return isXlsx ? parseXlsx(buffer) : parseCsvBuffer(buffer);
}
