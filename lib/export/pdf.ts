import type { ExportRow } from './types'

export async function exportPDF(rows: ExportRow[], filename: string, title: string) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  // Header
  doc.setFillColor(184, 212, 232) // #B8D4E8
  doc.rect(0, 0, 297, 18, 'F')
  doc.setFontSize(14)
  doc.setTextColor(45, 62, 80)
  doc.setFont('helvetica', 'bold')
  doc.text('MiyuCash', 14, 12)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(title, 60, 12)

  const formatRp = (n: number) =>
    'Rp ' + n.toLocaleString('id-ID')

  autoTable(doc, {
    startY: 22,
    head: [['Tanggal', 'Tipe', 'Akun', 'Akun Tujuan', 'Kategori', 'Jumlah', 'Catatan', 'Diinput Oleh']],
    body: rows.map((r) => [
      r.tanggal,
      r.tipe,
      r.akun,
      r.akun_tujuan,
      r.kategori,
      formatRp(r.jumlah),
      r.catatan,
      r.diinput_oleh,
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: {
      fillColor: [184, 212, 232],
      textColor: [45, 62, 80],
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: [248, 244, 238] },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 20 },
      2: { cellWidth: 30 },
      3: { cellWidth: 30 },
      4: { cellWidth: 28 },
      5: { cellWidth: 28, halign: 'right' },
      6: { cellWidth: 50 },
      7: { cellWidth: 25 },
    },
  })

  // Footer
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pageCount = (doc as any).internal.getNumberOfPages() as number
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(150)
    doc.text(
      `MiyuCash · Digenerate ${new Date().toLocaleDateString('id-ID')} · Halaman ${i}/${pageCount}`,
      14,
      doc.internal.pageSize.height - 5,
    )
  }

  doc.save(`${filename}.pdf`)
}
