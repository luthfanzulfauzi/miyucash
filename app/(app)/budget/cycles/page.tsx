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
} from 'lucide-react'
import { createClient as _createClient } from '@/lib/supabase/client'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createClient = _createClient as unknown as () => any
import { useTrackerStore } from '@/stores/tracker'
import { PixelCat } from '@/components/shared/pixel-cat'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Cycle } from '@/types'

interface CycleWithSummary extends Cycle {
  totalBudget: number
  totalSpent: number
  pct: number
}

function budgetBarColor(pct: number) {
  if (pct >= 100) return '#F2A8A8'
  if (pct >= 80) return '#F5E6A3'
  return '#A8D8B9'
}

export default function CyclesPage() {
  const { trackerId } = useTrackerStore()
  const [cycles, setCycles] = useState<CycleWithSummary[]>([])
  const [loading, setLoading] = useState(true)

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
                  {cycle.is_active && (
                    <Link
                      href="/budget"
                      className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold text-[#4A7B9D]"
                    >
                      Kelola
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
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
    </div>
  )
}
