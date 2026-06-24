import type { ExportRow } from './types'

export function exportCSV(rows: ExportRow[], filename: string) {
  const headers = ['Tanggal', 'Tipe', 'Akun', 'Akun Tujuan', 'Kategori', 'Jumlah', 'Catatan', 'Diinput Oleh']

  const escape = (v: string | number) => {
    const s = String(v)
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }

  const lines = [
    headers.map(escape).join(','),
    ...rows.map((r) =>
      [r.tanggal, r.tipe, r.akun, r.akun_tujuan, r.kategori, r.jumlah, r.catatan, r.diinput_oleh]
        .map(escape)
        .join(','),
    ),
  ]

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  triggerDownload(blob, `${filename}.csv`)
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
