/**
 * Export data to CSV and trigger download
 */
export function exportToCSV(data, columns, filename = 'export.csv') {
  if (!data || data.length === 0) return;

  const headers = columns.map(col => col.label || col.key);
  const rows = data.map(row =>
    columns.map(col => {
      let value = row[col.key];

      // Handle nested objects (e.g., document.original_name)
      if (col.key.includes('.')) {
        const parts = col.key.split('.');
        value = parts.reduce((obj, key) => obj?.[key], row);
      }

      // Handle render functions that return plain text
      if (col.exportRender) {
        value = col.exportRender(value, row);
      }

      if (value == null) return '';

      // Escape CSV values
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    })
  );

  const csv = [
    headers.join(','),
    ...rows.map(r => r.join(','))
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}

/**
 * Download a Blob as a file
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
