'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  PiggyBank,
  CalendarDays,
  ChevronRight,
  Pencil,
  XCircle,
  MoreHorizontal,
  Utensils,
  Car,
  ShoppingBag,
  Zap,
  Heart,
  Tv,
  BookOpen,
  Briefcase,
  Gift,
  Laptop,
  TrendingUp,
  Circle,
  Plus,
  Loader2,
  AlertTriangle,
  History,
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient as _createClient } from '@/lib/supabase/client'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createClient = _createClient as unknown as () => any
import { useTrackerStore } from '@/stores/tracker'
import { PixelCat } from '@/components/shared/pixel-cat'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { formatCurrency, formatDate, budgetProgressColor } from '@/lib/utils'
import type { Cycle, Category } from '@/types'

// ─── Icon map ────────────────────────────────────────────────────────────────
const ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  utensils: Utensils,
  car: Car,
  'shopping-bag': ShoppingBag,
  zap: Zap,
  heart: Heart,
  tv: Tv,
  'book-open': BookOpen,
  'more-horizontal': MoreHorizontal,
  briefcase: Briefcase,
  gift: Gift,
  laptop: Laptop,
  'trending-up': TrendingUp,
  circle: Circle,
  // Common aliases from seed data
  ShoppingCart: ShoppingBag,
  Coffee: Utensils,
  Car: Car,
  Home: Briefcase,
  Utensils: Utensils,
  Zap: Zap,
  Heart: Heart,
  Shirt: ShoppingBag,
  BookOpen: BookOpen,
  Gift: Gift,
  Plane: TrendingUp,
  Music: Circle,
  Tv: Tv,
  Gamepad2: Laptop,
  Dumbbell: Heart,
  Baby: Heart,
  Dog: Heart,
}

