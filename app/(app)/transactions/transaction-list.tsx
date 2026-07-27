'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

const ALL = 'all'

export function TransactionList({ transactions }: TransactionListProps) {
  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [accountFilter, setAccountFilter] = useState<string>(ALL)
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Derive account & category options from the loaded transactions
  const accountOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const t of transactions) {
      if (t.account) map.set(t.account.id, t.account.name)
      if (t.to_account) map.set(t.to_account.id, t.to_account.name)
    }
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
    )
  }, [transactions])

  const categoryOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const t of transactions) {
      if (t.category) map.set(t.category.id, t.category.name)
    }
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
    )
  }, [transactions])

  const activeCount =
    (accountFilter !== ALL ? 1 : 0) +
    (categoryFilter !== ALL ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0)

  const resetAdvanced = () => {
    setAccountFilter(ALL)
    setCategoryFilter(ALL)
    setDateFrom('')
    setDateTo('')
  }

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (filter !== 'all' && t.type !== filter) return false

      if (accountFilter !== ALL) {
        const matchesAccount =
          t.account?.id === accountFilter || t.to_account?.id === accountFilter
        if (!matchesAccount) return false
      }

      if (categoryFilter !== ALL && t.category?.id !== categoryFilter) return false

      const day = t.date.slice(0, 10)
      if (dateFrom && day < dateFrom) return false
      if (dateTo && day > dateTo) return false

      if (search.trim()) {
        const q = search.toLowerCase()
        const noteMatch = t.note?.toLowerCase().includes(q) ?? false
        const categoryMatch = t.category?.name.toLowerCase().includes(q) ?? false
        const accountMatch = t.account?.name.toLowerCase().includes(q) ?? false
        if (!noteMatch && !categoryMatch && !accountMatch) return false
      }
      return true
    })
  }, [transactions, filter, search, accountFilter, categoryFilter, dateFrom, dateTo])

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

  const selectTriggerStyle = {
    background: 'rgba(255,255,255,0.78)',
    backdropFilter: 'blur(12px)',
  }

  return (
    <div className="space-y-4">
      {/* Search + Filter */}
      <div className="space-y-3 pt-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9AAAB8]" />
            <Input
              placeholder="Cari transaksi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-2xl border-0 text-sm text-[#3D4A5C] placeholder:text-[#9AAAB8] focus-visible:ring-[#B8D4E8]"
              style={{ background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(12px)' }}
            />
          </div>
          <button
            onClick={() => setShowAdvanced((v) => !v)}
            aria-label="Filter lanjutan"
            className={cn(
              'relative flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center transition-all active:scale-95',
              showAdvanced || activeCount > 0 ? 'text-[#3D4A5C] shadow-sm' : 'text-[#7A8899]',
            )}
            style={
              showAdvanced || activeCount > 0
                ? { background: '#B8D4E8' }
                : { background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(12px)' }
            }
          >
            <SlidersHorizontal className="h-4 w-4 stroke-[2.2]" />
            {activeCount > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-extrabold flex items-center justify-center text-white"
                style={{ background: '#D97B7B' }}
              >
                {activeCount}
              </span>
            )}
          </button>
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

        {/* Advanced filters */}
        {showAdvanced && (
          <div
            className="rounded-3xl p-4 space-y-3"
            style={{ background: 'rgba(255,255,255,0.60)', backdropFilter: 'blur(12px)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#7A8899]">Filter lanjutan</span>
              {activeCount > 0 && (
                <button
                  onClick={resetAdvanced}
                  className="flex items-center gap-1 text-xs font-bold text-[#D97B7B] active:scale-95 transition-transform"
                >
                  <X className="h-3.5 w-3.5 stroke-[2.5]" />
                  Reset
                </button>
              )}
            </div>

            {/* Account */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#7A8899] px-1">Akun</label>
              <Select value={accountFilter} onValueChange={setAccountFilter}>
                <SelectTrigger
                  className="rounded-2xl border-0 text-sm text-[#3D4A5C]"
                  style={selectTriggerStyle}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Semua akun</SelectItem>
                  {accountOptions.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#7A8899] px-1">Kategori</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger
                  className="rounded-2xl border-0 text-sm text-[#3D4A5C]"
                  style={selectTriggerStyle}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Semua kategori</SelectItem>
                  {categoryOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date range */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#7A8899] px-1">Rentang tanggal</label>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={dateFrom}
                  max={dateTo || undefined}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="rounded-2xl border-0 text-sm text-[#3D4A5C] focus-visible:ring-[#B8D4E8]"
                  style={selectTriggerStyle}
                />
                <span className="text-xs text-[#9AAAB8] font-medium">—</span>
                <Input
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="rounded-2xl border-0 text-sm text-[#3D4A5C] focus-visible:ring-[#B8D4E8]"
                  style={selectTriggerStyle}
                />
              </div>
            </div>
          </div>
        )}
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
