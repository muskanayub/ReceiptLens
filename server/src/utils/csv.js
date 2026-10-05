function cell(value) {
  if (value === null || value === undefined) return '';
  let s = String(value);
  // Stops spreadsheet apps from running text such as "=HYPERLINK(...)" as a formula
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(columns, rows) {
  const header = columns.map((c) => cell(c.label)).join(',');
  const lines = rows.map((row) => columns.map((c) => cell(c.value(row))).join(','));
  return [header, ...lines].join('\r\n');
}

module.exports = { toCsv, cell };