function CategoryIcon({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) {
  const Icon = ICONS[name] ?? MoreHorizontal
  return <Icon className={className} style={style} />
}

function daysRemaining(endDate: string): number {
  const end = new Date(endDate)
  end.setHours(23, 59, 59, 999)
  return Math.max(0, Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
}

interface BudgetWithProgress {
  id: string
  category_id: string
  amount: number
  spent: number
  pct: number
  category: Pick<Category, 'id' | 'name' | 'icon' | 'color'> | null
}

interface EditEntry {
  category_id: string
  name: string
  icon: string
  color: string | null
  amount: string
}

export default function BudgetPage() {
  const router = useRouter()
  const { trackerId, currentUser, activeCycle, setActiveCycle } = useTrackerStore()
  const [cycle, setCycle] = useState<Cycle | null>(activeCycle)
  const [budgets, setBudgets] = useState<BudgetWithProgress[]>([])
  const [untrackedTotal, setUntrackedTotal] = useState(0)
  const [totalBudget, setTotalBudget] = useState(0)
  const [totalSpent, setTotalSpent] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false)
  const [editEntries, setEditEntries] = useState<EditEntry[]>([])
  const [editLoading, setEditLoading] = useState(false)

  // Close cycle dialog
  const [closeOpen, setCloseOpen] = useState(false)
  const [closeLoading, setCloseLoading] = useState(false)

  const loadData = useCallback(async () => {
    if (!trackerId) return
    setLoading(true)
    try {
      const supabase = createClient()

      // Get active cycle
      const { data: activeCycleData } = await supabase
        .from('cycles')
        .select('*')
        .eq('tracker_id', trackerId)
        .eq('is_active', true)
        .maybeSingle()

      setCycle(activeCycleData ?? null)
      setActiveCycle(activeCycleData ?? null)

      if (!activeCycleData) {
        setLoading(false)
        return
      }

      // Get tracker owner
      const { data: trackerData } = await supabase
        .from('trackers')
        .select('owner_id')
        .eq('id', trackerId)
        .single()
      setIsOwner(trackerData?.owner_id === currentUser?.id)

      // Get budgets + categories
      const { data: rawBudgets } = await supabase
        .from('budgets')
        .select('*, category:categories(id, name, icon, color)')
        .eq('cycle_id', activeCycleData.id)

      // Get transactions in cycle range
      const { data: transactions } = await supabase
        .from('transactions')
        .select('category_id, amount, type')
        .eq('tracker_id', trackerId)
        .eq('type', 'expense')
        .gte('date', activeCycleData.start_date)
        .lte('date', activeCycleData.end_date)

      type BudgetRow = { id: string; category_id: string; amount: number; category: Pick<Category, 'id' | 'name' | 'icon' | 'color'> | null }
      type TxRow = { category_id: string | null; amount: number }
      const txList = (transactions ?? []) as TxRow[]
      const budgetList = (rawBudgets ?? []) as BudgetRow[]

      const withProgress: BudgetWithProgress[] = budgetList.map((b) => {
        const cat = b.category ?? null
        const spent = txList
          .filter((t: TxRow) => t.category_id === b.category_id)
          .reduce((s: number, t: TxRow) => s + t.amount, 0)
        const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0
        return { id: b.id, category_id: b.category_id, amount: b.amount, spent, pct, category: cat }
      })

      const budgetedCategoryIds = new Set(budgetList.map((b: BudgetRow) => b.category_id))
      const untracked = txList
        .filter((t: TxRow) => !t.category_id || !budgetedCategoryIds.has(t.category_id))
        .reduce((s: number, t: TxRow) => s + t.amount, 0)

      setBudgets(withProgress)
      setUntrackedTotal(untracked)
      setTotalBudget(budgetList.reduce((s: number, b: BudgetRow) => s + b.amount, 0))
      setTotalSpent(withProgress.reduce((s, b) => s + b.spent, 0))
    } finally {
      setLoading(false)
    }
  }, [trackerId, currentUser?.id, setActiveCycle])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function openEditDialog() {
    if (!trackerId || !cycle) return
    const supabase = createClient()
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name, icon, color')
      .eq('tracker_id', trackerId)
      .eq('type', 'expense')
      .order('name')

    const entries: EditEntry[] = (categories ?? []).map((cat: { id: string; name: string; icon: string; color: string | null }) => {
      const existing = budgets.find((b) => b.category_id === cat.id)
      return {
        category_id: cat.id,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        amount: existing ? String(existing.amount) : '',
      }
    })
    setEditEntries(entries)
    setEditOpen(true)
  }

  async function saveEditBudget() {
    if (!cycle) return
    setEditLoading(true)
    try {
      const supabase = createClient()
      await supabase.from('budgets').delete().eq('cycle_id', cycle.id)
      const toInsert = editEntries
        .filter((e) => e.amount.trim() !== '' && parseFloat(e.amount) > 0)
        .map((e) => ({
          cycle_id: cycle.id,
          category_id: e.category_id,
          amount: parseFloat(e.amount),
        }))
      if (toInsert.length > 0) {
        const { error } = await supabase.from('budgets').insert(toInsert)
        if (error) throw error
      }
      toast.success('Budget berhasil disimpan!')
      setEditOpen(false)
      await loadData()
    } catch {
      toast.error('Gagal menyimpan budget. Coba lagi.')
    } finally {
      setEditLoading(false)
    }
  }

  async function closeCycle() {
    if (!cycle) return
    setCloseLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('cycles')
        .update({ is_active: false })
        .eq('id', cycle.id)
      if (error) throw error
      toast.success('Cycle berhasil ditutup!')
      setCloseOpen(false)
      setActiveCycle(null)
      router.push('/budget')
      router.refresh()
    } catch {
      toast.error('Gagal menutup cycle. Coba lagi.')
    } finally {
      setCloseLoading(false)
    }
  }

  const overallPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0

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
              Budget
            </h1>
            <p className="text-xs text-[#7A8899] mt-0.5">
              {cycle ? `Cycle aktif · ${cycle.name}` : 'Belum ada cycle aktif'}
            </p>
          </div>
          <Link
            href="/budget/cycles"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold text-[#4A7B9D] transition-all active:scale-95"
            style={{ background: 'rgba(184,212,232,0.22)' }}
          >
            <History className="h-3.5 w-3.5" />
            Riwayat
          </Link>
        </div>
      </div>

      <div className="px-4 pb-8 space-y-4">
        {!cycle ? (
          /* ── No active cycle ── */
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
                Belum ada cycle aktif
              </p>
              <p className="text-sm text-[#7A8899] mt-1.5 leading-relaxed">
                Buat cycle baru untuk mulai melacak<br />budget dan pengeluaran kamu.
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-xs">
              <Link
                href="/budget/cycles/new"
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm shadow-sm transition-all active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #B8D4E8 0%, #A8C8E0 100%)',
                  color: '#2D3E50',
                }}
              >
                <Plus className="h-4 w-4" />
                Buat Cycle Baru
              </Link>
              <Link
                href="/budget/cycles"
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl font-semibold text-sm transition-all active:scale-95 text-[#7A8899]"
                style={{ background: 'rgba(255,255,255,0.60)' }}
              >
                Lihat Riwayat Cycle
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* ── Cycle header card ── */}
            <div
              className="rounded-3xl p-5 border relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(184,212,232,0.45) 0%, rgba(201,184,232,0.35) 100%)',
                backdropFilter: 'blur(12px)',
                borderColor: 'rgba(184,212,232,0.35)',
              }}
            >
              <div
                className="absolute -top-8 -right-8 w-36 h-36 rounded-full opacity-25 pointer-events-none"
                style={{ background: 'radial-gradient(circle, #C9B8E8 0%, transparent 70%)' }}
              />
              <div className="relative z-10">
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <CalendarDays className="h-3.5 w-3.5 text-[#4A7B9D]" />
                      <span className="text-[10px] font-bold text-[#7A8899] uppercase tracking-wider">Cycle Aktif</span>
                    </div>
                    <h2
                      className="text-lg font-extrabold text-[#3D4A5C]"
                      style={{ fontFamily: 'var(--font-nunito)' }}
                    >
                      {cycle.name}
                    </h2>
                    <p className="text-xs text-[#7A8899] mt-0.5">
                      {formatDate(cycle.start_date)} — {formatDate(cycle.end_date)}
                    </p>
                  </div>

                  {/* Days remaining badge */}
                  <div
                    className="flex-shrink-0 px-3 py-1.5 rounded-2xl text-center"
                    style={{
                      background: daysRemaining(cycle.end_date) <= 3
                        ? 'rgba(242,168,168,0.35)' : daysRemaining(cycle.end_date) <= 7
                          ? 'rgba(245,230,163,0.45)' : 'rgba(168,216,185,0.35)',
                      border: '1px solid',
                      borderColor: daysRemaining(cycle.end_date) <= 3
                        ? 'rgba(242,168,168,0.5)' : daysRemaining(cycle.end_date) <= 7
                          ? 'rgba(245,230,163,0.6)' : 'rgba(168,216,185,0.5)',
                    }}
                  >
                    <p
                      className="text-xl font-extrabold leading-none"
                      style={{
                        fontFamily: 'var(--font-nunito)',
                        color: daysRemaining(cycle.end_date) <= 3 ? '#C0605A' : daysRemaining(cycle.end_date) <= 7 ? '#8A7A30' : '#3E7A57',
                      }}
                    >
                      {daysRemaining(cycle.end_date)}
                    </p>
                    <p
                      className="text-[9px] font-bold uppercase tracking-wide"
                      style={{
                        color: daysRemaining(cycle.end_date) <= 3 ? '#C0605A' : daysRemaining(cycle.end_date) <= 7 ? '#8A7A30' : '#3E7A57',
                      }}
                    >
                      hari lagi
                    </p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={openEditDialog}
                    className="flex-1 rounded-xl font-bold text-xs gap-1.5 shadow-sm transition-all active:scale-95 h-9"
                    style={{
                      background: 'rgba(255,255,255,0.78)',
                      color: '#3D4A5C',
                      border: '1px solid rgba(184,212,232,0.4)',
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit Budget
                  </Button>
                  {isOwner && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setCloseOpen(true)}
                      className="rounded-xl font-bold text-xs gap-1.5 h-9 px-3"
                      style={{
                        background: 'rgba(242,168,168,0.2)',
                        color: '#C0605A',
                        border: '1px solid rgba(242,168,168,0.35)',
                      }}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Tutup Cycle
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* ── Summary card ── */}
            <div
              className="rounded-3xl p-5 border"
              style={{
                background: 'rgba(255,255,255,0.78)',
                backdropFilter: 'blur(12px)',
                borderColor: 'rgba(184,212,232,0.25)',
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <PiggyBank className="h-4 w-4 text-[#4A7B9D]" />
                <h3
                  className="text-sm font-extrabold text-[#3D4A5C]"
                  style={{ fontFamily: 'var(--font-nunito)' }}
                >
                  Ringkasan Budget
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div
                  className="rounded-2xl p-3"
                  style={{ background: 'rgba(184,212,232,0.15)', border: '1px solid rgba(184,212,232,0.3)' }}
                >
                  <p className="text-[10px] font-bold text-[#7A8899] uppercase tracking-wide mb-1">Total Budget</p>
                  <p
                    className="text-base font-extrabold text-[#3D4A5C] leading-tight"
                    style={{ fontFamily: 'var(--font-nunito)' }}
                  >
                    {formatCurrency(totalBudget)}
                  </p>
                </div>
                <div
                  className="rounded-2xl p-3"
                  style={{
                    background: overallPct >= 100 ? 'rgba(242,168,168,0.15)' : overallPct >= 80 ? 'rgba(245,230,163,0.15)' : 'rgba(168,216,185,0.15)',
                    border: `1px solid ${overallPct >= 100 ? 'rgba(242,168,168,0.3)' : overallPct >= 80 ? 'rgba(245,230,163,0.3)' : 'rgba(168,216,185,0.3)'}`,
                  }}
                >
                  <p className="text-[10px] font-bold text-[#7A8899] uppercase tracking-wide mb-1">Terpakai</p>
                  <p
                    className="text-base font-extrabold leading-tight"
                    style={{
                      fontFamily: 'var(--font-nunito)',
                      color: overallPct >= 100 ? '#C0605A' : overallPct >= 80 ? '#8A7A30' : '#3E7A57',
                    }}
                  >
                    {formatCurrency(totalSpent)}
                  </p>
                </div>
              </div>

              {totalBudget > 0 && (
                <>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-[#9AAAB8]">
                      Sisa: {formatCurrency(Math.max(0, totalBudget - totalSpent))}
                    </span>
                    <span
                      className="text-xs font-bold"
                      style={{
                        color: overallPct >= 100 ? '#C0605A' : overallPct >= 80 ? '#8A7A30' : '#3E7A57',
                      }}
                    >
                      {overallPct}%
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full overflow-hidden" style={{ background: '#F0EDE8' }}>
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${budgetProgressColor(overallPct)}`}
                      style={{ width: `${Math.min(overallPct, 100)}%` }}
                    />
                  </div>
                </>
              )}
            </div>

            {/* ── Budget list ── */}
            {budgets.length === 0 ? (
              <div
                className="rounded-3xl p-7 border flex flex-col items-center text-center gap-3"
                style={{
                  background: 'rgba(255,255,255,0.78)',
                  backdropFilter: 'blur(12px)',
                  borderColor: 'rgba(184,212,232,0.25)',
                }}
              >
                <PixelCat size={64} />
                <div>
                  <p
                    className="font-extrabold text-[#3D4A5C]"
                    style={{ fontFamily: 'var(--font-nunito)' }}
                  >
                    Belum ada budget
                  </p>
                  <p className="text-sm text-[#7A8899] mt-1">
                    Atur budget per kategori agar pengeluaran lebih terkontrol.
                  </p>
                </div>
                <Button
                  onClick={openEditDialog}
                  className="gap-2 rounded-2xl font-bold text-sm shadow-sm active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, #B8D4E8 0%, #A8C8E0 100%)',
                    color: '#2D3E50',
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Tambah Budget
                </Button>
              </div>
            ) : (
              <div
                className="rounded-3xl border overflow-hidden"
                style={{
                  background: 'rgba(255,255,255,0.78)',
                  backdropFilter: 'blur(12px)',
                  borderColor: 'rgba(184,212,232,0.2)',
                }}
              >
                <div
                  className="px-4 py-3 border-b flex items-center justify-between"
                  style={{ borderColor: 'rgba(184,212,232,0.2)' }}
                >
                  <h3
                    className="text-sm font-extrabold text-[#3D4A5C]"
                    style={{ fontFamily: 'var(--font-nunito)' }}
                  >
                    Per Kategori
                  </h3>
                  <span className="text-xs text-[#9AAAB8]">{budgets.length} kategori</span>
                </div>

                {budgets.map((b, idx) => {
                  const pct = Math.round(b.pct)
                  return (
                    <div
                      key={b.id}
                      className="px-4 py-4"
                      style={{ borderTop: idx > 0 ? '1px solid rgba(184,212,232,0.13)' : undefined }}
                    >
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
                            style={{ background: b.category?.color ? `${b.category.color}25` : 'rgba(184,212,232,0.2)' }}
                          >
                            <CategoryIcon
                              name={b.category?.icon ?? 'circle'}
                              className="h-4 w-4"
                              style={{ color: b.category?.color ?? '#7A8899' }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-[#3D4A5C]">
                            {b.category?.name ?? 'Kategori'}
                          </span>
                        </div>
                        <span
                          className="text-xs font-extrabold"
                          style={{
                            fontFamily: 'var(--font-nunito)',
                            color: pct >= 100 ? '#C0605A' : pct >= 80 ? '#8A7A30' : '#3E7A57',
                          }}
                        >
                          {pct}%
                        </span>
                      </div>

                      <div className="h-2 rounded-full overflow-hidden mb-1.5" style={{ background: '#F0EDE8' }}>
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${budgetProgressColor(pct)}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-[#9AAAB8]">
                          {formatCurrency(b.spent)} terpakai
                        </span>
                        <span className="text-[11px] text-[#9AAAB8]">
                          dari {formatCurrency(b.amount)}
                        </span>
                      </div>
                    </div>
                  )
                })}

                {/* Untracked block */}
                {untrackedTotal > 0 && (
                  <div
                    className="px-4 py-4"
                    style={{ borderTop: '1px solid rgba(184,212,232,0.13)' }}
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-2xl flex items-center justify-center bg-[#F0EDE8] flex-shrink-0">
                          <MoreHorizontal className="h-4 w-4 text-[#9AAAB8]" />
                        </div>
                        <span className="text-sm font-semibold text-[#7A8899]">Tidak Dianggarkan</span>
                      </div>
                      <Link
                        href="/transactions"
                        className="text-[11px] font-semibold text-[#4A7B9D] flex items-center gap-0.5"
                      >
                        Lihat
                        <ChevronRight className="h-3 w-3" />
                      </Link>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden mb-1.5" style={{ background: '#F0EDE8' }}>
                      <div className="h-full rounded-full bg-[#D0CEC8]" style={{ width: '100%' }} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[#9AAAB8]">Pengeluaran di luar budget</span>
                      <span className="text-[11px] font-semibold text-[#7A8899]">
                        {formatCurrency(untrackedTotal)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Link to cycle history */}
            <div className="flex justify-center pt-2">
              <Link
                href="/budget/cycles"
                className="flex items-center gap-1.5 text-sm font-semibold text-[#7A8899] hover:text-[#4A7B9D] transition-colors"
              >
                <History className="h-4 w-4" />
                Lihat riwayat semua cycle
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </>
        )}
      </div>

      {/* ── Edit Budget Dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent
          className="rounded-3xl border-0 max-h-[90vh] overflow-hidden flex flex-col"
          style={{
            background: 'rgba(245,240,232,0.98)',
            backdropFilter: 'blur(20px)',
            maxWidth: '92vw',
          }}
        >
          <DialogHeader className="pb-2">
            <DialogTitle
              className="text-lg font-extrabold text-[#3D4A5C]"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              Edit Budget
            </DialogTitle>
            <p className="text-xs text-[#7A8899]">
              Kosongkan field untuk tidak menganggarkan kategori tersebut.
            </p>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 -mx-1 px-1 space-y-2 py-2">
            {editEntries.map((entry, idx) => (
              <div
                key={entry.category_id}
                className="flex items-center gap-3 px-3 py-3 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.78)' }}
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: entry.color ? `${entry.color}25` : 'rgba(184,212,232,0.2)' }}
                >
                  <CategoryIcon
                    name={entry.icon}
                    className="h-4 w-4"
                    style={{ color: entry.color ?? '#7A8899' }}
                  />
                </div>
                <span className="text-sm font-semibold text-[#3D4A5C] flex-1 min-w-0 truncate">
                  {entry.name}
                </span>
                <div className="relative flex-shrink-0 w-32">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[#9AAAB8] font-medium">Rp</span>
                  <Input
                    type="number"
                    placeholder="0"
                    value={editEntries[idx].amount}
                    onChange={(e) => {
                      const updated = [...editEntries]
                      updated[idx] = { ...updated[idx], amount: e.target.value }
                      setEditEntries(updated)
                    }}
                    className="pl-7 h-9 rounded-xl border-0 text-sm font-semibold text-right text-[#3D4A5C] focus-visible:ring-[#B8D4E8]"
                    style={{ background: 'rgba(245,240,232,0.8)' }}
                  />
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="pt-3 gap-2 flex-row">
            <Button
              variant="ghost"
              onClick={() => setEditOpen(false)}
              className="flex-1 rounded-2xl font-bold text-sm text-[#7A8899] h-11"
              style={{ background: 'rgba(255,255,255,0.60)' }}
            >
              Batal
            </Button>
            <Button
              onClick={saveEditBudget}
              disabled={editLoading}
              className="flex-1 rounded-2xl font-bold text-sm shadow-sm h-11 gap-2"
              style={{
                background: 'linear-gradient(135deg, #B8D4E8 0%, #A8C8E0 100%)',
                color: '#2D3E50',
              }}
            >
              {editLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Close Cycle Confirm Dialog ── */}
      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent
          className="rounded-3xl border-0"
          style={{
            background: 'rgba(245,240,232,0.98)',
            backdropFilter: 'blur(20px)',
            maxWidth: '88vw',
          }}
        >
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(242,168,168,0.2)' }}
              >
                <AlertTriangle className="h-5 w-5 text-[#C0605A]" />
              </div>
              <DialogTitle
                className="text-base font-extrabold text-[#3D4A5C]"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                Tutup Cycle?
              </DialogTitle>
            </div>
            <p className="text-sm text-[#7A8899] leading-relaxed">
              Cycle <strong className="text-[#3D4A5C]">{cycle?.name}</strong> akan ditandai selesai.
              Kamu tidak akan bisa mengedit budget cycle ini lagi.
            </p>
          </DialogHeader>
          <DialogFooter className="gap-2 flex-row pt-2">
            <Button
              variant="ghost"
              onClick={() => setCloseOpen(false)}
              className="flex-1 rounded-2xl font-bold text-sm h-11"
              style={{ background: 'rgba(255,255,255,0.60)', color: '#7A8899' }}
            >
              Batal
            </Button>
            <Button
              onClick={closeCycle}
              disabled={closeLoading}
              className="flex-1 rounded-2xl font-bold text-sm h-11 gap-2"
              style={{ background: 'rgba(242,168,168,0.85)', color: '#7A2020' }}
            >
              {closeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Tutup Cycle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
