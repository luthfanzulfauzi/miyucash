import type { ExportRow } from './types'

export interface CycleTxnRow {
  date: string
  type: string
  amount: number
  note: string | null
  account_name: string
  to_account_name: string | null
  category_name: string | null
  created_by_name: string | null
}

export interface CycleBudgetRow {
  category_name: string
  budget_amount: number
  spent_amount: number
}

export interface CycleExportData {
  cycleName: string
  startDate: string
  endDate: string
  isActive: boolean
  totalBudget: number
  totalIncome: number
  totalExpense: number
  transactions: CycleTxnRow[]
  budgets: CycleBudgetRow[]
}

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

function idr(n: number) {
  return `Rp ${n.toLocaleString('id-ID')}`
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
}

export async function exportCycleXLSX(data: CycleExportData) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  wb.creator = 'MiyuCash'
  wb.created = new Date()

  const BLUE  = 'FFB8D4E8'
  const LAVENDER = 'FFC9B8E8'
  const CREAM = 'FFF5F0E8'
  const DARK  = 'FF2D3E50'
  const WHITE = 'FFFFFFFF'
  const GREEN = 'FFA8D8B9'
  const RED   = 'FFF2A8A8'
  const STRIPE = 'FFF8F4EE'

  // ─── Sheet 1: Ringkasan ────────────────────────────────────────────────────
  const ws1 = wb.addWorksheet('Ringkasan')
  ws1.columns = [
    { key: 'a', width: 30 },
    { key: 'b', width: 24 },
  ]

  const titleRow = ws1.addRow([`LAPORAN CYCLE — ${data.cycleName.toUpperCase()}`])
  ws1.mergeCells(`A1:B1`)
  titleRow.height = 28
  const titleCell = ws1.getCell('A1')
  titleCell.font = { bold: true, size: 14, color: { argb: DARK } }
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE } }
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' }

  const addMeta = (label: string, value: string) => {
    const r = ws1.addRow([label, value])
    r.getCell(1).font = { color: { argb: '778899' }, italic: true }
    r.getCell(2).font = { bold: true, color: { argb: DARK } }
    r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CREAM } }
    r.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CREAM } }
  }

  addMeta('Periode', `${fmtDate(data.startDate)} — ${fmtDate(data.endDate)}`)
  addMeta('Status', data.isActive ? 'Aktif' : 'Selesai')
  addMeta('Diekspor pada', new Date().toLocaleDateString('id-ID', { dateStyle: 'full' }))
  ws1.addRow([])

  // Summary section header
  const sh = ws1.addRow(['RINGKASAN KEUANGAN', ''])
  ws1.mergeCells(`A${sh.number}:B${sh.number}`)
  sh.height = 20
  const shCell = ws1.getCell(`A${sh.number}`)
  shCell.font = { bold: true, color: { argb: WHITE }, size: 11 }
  shCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A7B9D' } }
  shCell.alignment = { horizontal: 'center' }

  const addSummaryRow = (label: string, value: string, color?: string) => {
    const r = ws1.addRow([label, value])
    r.getCell(1).font = { color: { argb: '556677' } }
    r.getCell(2).font = { bold: true, color: { argb: color ?? DARK } }
    r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: WHITE } }
    r.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: WHITE } }
    r.getCell(2).alignment = { horizontal: 'right' }
  }

  const net = data.totalIncome - data.totalExpense
  const remaining = data.totalBudget - data.totalExpense
  const utilPct = data.totalBudget > 0 ? Math.round((data.totalExpense / data.totalBudget) * 100) : 0

  addSummaryRow('Total Pemasukan', idr(data.totalIncome), 'FF3E7A57')
  addSummaryRow('Total Pengeluaran', idr(data.totalExpense), 'FFC0605A')
  addSummaryRow('Net (Pemasukan - Pengeluaran)', idr(net), net >= 0 ? 'FF3E7A57' : 'FFC0605A')
  if (data.totalBudget > 0) {
    addSummaryRow('Total Budget', idr(data.totalBudget))
    addSummaryRow('Sisa Budget', idr(remaining), remaining >= 0 ? 'FF3E7A57' : 'FFC0605A')
    addSummaryRow('Budget Utilization', `${utilPct}%`, utilPct >= 100 ? 'FFC0605A' : utilPct >= 80 ? 'FF8A7A30' : 'FF3E7A57')
  }
  ws1.addRow([])

  // Budget per category
  if (data.budgets.length > 0) {
    const bh = ws1.addRow(['BUDGET PER KATEGORI', ''])
    ws1.mergeCells(`A${bh.number}:B${bh.number}`)
    bh.height = 20
    ws1.getCell(`A${bh.number}`).font = { bold: true, color: { argb: WHITE }, size: 11 }
    ws1.getCell(`A${bh.number}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7B5EA7' } }
    ws1.getCell(`A${bh.number}`).alignment = { horizontal: 'center' }

    // Budget table headers
    ws1.columns = [
      { key: 'a', width: 24 },
      { key: 'b', width: 18 },
      { key: 'c', width: 18 },
      { key: 'd', width: 18 },
      { key: 'e', width: 12 },
    ]
    const bColHeader = ws1.addRow(['Kategori', 'Budget', 'Dipakai', 'Sisa', 'Utilisasi'])
    bColHeader.height = 16
    bColHeader.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: DARK } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LAVENDER } }
      cell.alignment = { horizontal: 'center' }
    })

    data.budgets.forEach((b, i) => {
      const sisa = b.budget_amount - b.spent_amount
      const pct = b.budget_amount > 0 ? Math.round((b.spent_amount / b.budget_amount) * 100) : 0
      const bg = i % 2 === 0 ? WHITE : STRIPE
      const r = ws1.addRow([b.category_name, idr(b.budget_amount), idr(b.spent_amount), idr(sisa), `${pct}%`])
      r.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
      })
      r.getCell(5).font = { bold: true, color: { argb: pct >= 100 ? 'FFC0605A' : pct >= 80 ? 'FF8A7A30' : 'FF3E7A57' } }
      r.getCell(5).alignment = { horizontal: 'center' }
    })
  }

  // ─── Sheet 2: Transaksi ────────────────────────────────────────────────────
  const ws2 = wb.addWorksheet('Transaksi')
  ws2.columns = [
    { header: 'Tanggal',      key: 'tanggal',      width: 14 },
    { header: 'Tipe',         key: 'tipe',          width: 13 },
    { header: 'Akun',         key: 'akun',          width: 18 },
    { header: 'Akun Tujuan',  key: 'akun_tujuan',   width: 18 },
    { header: 'Kategori',     key: 'kategori',      width: 20 },
    { header: 'Jumlah',       key: 'jumlah',        width: 18 },
    { header: 'Catatan',      key: 'catatan',        width: 32 },
    { header: 'Diinput Oleh', key: 'diinput_oleh',  width: 18 },
  ]

  const txnHeader = ws2.getRow(1)
  txnHeader.height = 18
  txnHeader.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: DARK } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE } }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
    cell.border = { bottom: { style: 'thin', color: { argb: 'FF8BAEC8' } } }
  })

  const TYPE_LABEL: Record<string, string> = { expense: 'Pengeluaran', income: 'Pemasukan', transfer: 'Transfer' }

  data.transactions.forEach((t, i) => {
    const bg = i % 2 === 0 ? WHITE : STRIPE
    const r = ws2.addRow({
      tanggal: fmtDate(t.date),
      tipe: TYPE_LABEL[t.type] ?? t.type,
      akun: t.account_name,
      akun_tujuan: t.to_account_name ?? '',
      kategori: t.category_name ?? '-',
      jumlah: t.amount,
      catatan: t.note ?? '',
      diinput_oleh: t.created_by_name ?? '',
    })
    r.eachCell((cell, col) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
      if (col === 6) {
        cell.numFmt = '#,##0'
        cell.alignment = { horizontal: 'right' }
        cell.font = {
          bold: true,
          color: { argb: t.type === 'expense' ? 'FFC0605A' : t.type === 'income' ? 'FF3E7A57' : DARK },
        }
      }
      if (col === 2) {
        cell.font = {
          color: { argb: t.type === 'expense' ? 'FFC0605A' : t.type === 'income' ? 'FF3E7A57' : '778899' },
        }
      }
    })
  })

  ws2.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 8 } }

  // Summary row at the bottom
  ws2.addRow([])
  const totalRow = ws2.addRow({
    tanggal: '',
    tipe: '',
    akun: '',
    akun_tujuan: '',
    kategori: 'TOTAL PENGELUARAN',
    jumlah: data.totalExpense,
    catatan: '',
    diinput_oleh: '',
  })
  totalRow.getCell(5).font = { bold: true, color: { argb: DARK } }
  totalRow.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: RED } }
  totalRow.getCell(6).font = { bold: true, color: { argb: DARK } }
  totalRow.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: RED } }
  totalRow.getCell(6).numFmt = '#,##0'
  totalRow.getCell(6).alignment = { horizontal: 'right' }

  const incomeRow = ws2.addRow({
    tanggal: '',
    tipe: '',
    akun: '',
    akun_tujuan: '',
    kategori: 'TOTAL PEMASUKAN',
    jumlah: data.totalIncome,
    catatan: '',
    diinput_oleh: '',
  })
  incomeRow.getCell(5).font = { bold: true, color: { argb: DARK } }
  incomeRow.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN } }
  incomeRow.getCell(6).font = { bold: true, color: { argb: DARK } }
  incomeRow.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN } }
  incomeRow.getCell(6).numFmt = '#,##0'
  incomeRow.getCell(6).alignment = { horizontal: 'right' }

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const safeName = data.cycleName.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_')
  triggerDownload(blob, `MiyuCash_${safeName}.xlsx`)
}
