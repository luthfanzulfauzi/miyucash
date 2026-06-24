import type { ExportRow } from './types'

export async function exportXLSX(rows: ExportRow[], filename: string) {
  const ExcelJS = (await import('exceljs')).default

  const wb = new ExcelJS.Workbook()
  wb.creator = 'MiyuCash'
  wb.created = new Date()

  const ws = wb.addWorksheet('Transaksi')

  ws.columns = [
    { header: 'Tanggal', key: 'tanggal', width: 14 },
    { header: 'Tipe', key: 'tipe', width: 12 },
    { header: 'Akun', key: 'akun', width: 18 },
    { header: 'Akun Tujuan', key: 'akun_tujuan', width: 18 },
    { header: 'Kategori', key: 'kategori', width: 20 },
    { header: 'Jumlah', key: 'jumlah', width: 16 },
    { header: 'Catatan', key: 'catatan', width: 30 },
    { header: 'Diinput Oleh', key: 'diinput_oleh', width: 18 },
  ]

  // Header style
  const headerRow = ws.getRow(1)
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FF2D3E50' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB8D4E8' } }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FF8BAEC8' } },
    }
  })

  // Data rows
  rows.forEach((r, i) => {
    const row = ws.addRow(r)
    const bgColor = i % 2 === 0 ? 'FFFFFFFF' : 'FFF8F4EE'
    row.eachCell((cell, colNum) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } }
      if (colNum === 6) {
        // Jumlah column — number format
        cell.numFmt = '#,##0'
        cell.alignment = { horizontal: 'right' }
      }
    })
  })

  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: 8 },
  }

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  triggerDownload(blob, `${filename}.xlsx`)
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
