import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export function exportTableToPdf(title: string, columns: string[], rows: (string | number)[][], filename: string) {
  const doc = new jsPDF({ orientation: columns.length > 6 ? 'landscape' : 'portrait' });
  doc.setFontSize(14);
  doc.text(title, 14, 15);
  autoTable(doc, {
    startY: 20,
    head: [columns],
    body: rows.map((r) => r.map((c) => String(c ?? ''))),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [79, 70, 229] },
  });
  doc.save(`${filename}.pdf`);
}

export function exportTableToExcel(sheetName: string, columns: string[], rows: (string | number)[][], filename: string) {
  const worksheet = XLSX.utils.aoa_to_sheet([columns, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}
