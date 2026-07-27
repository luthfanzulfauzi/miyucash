'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Plus,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
  ChevronRight,
  PiggyBank,
  Download,
  Pencil,
  AlertTriangle,
} from 'lucide-react'
import { createClient as _createClient } from '@/lib/supabase/client'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createClient = _createClient as unknown as () => any
import { toast } from 'sonner'
import { useTrackerStore } from '@/stores/tracker'
import { PixelCat } from '@/components/shared/pixel-cat'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Cycle } from '@/types'
import type { CycleExportData } from '@/lib/export/xlsx'

interface CycleWithSummary extends Cycle {
  totalBudget: number
  totalSpent: number
  pct: number
}

function budgetBarColor(pct: number) {
  if (pct >= 100) return '#F2A8A8'
  if (pct >= 80) return '#F5C9A3'
  return '#A8D8B9'
}

export default function CyclesPage() {
  const { trackerId, activeCycle, setActiveCycle } = useTrackerStore()
  const [cycles, setCycles] = useState<CycleWithSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState<string | null>(null)

  // Edit cycle dialog state
  const [editCycle, setEditCycle] = useState<Cycle | null>(null)
  const [editName, setEditName] = useState('')
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  function openEdit(cycle: Cycle) {
    setEditCycle(cycle)
    setEditName(cycle.name)
    setEditStart(cycle.start_date.slice(0, 10))
    setEditEnd(cycle.end_date.slice(0, 10))
  }

  async function saveEdit() {
    if (!editCycle || savingEdit) return
    if (!editName.trim()) {
      toast.error('Nama cycle wajib diisi.')
      return
    }
    if (editEnd <= editStart) {
      toast.error('Tanggal selesai harus setelah tanggal mulai.')
      return
    }
    setSavingEdit(true)
    try {
      const supabase = createClient()
      const { data: updated, error } = await supabase
        .from('cycles')
        .update({
          name: editName.trim(),
          start_date: editStart,
          end_date: editEnd,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editCycle.id)
        .select()
        .single()

      if (error || !updated) {
        const msg = String((error as { message?: string } | null)?.message ?? '')
        const code = (error as { code?: string } | null)?.code
        if (code === '23P01' || msg.includes('cycles_no_overlap')) {
          toast.error('Rentang tanggal bertabrakan dengan cycle lain. Pilih rentang yang tidak overlap.')
        } else {
          toast.error(msg || 'Gagal menyimpan perubahan.')
        }
        return
      }

      // Keep the global active-cycle in sync so budget/dashboard use the new dates
      if (activeCycle?.id === updated.id) {
        setActiveCycle(updated)
      }

      toast.success('Cycle berhasil diperbarui!')
      setEditCycle(null)
      await loadCycles()
    } catch {
      toast.error('Terjadi kesalahan. Coba lagi.')
    } finally {
      setSavingEdit(false)
    }
  }

  const loadCycles = useCallback(async () => {
    if (!trackerId) return
    setLoading(true)
    try {
      const supabase = createClient()

      const { data: rawCycles } = await supabase
        .from('cycles')
        .select('*')
        .eq('tracker_id', trackerId)
        .order('start_date', { ascending: false })

      if (!rawCycles?.length) {
        setCycles([])
        return
      }

      type AmtRow = { amount: number }
      const enriched: CycleWithSummary[] = await Promise.all(
        rawCycles.map(async (cycle: Cycle) => {
          const [{ data: budgets }, { data: txns }] = await Promise.all([
            supabase.from('budgets').select('amount').eq('cycle_id', cycle.id),
            supabase
              .from('transactions')
              .select('amount')
              .eq('tracker_id', trackerId)
              .eq('type', 'expense')
              .gte('date', cycle.start_date)
              .lte('date', cycle.end_date),
          ])

          const totalBudget = ((budgets ?? []) as AmtRow[]).reduce((s: number, b: AmtRow) => s + b.amount, 0)
          const totalSpent = ((txns ?? []) as AmtRow[]).reduce((s: number, t: AmtRow) => s + t.amount, 0)
          const pct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0

          return { ...cycle, totalBudget, totalSpent, pct }
        }),
      )

      setCycles(enriched)
    } finally {
      setLoading(false)
    }
  }, [trackerId])

  async function exportCycle(cycle: CycleWithSummary) {
    if (!trackerId || exporting) return
    setExporting(cycle.id)
    try {
      const supabase = createClient()

      // Fetch transactions in cycle period with joins
      const { data: txns } = await supabase
        .from('transactions')
        .select(`
          date, type, amount, note,
          account:accounts!transactions_account_id_fkey(name),
          to_account:accounts!transactions_to_account_id_fkey(name),
          category:categories(name),
          creator:users!transactions_created_by_fkey(name)
        `)
        .eq('tracker_id', trackerId)
        .gte('date', cycle.start_date)
        .lte('date', cycle.end_date)
        .order('date', { ascending: true })

      // Fetch budgets for this cycle
      const { data: budgets } = await supabase
        .from('budgets')
        .select('amount, category:categories(name)')
        .eq('cycle_id', cycle.id)

      // Compute per-category spending from transactions
      type TxnRow = {
        date: string; type: string; amount: number; note: string | null
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        account: any; to_account: any; category: any; creator: any
      }

      const txnRows = (txns ?? []) as TxnRow[]
      const spendingByCategory: Record<string, number> = {}
      txnRows.forEach((t) => {
        if (t.type === 'expense' && t.category?.name) {
          spendingByCategory[t.category.name] = (spendingByCategory[t.category.name] ?? 0) + Number(t.amount)
        }
      })

      const totalIncome = txnRows.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
      const totalExpense = txnRows.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const budgetRows = ((budgets ?? []) as any[]).map((b) => ({
        category_name: b.category?.name ?? 'Tanpa Kategori',
        budget_amount: Number(b.amount),
        spent_amount: spendingByCategory[b.category?.name] ?? 0,
      }))

      const exportData: CycleExportData = {
        cycleName: cycle.name,
        startDate: cycle.start_date,
        endDate: cycle.end_date,
        isActive: cycle.is_active,
        totalBudget: cycle.totalBudget,
        totalIncome,
        totalExpense,
        transactions: txnRows.map((t) => ({
          date: t.date,
          type: t.type,
          amount: Number(t.amount),
          note: t.note,
          account_name: t.account?.name ?? '-',
          to_account_name: t.to_account?.name ?? null,
          category_name: t.category?.name ?? null,
          created_by_name: t.creator?.name ?? null,
        })),
        budgets: budgetRows,
      }

      const { exportCycleXLSX } = await import('@/lib/export/xlsx')
      await exportCycleXLSX(exportData)
    } catch {
      toast.error('Gagal mengekspor. Coba lagi.')
    } finally {
      setExporting(null)
    }
  }

  useEffect(() => {
    loadCycles()
  }, [loadCycles])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F0E8' }}>
        <Loader2 className="h-8 w-8 animate-spin text-[#B8D4E8]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#F5F0E8' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-30 px-4 pt-6 pb-4"
        style={{ background: 'rgba(245,240,232,0.92)', backdropFilter: 'blur(16px)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-2xl font-extrabold text-[#3D4A5C] tracking-tight"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              Riwayat Cycle
            </h1>
            <p className="text-xs text-[#7A8899] mt-0.5">
              {cycles.length} cycle tersimpan
            </p>
          </div>
          <Link
            href="/budget/cycles/new"
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl font-bold text-sm text-[#3D4A5C] transition-all active:scale-95 shadow-sm"
            style={{ background: '#B8D4E8' }}
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            Buat Cycle
          </Link>
        </div>
      </div>

      <div className="px-4 pb-8 space-y-3">
        {cycles.length === 0 ? (
          <div
            className="rounded-3xl p-8 border flex flex-col items-center text-center gap-4 mt-2"
            style={{
              background: 'rgba(255,255,255,0.78)',
              backdropFilter: 'blur(12px)',
              borderColor: 'rgba(184,212,232,0.3)',
            }}
          >
            <PixelCat size={80} />
            <div>
              <p
                className="text-lg font-extrabold text-[#3D4A5C]"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                Belum ada cycle
              </p>
              <p className="text-sm text-[#7A8899] mt-1.5 leading-relaxed">
                Buat cycle pertama untuk mulai melacak budget bulanan kamu.
              </p>
            </div>
            <Link
              href="/budget/cycles/new"
              className="flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm shadow-sm transition-all active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #B8D4E8 0%, #A8C8E0 100%)',
                color: '#2D3E50',
              }}
            >
              <Plus className="h-4 w-4" />
              Buat Cycle Pertama
            </Link>
          </div>
        ) : (
          cycles.map((cycle) => (
            <div
              key={cycle.id}
              className="rounded-3xl border p-5 relative overflow-hidden"
              style={{
                background: cycle.is_active
                  ? 'linear-gradient(135deg, rgba(184,212,232,0.4) 0%, rgba(201,184,232,0.3) 100%)'
                  : 'rgba(255,255,255,0.78)',
                backdropFilter: 'blur(12px)',
                borderColor: cycle.is_active ? 'rgba(184,212,232,0.4)' : 'rgba(184,212,232,0.2)',
              }}
            >
              {cycle.is_active && (
                <div
                  className="absolute -top-6 -right-6 w-28 h-28 rounded-full opacity-20 pointer-events-none"
                  style={{ background: 'radial-gradient(circle, #B8D4E8 0%, transparent 70%)' }}
                />
              )}

              <div className="relative z-10">
                {/* Top row: name + status badge */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {cycle.is_active ? (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{
                            background: 'rgba(168,216,185,0.3)',
                            color: '#3E7A57',
                            border: '1px solid rgba(168,216,185,0.5)',
                          }}
                        >
                          <Clock3 className="h-2.5 w-2.5" />
                          Aktif
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{
                            background: 'rgba(184,212,232,0.2)',
                            color: '#7A8899',
                            border: '1px solid rgba(184,212,232,0.3)',
                          }}
                        >
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          Selesai
                        </span>
                      )}
                    </div>
                    <h2
                      className="text-base font-extrabold text-[#3D4A5C] leading-tight truncate"
                      style={{ fontFamily: 'var(--font-nunito)' }}
                    >
                      {cycle.name}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {cycle.is_active && (
                      <Link
                        href="/budget"
                        className="flex items-center gap-1 text-xs font-semibold text-[#4A7B9D]"
                      >
                        Kelola
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                    <button
                      onClick={() => openEdit(cycle)}
                      title="Edit cycle"
                      className="flex items-center justify-center w-8 h-8 rounded-xl transition-all active:scale-95"
                      style={{ background: 'rgba(201,184,232,0.3)', color: '#7B5EA7' }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => exportCycle(cycle)}
                      disabled={exporting === cycle.id}
                      title="Export XLSX"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                      style={{
                        background: exporting === cycle.id ? 'rgba(184,212,232,0.2)' : 'rgba(184,212,232,0.35)',
                        color: '#4A7B9D',
                      }}
                    >
                      {exporting === cycle.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Download className="h-3.5 w-3.5" />
                      )}
                      <span className="hidden sm:inline">Export</span>
                    </button>
                  </div>
                </div>

                {/* Date range */}
                <div className="flex items-center gap-1.5 mb-4">
                  <CalendarDays className="h-3.5 w-3.5 text-[#9AAAB8] flex-shrink-0" />
                  <span className="text-xs text-[#7A8899]">
                    {formatDate(cycle.start_date)} — {formatDate(cycle.end_date)}
                  </span>
                </div>

                {/* Budget summary */}
                {cycle.totalBudget > 0 ? (
                  <>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <PiggyBank className="h-3.5 w-3.5 text-[#9AAAB8]" />
                        <span className="text-xs text-[#7A8899]">
                          {formatCurrency(cycle.totalSpent)} / {formatCurrency(cycle.totalBudget)}
                        </span>
                      </div>
                      <span
                        className="text-xs font-bold"
                        style={{
                          color: cycle.pct >= 100 ? '#C0605A' : cycle.pct >= 80 ? '#8A7A30' : '#3E7A57',
                        }}
                      >
                        {cycle.pct}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.06)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(cycle.pct, 100)}%`,
                          background: budgetBarColor(cycle.pct),
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <div
                    className="rounded-2xl px-3 py-2 flex items-center gap-2"
                    style={{ background: 'rgba(184,212,232,0.12)' }}
                  >
                    <PiggyBank className="h-3.5 w-3.5 text-[#9AAAB8]" />
                    <span className="text-xs text-[#9AAAB8]">
                      {cycle.totalSpent > 0
                        ? `Pengeluaran: ${formatCurrency(cycle.totalSpent)} · Tidak ada budget`
                        : 'Belum ada budget atau pengeluaran'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit cycle dialog */}
      <Dialog open={editCycle !== null} onOpenChange={(open) => !open && setEditCycle(null)}>
        <DialogContent className="rounded-3xl border-0 max-w-sm" style={{ background: '#F5F0E8' }}>
          <DialogHeader>
            <DialogTitle
              className="text-lg font-extrabold text-[#3D4A5C] flex items-center gap-2"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              <Pencil className="h-4 w-4 text-[#7B5EA7]" />
              Edit Cycle
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-[#7A8899] uppercase tracking-wide">
                Nama Cycle
              </Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="contoh: Juli 2026"
                className="rounded-xl border-[#B8D4E8]/50 bg-white/70 focus-visible:ring-[#B8D4E8] h-11 text-[#3D4A5C] font-semibold"
              />
            </div>

            {/* Start date */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-[#7A8899] uppercase tracking-wide">
                Tanggal Mulai
              </Label>
              <Input
                type="date"
                value={editStart}
                max={editEnd || undefined}
                onChange={(e) => setEditStart(e.target.value)}
                className="rounded-xl border-[#B8D4E8]/50 bg-white/70 focus-visible:ring-[#B8D4E8] h-11 text-[#3D4A5C] font-semibold"
              />
            </div>

            {/* End date */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-[#7A8899] uppercase tracking-wide">
                Tanggal Selesai
              </Label>
              <Input
                type="date"
                value={editEnd}
                min={editStart || undefined}
                onChange={(e) => setEditEnd(e.target.value)}
                className="rounded-xl border-[#B8D4E8]/50 bg-white/70 focus-visible:ring-[#B8D4E8] h-11 text-[#3D4A5C] font-semibold"
              />
            </div>

            {/* Retroactive-edit warning: dates changed from the saved cycle */}
            {editCycle &&
              (editStart !== editCycle.start_date.slice(0, 10) ||
                editEnd !== editCycle.end_date.slice(0, 10)) && (
                <div
                  className="rounded-2xl px-3 py-2.5 flex items-start gap-2"
                  style={{ background: 'rgba(245,230,163,0.25)', border: '1px solid rgba(245,230,163,0.5)' }}
                >
                  <AlertTriangle className="h-4 w-4 text-[#8A7A30] flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-[#8A7A30] leading-relaxed">
                    Mengubah tanggal akan mengubah transaksi mana yang dihitung di budget cycle ini.
                  </p>
                </div>
              )}

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                onClick={() => setEditCycle(null)}
                disabled={savingEdit}
                className="flex-1 h-11 rounded-2xl font-bold text-sm bg-white/70 text-[#7A8899] hover:bg-white shadow-none border border-[#B8D4E8]/30"
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={saveEdit}
                disabled={savingEdit}
                className="flex-1 h-11 rounded-2xl font-bold text-sm shadow-md transition-all active:scale-[0.98] gap-2"
                style={{
                  background: 'linear-gradient(135deg, #C9B8E8 0%, #B8A8E0 100%)',
                  color: '#3D2A5C',
                }}
              >
                {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {savingEdit ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
