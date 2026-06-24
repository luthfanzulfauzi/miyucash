'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
  Search,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { PixelCat } from '@/components/shared/pixel-cat'
import type { TransactionWithRelations } from '@/types'
import { formatCurrency, formatDate, transactionAmountColor, transactionAmountPrefix } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface TransactionListProps {
  transactions: TransactionWithRelations[]
}

type FilterType = 'all' | 'expense' | 'income' | 'transfer'

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'expense', label: 'Pengeluaran' },
  { value: 'income', label: 'Pemasukan' },
  { value: 'transfer', label: 'Transfer' },
]

const TYPE_ICON = {
  expense: ArrowDownRight,
  income: ArrowUpRight,
  transfer: ArrowLeftRight,
}

const TYPE_BG: Record<string, string> = {
  expense: 'rgba(242,168,168,0.22)',
  income: 'rgba(168,216,185,0.28)',
  transfer: 'rgba(184,212,232,0.28)',
}

const TYPE_ICON_COLOR: Record<string, string> = {
  expense: '#D97B7B',
  income: '#5DAE8B',
  transfer: '#6B9DC0',
}

export function TransactionList({ transactions }: TransactionListProps) {
  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (filter !== 'all' && t.type !== filter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        const noteMatch = t.note?.toLowerCase().includes(q) ?? false
        const categoryMatch = t.category?.name.toLowerCase().includes(q) ?? false
        const accountMatch = t.account?.name.toLowerCase().includes(q) ?? false
        if (!noteMatch && !categoryMatch && !accountMatch) return false
      }
      return true
    })
  }, [transactions, filter, search])

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, TransactionWithRelations[]>()
    for (const t of filtered) {
      const day = t.date.slice(0, 10)
      if (!map.has(day)) map.set(day, [])
      map.get(day)!.push(t)
    }
    return Array.from(map.entries())
  }, [filtered])

  return (
    <div className="space-y-4">
      {/* Search + Filter */}
      <div className="space-y-3 pt-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9AAAB8]" />
          <Input
            placeholder="Cari transaksi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-2xl border-0 text-sm text-[#3D4A5C] placeholder:text-[#9AAAB8] focus-visible:ring-[#B8D4E8]"
            style={{ background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(12px)' }}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={cn(
                'flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95',
                filter === opt.value
                  ? 'text-[#3D4A5C] shadow-sm'
                  : 'text-[#7A8899] hover:text-[#3D4A5C]',
              )}
              style={
                filter === opt.value
                  ? { background: '#B8D4E8' }
                  : { background: 'rgba(255,255,255,0.60)' }
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {grouped.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <PixelCat size={72} />
          <div className="text-center">
            <p className="font-bold text-[#3D4A5C]" style={{ fontFamily: 'var(--font-nunito)' }}>
              {transactions.length === 0
                ? 'Belum ada transaksi'
                : 'Tidak ada yang cocok'}
            </p>
            <p className="text-xs text-[#9AAAB8] mt-1">
              {transactions.length === 0
                ? 'Yuk catat transaksi pertamamu!'
                : 'Coba ubah filter atau kata pencarian'}
            </p>
          </div>
          {transactions.length === 0 && (
            <Link
              href="/transactions/new"
              className="mt-2 px-5 py-2.5 rounded-2xl text-sm font-bold text-[#3D4A5C] shadow-sm transition-all active:scale-95"
              style={{ background: '#B8D4E8' }}
            >
              Tambah Transaksi
            </Link>
          )}
        </div>
      )}

      {/* Grouped list */}
      {grouped.map(([day, txns]) => (
        <div key={day} className="space-y-2">
          {/* Date separator */}
          <div className="flex items-center gap-2 px-1">
            <span className="text-xs font-bold text-[#7A8899]">{formatDate(day)}</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(184,212,232,0.35)' }} />
            <span className="text-xs text-[#9AAAB8] font-medium">
              {txns.length} transaksi
            </span>
          </div>

          {/* Cards */}
          <div
            className="rounded-3xl overflow-hidden divide-y divide-[rgba(184,212,232,0.25)]"
            style={{
              background: 'rgba(255,255,255,0.78)',
              backdropFilter: 'blur(12px)',
            }}
          >
            {txns.map((t) => {
              const Icon = TYPE_ICON[t.type]
              const label = t.type === 'transfer'
                ? 'Transfer'
                : t.category?.name ?? (t.type === 'expense' ? 'Pengeluaran' : 'Pemasukan')
              const accountLabel =
                t.type === 'transfer'
                  ? `${t.account?.name ?? '—'} → ${t.to_account?.name ?? '—'}`
                  : t.account?.name ?? '—'

              return (
                <Link
                  key={t.id}
                  href={`/transactions/${t.id}`}
                  className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-white/40 active:bg-white/60"
                >
                  {/* Icon circle */}
                  <div
                    className="flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center"
                    style={{ background: TYPE_BG[t.type] }}
                  >
                    <Icon
                      className="h-5 w-5 stroke-[2]"
                      style={{ color: TYPE_ICON_COLOR[t.type] }}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#3D4A5C] truncate leading-tight">
                      {label}
                    </p>
                    <p className="text-xs text-[#9AAAB8] truncate mt-0.5">{accountLabel}</p>
                    {t.note && (
                      <p className="text-xs text-[#7A8899] truncate mt-0.5 italic">
                        {t.note}
                      </p>
                    )}
                  </div>

                  {/* Amount */}
                  <div className="text-right flex-shrink-0">
                    <p
                      className={cn(
                        'text-sm font-bold tabular-nums',
                        transactionAmountColor(t.type),
                      )}
                    >
                      {transactionAmountPrefix(t.type)}
                      {formatCurrency(t.amount)}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
