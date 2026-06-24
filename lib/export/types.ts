export interface ExportRow {
  tanggal: string
  tipe: string
  akun: string
  akun_tujuan: string
  kategori: string
  jumlah: number
  catatan: string
  diinput_oleh: string
}

export type ExportFormat = 'csv' | 'xlsx' | 'pdf'
export type ExportScope = 'active' | 'all' | string // string = cycle id
