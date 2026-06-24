'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Download, FileText, FileSpreadsheet, File, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useTrackerStore } from '@/stores/tracker'
import { formatDateShort } from '@/lib/utils'
import { exportCSV } from '@/lib/export/csv'
import { exportXLSX } from '@/lib/export/xlsx'
import { exportPDF } from '@/lib/export/pdf'
import type { ExportFormat, ExportRow } from '@/lib/export/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Cycle } from '@/types'

interface ExportDialogProps {
  open: boolean
  onClose: () => void
  cycles?: Cycle[]
}

const FORMAT_OPTIONS: { value: ExportFormat; label: string; icon: typeof FileText; color: string }[] = [
  { value: 'csv', label: 'CSV', icon: FileText, color: '#A8D8B9' },
  { value: 'xlsx', label: 'Excel (.xlsx)', icon: FileSpreadsheet, color: '#B8D4E8' },
  { value: 'pdf', label: 'PDF', icon: File, color: '#F2C4A0' },
]

export function ExportDialog({ open, onClose, cycles = [] }: ExportDialogProps) {
  const { trackerId, activeCycle } = useTrackerStore()
  const [format, setFormat] = useState<ExportFormat>('xlsx')
  const [scope, setScope] = useState<string>('active')
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    if (!trackerId) return
    setLoading(true)

    try {
      const supabase = createClient()

      // Determine date range and title
      let startDate: string | null = null
      let endDate: string | null = null
      let scopeLabel = 'semua-transaksi'

      if (scope === 'active' && activeCycle) {
        startDate = activeCycle.start_date
        endDate = activeCycle.end_date
        scopeLabel = activeCycle.name.toLowerCase().replace(/\s+/g, '-')
      } else if (scope !== 'active' && scope !== 'all') {
        const cycle = cycles.find((c) => c.id === scope)
        if (cycle) {
          startDate = cycle.start_date
          endDate = cycle.end_date
          scopeLabel = cycle.name.toLowerCase().replace(/\s+/g, '-')
        }
      }

      // Fetch transactions with relations
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('transactions')
        .select(`
          type, amount, date, note,
          account:accounts!account_id(name),
          to_account:accounts!to_account_id(name),
          category:categories(name),
          created_by_user:users(name)
        `)
        .eq('tracker_id', trackerId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      if (startDate) query = query.gte('date', startDate)
      if (endDate) query = query.lte('date', endDate)

      const { data: txns, error } = await query

      if (error) {
        toast.error('Gagal mengambil data: ' + error.message)
        return
      }

      const rows: ExportRow[] = (txns ?? []).map((t: {
        date: string
        type: string
        amount: number
        note: string | null
        account?: { name: string } | null
        to_account?: { name: string } | null
        category?: { name: string } | null
        created_by_user?: { name: string } | null
      }) => ({
        tanggal: formatDateShort(t.date),
        tipe:
          t.type === 'expense'
            ? 'Pengeluaran'
            : t.type === 'income'
              ? 'Pemasukan'
              : 'Transfer',
        akun: t.account?.name ?? '-',
        akun_tujuan: t.to_account?.name ?? '-',
        kategori: t.category?.name ?? '-',
        jumlah: t.amount,
        catatan: t.note ?? '',
        diinput_oleh: t.created_by_user?.name ?? '-',
      }))

      if (rows.length === 0) {
        toast.error('Tidak ada transaksi untuk diekspor.')
        return
      }

      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      const filename = `miyucash-${scopeLabel}-${dateStr}`
      const title = scope === 'all'
        ? 'Semua Transaksi'
        : scope === 'active' && activeCycle
          ? activeCycle.name
          : cycles.find((c) => c.id === scope)?.name ?? 'Transaksi'

      if (format === 'csv') exportCSV(rows, filename)
      else if (format === 'xlsx') await exportXLSX(rows, filename)
      else await exportPDF(rows, filename, title)

      toast.success(`${rows.length} transaksi berhasil diekspor!`)
      onClose()
    } catch (e) {
      toast.error('Gagal mengekspor. Coba lagi.')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const hasActiveScope = scope === 'active' ? !!activeCycle : true

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="rounded-3xl border-0 p-0 max-w-sm overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.97)' }}
      >
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle
            className="text-xl font-extrabold text-[#3D4A5C] flex items-center gap-2"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            <div className="w-8 h-8 rounded-xl bg-[#B8D4E8]/40 flex items-center justify-center">
              <Download className="h-4 w-4 text-[#4A7B9D]" />
            </div>
            Export Transaksi
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5 space-y-5">
          {/* Format selection */}
          <div>
            <p className="text-xs font-bold text-[#7A8899] uppercase tracking-wider mb-3">
              Format
            </p>
            <div className="grid grid-cols-3 gap-2">
              {FORMAT_OPTIONS.map(({ value, label, icon: Icon, color }) => (
                <button
                  key={value}
                  onClick={() => setFormat(value)}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 transition-all"
                  style={{
                    borderColor: format === value ? color : 'transparent',
                    background: format === value ? color + '25' : '#F5F0E8',
                  }}
                >
                  <Icon
                    className="h-5 w-5"
                    style={{ color: format === value ? '#3D4A5C' : '#9AAAB8' }}
                  />
                  <span
                    className="text-xs font-bold"
                    style={{ color: format === value ? '#3D4A5C' : '#9AAAB8' }}
                  >
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Scope selection */}
          <div>
            <p className="text-xs font-bold text-[#7A8899] uppercase tracking-wider mb-3">
              Periode
            </p>
            <div className="space-y-2">
              {activeCycle && (
                <ScopeOption
                  value="active"
                  selected={scope === 'active'}
                  onSelect={() => setScope('active')}
                  label={`Cycle aktif — ${activeCycle.name}`}
                  sub={`${formatDateShort(activeCycle.start_date)} – ${formatDateShort(activeCycle.end_date)}`}
                />
              )}
              {cycles.filter((c) => !c.is_active).slice(0, 4).map((c) => (
                <ScopeOption
                  key={c.id}
                  value={c.id}
                  selected={scope === c.id}
                  onSelect={() => setScope(c.id)}
                  label={c.name}
                  sub={`${formatDateShort(c.start_date)} – ${formatDateShort(c.end_date)}`}
                />
              ))}
              <ScopeOption
                value="all"
                selected={scope === 'all'}
                onSelect={() => setScope('all')}
                label="Semua transaksi"
                sub="Tanpa filter tanggal"
              />
            </div>
          </div>
        </div>

        <div className="px-6 pb-6">
          <Button
            onClick={handleExport}
            disabled={loading || !hasActiveScope}
            className="w-full h-11 rounded-xl font-bold text-sm gap-2 shadow-md"
            style={{
              background: 'linear-gradient(135deg, #B8D4E8 0%, #A8C8E0 100%)',
              color: '#2D3E50',
            }}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {loading ? 'Mengekspor...' : 'Export'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ScopeOption({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  value: _value,
  selected,
  onSelect,
  label,
  sub,
}: {
  value: string
  selected: boolean
  onSelect: () => void
  label: string
  sub: string
}) {
  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl border-2 text-left transition-all"
      style={{
        borderColor: selected ? '#B8D4E8' : 'transparent',
        background: selected ? '#B8D4E8/15' : '#F5F0E8',
        backgroundColor: selected ? 'rgba(184,212,232,0.15)' : '#F5F0E8',
      }}
    >
      <div
        className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
        style={{ borderColor: selected ? '#B8D4E8' : '#C0CDD8' }}
      >
        {selected && (
          <div className="w-2 h-2 rounded-full" style={{ background: '#B8D4E8' }} />
        )}
      </div>
      <div>
        <p className="text-sm font-semibold text-[#3D4A5C]">{label}</p>
        <p className="text-xs text-[#9AAAB8]">{sub}</p>
      </div>
    </button>
  )
}
