import Link from 'next/link'
import {
  Wallet,
  Building2,
  Smartphone,
  TrendingUp,
  TrendingDown,
  Scale,
  CalendarDays,
  ChevronRight,
  PiggyBank,
  Plus,
  ArrowLeftRight,
  ShoppingCart,
  Coffee,
  Car,
  Home,
  Utensils,
  Zap,
  Heart,
  Shirt,
  BookOpen,
  Gift,
  Plane,
  Music,
  Tv,
  Gamepad2,
  Dumbbell,
  Baby,
  Dog,
  Banknote,
  CircleDollarSign,
  MoreHorizontal,
} from 'lucide-react'
import { createClient, getActiveTrackerId } from '@/lib/supabase/server'
import { PixelCat } from '@/components/shared/pixel-cat'
import { DashboardCharts } from '@/components/dashboard/dashboard-charts'
import {
  formatCurrency,
  formatDate,
  budgetProgressColor,
  transactionAmountColor,
  transactionAmountPrefix,
} from '@/lib/utils'
import type {
  Account,
  Category,
  Cycle,
  CategoryWithBudget,
  TransactionWithRelations,
  DashboardSummary,
  AccountWithBalance,
} from '@/types'
import type { Database } from '@/types/supabase'

type TxRow = Database['public']['Tables']['transactions']['Row']
type BudgetRow = Database['public']['Tables']['budgets']['Row']
type AccRow = Pick<Database['public']['Tables']['accounts']['Row'], 'id' | 'name' | 'type'>
type CatRow = Pick<Database['public']['Tables']['categories']['Row'], 'id' | 'name' | 'icon' | 'color'>
type UserRow = Pick<Database['public']['Tables']['users']['Row'], 'id' | 'name' | 'avatar_url'>

// ─── Lucide icon lookup by name ──────────────────────────────────────────────
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  ShoppingCart,
  Coffee,
  Car,
  Home,
  Utensils,
  Zap,
  Heart,
  Shirt,
  BookOpen,
  Gift,
  Plane,
  Music,
  Tv,
  Gamepad2,
  Dumbbell,
  Baby,
  Dog,
  Banknote,
  CircleDollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
}

function CategoryIcon({
  name,
  className,
}: {
  name: string
  className?: string
}) {
  const Icon = ICON_MAP[name] ?? MoreHorizontal
  return <Icon className={className} />
}

// ─── Account type icons ───────────────────────────────────────────────────────
function AccountTypeIcon({
  type,
  className,
}: {
  type: Account['type']
  className?: string
}) {
  if (type === 'cash') return <Wallet className={className} />
  if (type === 'bank') return <Building2 className={className} />
  return <Smartphone className={className} />
}

// ─── Account type label ───────────────────────────────────────────────────────
function accountTypeLabel(type: Account['type']): string {
  if (type === 'cash') return 'Tunai'
  if (type === 'bank') return 'Bank'
  return 'E-Wallet'
}

// ─── Days remaining helper ────────────────────────────────────────────────────
function daysRemaining(endDate: string): number {
  const end = new Date(endDate)
  const now = new Date()
  end.setHours(23, 59, 59, 999)
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(0, diff)
}

// ─── Transaction type dot ─────────────────────────────────────────────────────
function TxTypeDot({ type }: { type: 'expense' | 'income' | 'transfer' }) {
  const color =
    type === 'income'
      ? 'bg-[#A8D8B9]'
      : type === 'expense'
        ? 'bg-[#F2A8A8]'
        : 'bg-[#C9B8E8]'
  return <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 mt-1 ${color}`} />
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default async function DashboardPage() {
  const [supabase, trackerId] = await Promise.all([createClient(), getActiveTrackerId()])

  // Step 1: user + profile
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) return null

  const { data: profileRaw } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle()
  const profile = profileRaw as { name: string; email: string; avatar_url: string | null } | null

  // Step 2: active cycle + accounts + tracker name
  const { data: activeCycleRaw } = await supabase
    .from('cycles')
    .select('*')
    .eq('tracker_id', trackerId)
    .eq('is_active', true)
    .maybeSingle()

  const { data: rawAccounts } = await supabase
    .from('accounts')
    .select('*')
    .eq('tracker_id', trackerId)
    .order('created_at', { ascending: true })

  const { data: trackerDataRaw } = await supabase
    .from('trackers')
    .select('id, name')
    .eq('id', trackerId)
    .maybeSingle()
  const trackerData = trackerDataRaw as { id: string; name: string } | null

  const accounts: Account[] = (rawAccounts as Account[] | null) ?? []
  const cycle: Cycle | null = activeCycleRaw as Cycle | null

  // Step 3: if cycle, fetch transactions in cycle range + budgets + categories
  let summary: DashboardSummary = {
    total_income: 0,
    total_expense: 0,
    net_balance: 0,
    untracked_total: 0,
  }
  let budgetRows: CategoryWithBudget[] = []
  let recentTxs: TransactionWithRelations[] = []
  let categorySpendingData: { name: string; spent: number; color: string }[] = []

  if (cycle) {
    const [
      { data: cycleTxsRaw },
      { data: budgetsRaw },
      { data: categoriesRaw },
      { data: recentRaw },
    ] = await Promise.all([
      // All cycle transactions (expense + income)
      supabase
        .from('transactions')
        .select('*')
        .eq('tracker_id', trackerId)
        .or(`type.eq.expense,type.eq.income`)
        .gte('date', cycle.start_date)
        .lte('date', cycle.end_date),
      // Budgets for this cycle
      supabase.from('budgets').select('*').eq('cycle_id', cycle.id),
      // All expense categories
      supabase
        .from('categories')
        .select('*')
        .eq('tracker_id', trackerId)
        .eq('type', 'expense'),
      // Recent 5 transactions (any type)
      supabase
        .from('transactions')
        .select('*')
        .eq('tracker_id', trackerId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    const txList: TxRow[] = (cycleTxsRaw as TxRow[] | null) ?? []
    const budgetList: BudgetRow[] = (budgetsRaw as BudgetRow[] | null) ?? []
    const catList: Category[] = (categoriesRaw as Category[] | null) ?? []

    // Compute summary
    const totalIncome = txList
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + t.amount, 0)
    const totalExpense = txList
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0)

    // Budgeted category IDs
    const budgetedCategoryIds = new Set(budgetList.map((b) => b.category_id))

    // Untracked = expense with null category OR category not in any budget
    const untrackedTotal = txList
      .filter(
        (t) =>
          t.type === 'expense' &&
          (t.category_id === null || !budgetedCategoryIds.has(t.category_id)),
      )
      .reduce((s, t) => s + t.amount, 0)

    summary = {
      total_income: totalIncome,
      total_expense: totalExpense,
      net_balance: totalIncome - totalExpense,
      untracked_total: untrackedTotal,
    }

    // Category spending for charts (all expense categories, budgeted or not)
    const categorySpendingMap: Record<string, { name: string; spent: number; color: string }> = {}
    for (const tx of txList.filter((t) => t.type === 'expense')) {
      const cat = tx.category_id ? catList.find((c) => c.id === tx.category_id) : null
      const key = cat?.id ?? 'other'
      if (!categorySpendingMap[key]) {
        categorySpendingMap[key] = {
          name: cat?.name ?? 'Lainnya',
          spent: 0,
          color: cat?.color ?? '#B8D4E8',
        }
      }
      categorySpendingMap[key].spent += tx.amount
    }
    categorySpendingData = Object.values(categorySpendingMap)

    // Budget progress per category
    budgetRows = budgetList
      .map((b) => {
        const cat = catList.find((c) => c.id === b.category_id)
        if (!cat) return null
        const spent = txList
          .filter((t) => t.type === 'expense' && t.category_id === b.category_id)
          .reduce((s, t) => s + t.amount, 0)
        const pct = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0
        return {
          ...cat,
          budget_limit: b.amount,
          spent,
          pct,
        } as CategoryWithBudget
      })
      .filter(Boolean) as CategoryWithBudget[]

    // Enrich recent transactions
    const recentList: TxRow[] = (recentRaw as TxRow[] | null) ?? []
    if (recentList.length > 0) {
      const accountIds: string[] = [...new Set(
        recentList.flatMap((t) => {
          const ids: string[] = [t.account_id]
          if (t.to_account_id) ids.push(t.to_account_id)
          return ids
        })
      )]
      const categoryIds: string[] = [...new Set(
        recentList.map((t) => t.category_id).filter((id): id is string => id !== null)
      )]
      const userIds: string[] = [...new Set(recentList.map((t) => t.created_by))]

      const { data: txAccounts } = await supabase
        .from('accounts')
        .select('id, name, type')
        .in('id', accountIds)

      const { data: txUsers } = await supabase
        .from('users')
        .select('id, name, avatar_url')
        .in('id', userIds)

      let txCategories: CatRow[] = []
      if (categoryIds.length > 0) {
        const { data: catData } = await supabase
          .from('categories')
          .select('id, name, icon, color')
          .in('id', categoryIds)
        txCategories = (catData as CatRow[] | null) ?? []
      }

      const rawTxAccounts: AccRow[] = (txAccounts as AccRow[] | null) ?? []
      const rawTxUsers: UserRow[] = (txUsers as UserRow[] | null) ?? []

      const accMap: Record<string, AccRow> = Object.fromEntries(rawTxAccounts.map((a) => [a.id, a]))
      const catMap: Record<string, CatRow> = Object.fromEntries(txCategories.map((c) => [c.id, c]))
      const usrMap: Record<string, UserRow> = Object.fromEntries(rawTxUsers.map((u) => [u.id, u]))

      recentTxs = recentList.map((t) => ({
        ...t,
        account: accMap[t.account_id] ?? { id: t.account_id, name: '—', type: 'cash' as const },
        to_account: t.to_account_id ? (accMap[t.to_account_id] ?? null) : null,
        category: t.category_id ? (catMap[t.category_id] ?? null) : null,
        created_by_user: usrMap[t.created_by] ?? null,
      })) as unknown as TransactionWithRelations[]
    }
  } else {
    // No cycle — still fetch recent 5 transactions
    const { data: recentRaw } = await supabase
      .from('transactions')
      .select('*')
      .eq('tracker_id', trackerId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5)

    const recentList: TxRow[] = (recentRaw as TxRow[] | null) ?? []
    if (recentList.length > 0) {
      const accountIds: string[] = [...new Set(
        recentList.flatMap((t) => {
          const ids: string[] = [t.account_id]
          if (t.to_account_id) ids.push(t.to_account_id)
          return ids
        })
      )]
      const categoryIds: string[] = [...new Set(
        recentList.map((t) => t.category_id).filter((id): id is string => id !== null)
      )]

      const { data: txAccounts } = await supabase
        .from('accounts')
        .select('id, name, type')
        .in('id', accountIds)

      let txCategories: CatRow[] = []
      if (categoryIds.length > 0) {
        const { data: catData } = await supabase
          .from('categories')
          .select('id, name, icon, color')
          .in('id', categoryIds)
        txCategories = (catData as CatRow[] | null) ?? []
      }

      const rawTxAccounts: AccRow[] = (txAccounts as AccRow[] | null) ?? []
      const accMap: Record<string, AccRow> = Object.fromEntries(rawTxAccounts.map((a) => [a.id, a]))
      const catMap: Record<string, CatRow> = Object.fromEntries(txCategories.map((c) => [c.id, c]))

      recentTxs = recentList.map((t) => ({
        ...t,
        account: accMap[t.account_id] ?? { id: t.account_id, name: '—', type: 'cash' as const },
        to_account: t.to_account_id ? (accMap[t.to_account_id] ?? null) : null,
        category: t.category_id ? (catMap[t.category_id] ?? null) : null,
        created_by_user: null,
      })) as unknown as TransactionWithRelations[]
    }
  }

  // Step 4: Account balances
  // Balance = initial_balance + SUM(income) - SUM(expense) + SUM(transfer_in) - SUM(transfer_out)
  type AmountRow = { amount: number }
  const accountsWithBalance: AccountWithBalance[] = await Promise.all(
    accounts.map(async (acc) => {
      const { data: incomeData } = await supabase
        .from('transactions')
        .select('amount')
        .eq('account_id', acc.id)
        .eq('type', 'income')

      const { data: expenseData } = await supabase
        .from('transactions')
        .select('amount')
        .eq('account_id', acc.id)
        .eq('type', 'expense')

      const { data: transferInData } = await supabase
        .from('transactions')
        .select('amount')
        .eq('to_account_id', acc.id)
        .eq('type', 'transfer')

      const { data: transferOutData } = await supabase
        .from('transactions')
        .select('amount')
        .eq('account_id', acc.id)
        .eq('type', 'transfer')

      const income = ((incomeData as AmountRow[] | null) ?? []).reduce((s, r) => s + r.amount, 0)
      const expense = ((expenseData as AmountRow[] | null) ?? []).reduce((s, r) => s + r.amount, 0)
      const transferIn = ((transferInData as AmountRow[] | null) ?? []).reduce((s, r) => s + r.amount, 0)
      const transferOut = ((transferOutData as AmountRow[] | null) ?? []).reduce((s, r) => s + r.amount, 0)

      return {
        ...acc,
        current_balance: acc.initial_balance + income - expense + transferIn - transferOut,
      }
    }),
  )

  const userName = profile?.name ?? authUser.email?.split('@')[0] ?? 'Kamu'
  const trackerName = trackerData?.name ?? 'Tracker'
  const today = new Date()

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="px-4 pt-6 pb-4 space-y-5">

      {/* ── 1. Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1
            className="text-2xl font-extrabold text-[#3D4A5C] leading-tight"
            style={{ fontFamily: 'var(--font-nunito), sans-serif' }}
          >
            Hai, {userName}! 👋
          </h1>
          <p className="text-sm text-[#7A8899] mt-0.5">
            {formatDate(today.toISOString(), 'EEEE, dd MMMM yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 mt-1">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
            style={{
              background: 'rgba(184,212,232,0.25)',
              color: '#4A7B9D',
              border: '1px solid rgba(184,212,232,0.5)',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#4A7B9D] inline-block" />
            {trackerName}
          </span>
        </div>
      </div>

      {/* ── 2. Cycle header card ────────────────────────────────────────────── */}
      {cycle ? (
        <div
          className="rounded-3xl p-5 border relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(184,212,232,0.45) 0%, rgba(201,184,232,0.35) 100%)',
            backdropFilter: 'blur(12px)',
            borderColor: 'rgba(184,212,232,0.35)',
          }}
        >
          {/* Decorative blobs */}
          <div
            className="absolute -top-6 -right-6 w-28 h-28 rounded-full opacity-30 pointer-events-none"
            style={{ background: 'radial-gradient(circle, #C9B8E8 0%, transparent 70%)' }}
          />
          <div className="relative z-10">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CalendarDays className="h-4 w-4 text-[#4A7B9D]" />
                  <span className="text-xs font-semibold text-[#7A8899] uppercase tracking-wide">
                    Cycle Aktif
                  </span>
                </div>
                <h2
                  className="text-lg font-extrabold text-[#3D4A5C]"
                  style={{ fontFamily: 'var(--font-nunito), sans-serif' }}
                >
                  {cycle.name}
                </h2>
                <p className="text-sm text-[#7A8899] mt-0.5">
                  {formatDate(cycle.start_date)} — {formatDate(cycle.end_date)}
                </p>
              </div>
              <div
                className="flex-shrink-0 px-3 py-1.5 rounded-2xl text-center"
                style={{
                  background:
                    daysRemaining(cycle.end_date) <= 3
                      ? 'rgba(242,168,168,0.35)'
                      : daysRemaining(cycle.end_date) <= 7
                        ? 'rgba(245,230,163,0.45)'
                        : 'rgba(168,216,185,0.35)',
                  border: '1px solid',
                  borderColor:
                    daysRemaining(cycle.end_date) <= 3
                      ? 'rgba(242,168,168,0.5)'
                      : daysRemaining(cycle.end_date) <= 7
                        ? 'rgba(245,230,163,0.6)'
                        : 'rgba(168,216,185,0.5)',
                }}
              >
                <p
                  className="text-xl font-extrabold leading-none"
                  style={{
                    fontFamily: 'var(--font-nunito), sans-serif',
                    color:
                      daysRemaining(cycle.end_date) <= 3
                        ? '#C0605A'
                        : daysRemaining(cycle.end_date) <= 7
                          ? '#8A7A30'
                          : '#3E7A57',
                  }}
                >
                  {daysRemaining(cycle.end_date)}
                </p>
                <p
                  className="text-[10px] font-semibold uppercase tracking-wide"
                  style={{
                    color:
                      daysRemaining(cycle.end_date) <= 3
                        ? '#C0605A'
                        : daysRemaining(cycle.end_date) <= 7
                          ? '#8A7A30'
                          : '#3E7A57',
                  }}
                >
                  hari lagi
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="rounded-3xl p-6 border flex flex-col items-center text-center gap-3"
          style={{
            background: 'rgba(255,255,255,0.78)',
            backdropFilter: 'blur(12px)',
            borderColor: 'rgba(184,212,232,0.3)',
          }}
        >
          <PixelCat size={64} />
          <div>
            <p
              className="font-extrabold text-[#3D4A5C] text-base"
              style={{ fontFamily: 'var(--font-nunito), sans-serif' }}
            >
              Belum ada cycle aktif
            </p>
            <p className="text-sm text-[#7A8899] mt-1">
              Buat cycle baru untuk mulai melacak budget bulanan
            </p>
          </div>
          <Link
            href="/budget/cycles/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm shadow-sm transition-all hover:shadow-md active:scale-[0.97]"
            style={{
              background: 'linear-gradient(135deg, #B8D4E8 0%, #A8C8E0 100%)',
              color: '#2D3E50',
            }}
          >
            <Plus className="h-4 w-4" />
            Buat Cycle Baru
          </Link>
        </div>
      )}

      {/* ── 3. Summary cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {/* Income */}
        <div
          className="rounded-2xl p-3 border flex flex-col gap-1"
          style={{
            background: 'rgba(168,216,185,0.2)',
            borderColor: 'rgba(168,216,185,0.45)',
          }}
        >
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-lg bg-[#A8D8B9]/50 flex items-center justify-center">
              <TrendingUp className="h-3 w-3 text-[#3E7A57]" />
            </div>
            <span className="text-[10px] font-semibold text-[#3E7A57] uppercase tracking-wide leading-none">
              Pemasukan
            </span>
          </div>
          <p
            className="text-sm font-extrabold text-[#2D5A3E] leading-tight mt-0.5"
            style={{ fontFamily: 'var(--font-nunito), sans-serif' }}
          >
            {cycle ? formatCurrency(summary.total_income) : '—'}
          </p>
        </div>

        {/* Expense */}
        <div
          className="rounded-2xl p-3 border flex flex-col gap-1"
          style={{
            background: 'rgba(242,168,168,0.2)',
            borderColor: 'rgba(242,168,168,0.4)',
          }}
        >
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-lg bg-[#F2A8A8]/50 flex items-center justify-center">
              <TrendingDown className="h-3 w-3 text-[#C05050]" />
            </div>
            <span className="text-[10px] font-semibold text-[#C05050] uppercase tracking-wide leading-none">
              Pengeluaran
            </span>
          </div>
          <p
            className="text-sm font-extrabold text-[#8B3535] leading-tight mt-0.5"
            style={{ fontFamily: 'var(--font-nunito), sans-serif' }}
          >
            {cycle ? formatCurrency(summary.total_expense) : '—'}
          </p>
        </div>

        {/* Net balance */}
        <div
          className="rounded-2xl p-3 border flex flex-col gap-1"
          style={{
            background: 'rgba(184,212,232,0.2)',
            borderColor: 'rgba(184,212,232,0.4)',
          }}
        >
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-lg bg-[#B8D4E8]/50 flex items-center justify-center">
              <Scale className="h-3 w-3 text-[#4A7B9D]" />
            </div>
            <span className="text-[10px] font-semibold text-[#4A7B9D] uppercase tracking-wide leading-none">
              Selisih
            </span>
          </div>
          <p
            className="text-sm font-extrabold leading-tight mt-0.5"
            style={{
              fontFamily: 'var(--font-nunito), sans-serif',
              color: cycle
                ? summary.net_balance >= 0
                  ? '#2D5A3E'
                  : '#8B3535'
                : '#3D4A5C',
            }}
          >
            {cycle ? formatCurrency(summary.net_balance) : '—'}
          </p>
        </div>
      </div>

      {/* ── 4. Charts (only if cycle active with data) ─────────────────────── */}
      {cycle && (summary.total_income > 0 || summary.total_expense > 0) && (
        <DashboardCharts
          totalIncome={summary.total_income}
          totalExpense={summary.total_expense}
          categorySpending={categorySpendingData}
        />
      )}

      {/* ── 5. Account balances ─────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2
            className="text-base font-extrabold text-[#3D4A5C]"
            style={{ fontFamily: 'var(--font-nunito), sans-serif' }}
          >
            Akun
          </h2>
          <Link
            href="/accounts"
            className="text-xs font-semibold text-[#4A7B9D] flex items-center gap-0.5 hover:text-[#3A6585] transition-colors"
          >
            Lihat semua
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {accountsWithBalance.length === 0 ? (
          <div
            className="rounded-3xl p-6 border flex flex-col items-center text-center gap-3"
            style={{
              background: 'rgba(255,255,255,0.78)',
              backdropFilter: 'blur(12px)',
              borderColor: 'rgba(184,212,232,0.25)',
            }}
          >
            <PixelCat size={56} />
            <div>
              <p
                className="font-bold text-[#3D4A5C] text-sm"
                style={{ fontFamily: 'var(--font-nunito), sans-serif' }}
              >
                Belum ada akun
              </p>
              <p className="text-xs text-[#7A8899] mt-0.5">
                Tambahkan rekening atau dompet untuk mulai
              </p>
            </div>
            <Link
              href="/accounts"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs shadow-sm transition-all hover:shadow-md active:scale-[0.97]"
              style={{
                background: 'linear-gradient(135deg, #B8D4E8 0%, #A8C8E0 100%)',
                color: '#2D3E50',
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Tambah Akun
            </Link>
          </div>
        ) : (
          <div className="space-y-2.5">
            {accountsWithBalance.map((acc) => (
              <div
                key={acc.id}
                className="rounded-2xl px-4 py-3.5 border flex items-center justify-between gap-3"
                style={{
                  background: 'rgba(255,255,255,0.78)',
                  backdropFilter: 'blur(12px)',
                  borderColor: 'rgba(184,212,232,0.2)',
                  boxShadow: '0 1px 4px rgba(61,74,92,0.05)',
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background:
                        acc.type === 'cash'
                          ? 'rgba(168,216,185,0.3)'
                          : acc.type === 'bank'
                            ? 'rgba(184,212,232,0.3)'
                            : 'rgba(201,184,232,0.3)',
                    }}
                  >
                    <AccountTypeIcon
                      type={acc.type}
                      className={
                        acc.type === 'cash'
                          ? 'h-5 w-5 text-[#3E7A57]'
                          : acc.type === 'bank'
                            ? 'h-5 w-5 text-[#4A7B9D]'
                            : 'h-5 w-5 text-[#7B5EA7]'
                      }
                    />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#3D4A5C] leading-tight">
                      {acc.name}
                    </p>
                    <p className="text-xs text-[#9AAAB8] mt-0.5">
                      {accountTypeLabel(acc.type)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className="text-sm font-extrabold leading-tight"
                    style={{
                      fontFamily: 'var(--font-nunito), sans-serif',
                      color: acc.current_balance >= 0 ? '#3D4A5C' : '#C05050',
                    }}
                  >
                    {formatCurrency(acc.current_balance)}
                  </p>
                  <p className="text-[10px] text-[#B0BEC8] mt-0.5">{acc.currency}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── 6. Budget progress (only if cycle) ─────────────────────────────── */}
      {cycle && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2
              className="text-base font-extrabold text-[#3D4A5C]"
              style={{ fontFamily: 'var(--font-nunito), sans-serif' }}
            >
              Budget
            </h2>
            <Link
              href="/budget"
              className="text-xs font-semibold text-[#4A7B9D] flex items-center gap-0.5 hover:text-[#3A6585] transition-colors"
            >
              Kelola
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {budgetRows.length === 0 ? (
            <div
              className="rounded-3xl p-6 border flex flex-col items-center text-center gap-3"
              style={{
                background: 'rgba(255,255,255,0.78)',
                backdropFilter: 'blur(12px)',
                borderColor: 'rgba(184,212,232,0.25)',
              }}
            >
              <PixelCat size={56} />
              <div>
                <p
                  className="font-bold text-[#3D4A5C] text-sm"
                  style={{ fontFamily: 'var(--font-nunito), sans-serif' }}
                >
                  Belum ada budget
                </p>
                <p className="text-xs text-[#7A8899] mt-0.5">
                  Atur budget per kategori agar pengeluaran lebih terkontrol
                </p>
              </div>
              <Link
                href="/budget"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs shadow-sm transition-all hover:shadow-md active:scale-[0.97]"
                style={{
                  background: 'linear-gradient(135deg, #B8D4E8 0%, #A8C8E0 100%)',
                  color: '#2D3E50',
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Tambah Budget
              </Link>
            </div>
          ) : (
            <div
              className="rounded-3xl border overflow-hidden divide-y divide-[#B8D4E8]/20"
              style={{
                background: 'rgba(255,255,255,0.78)',
                backdropFilter: 'blur(12px)',
                borderColor: 'rgba(184,212,232,0.2)',
              }}
            >
              {budgetRows.map((b) => (
                <div key={b.id} className="px-4 py-3.5" style={{ borderColor: 'rgba(184,212,232,0.15)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                          background: b.color ? `${b.color}30` : 'rgba(184,212,232,0.2)',
                        }}
                      >
                        <CategoryIcon
                          name={b.icon}
                          className="h-4 w-4"
                          // @ts-expect-error style prop on icon
                          style={{ color: b.color ?? '#7A8899' }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-[#3D4A5C]">{b.name}</span>
                    </div>
                    <div className="text-right">
                      <span
                        className="text-xs font-bold"
                        style={{
                          color:
                            b.pct >= 100
                              ? '#C05050'
                              : b.pct >= 80
                                ? '#8A7A30'
                                : '#3E7A57',
                        }}
                      >
                        {b.pct}%
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="h-2 rounded-full bg-[#F0EDE8] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${budgetProgressColor(b.pct)}`}
                      style={{ width: `${Math.min(b.pct, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[11px] text-[#9AAAB8]">
                      {formatCurrency(b.spent)} dipakai
                    </span>
                    <span className="text-[11px] text-[#9AAAB8]">
                      dari {formatCurrency(b.budget_limit)}
                    </span>
                  </div>
                </div>
              ))}

              {/* Untracked block */}
              {summary.untracked_total > 0 && (
                <div
                  className="px-4 py-3.5"
                  style={{ borderColor: 'rgba(184,212,232,0.15)' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#F0EDE8]">
                        <MoreHorizontal className="h-4 w-4 text-[#9AAAB8]" />
                      </div>
                      <span className="text-sm font-semibold text-[#7A8899]">
                        Tidak Dianggarkan
                      </span>
                    </div>
                    <Link
                      href="/transactions"
                      className="text-xs font-semibold text-[#4A7B9D] flex items-center gap-0.5 hover:text-[#3A6585] transition-colors"
                    >
                      Lihat
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                  <div className="h-2 rounded-full bg-[#F0EDE8] overflow-hidden">
                    <div className="h-full rounded-full bg-[#D0CEC8]" style={{ width: '100%' }} />
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[11px] text-[#9AAAB8]">
                      Total tidak dianggarkan
                    </span>
                    <span className="text-[11px] font-semibold text-[#7A8899]">
                      {formatCurrency(summary.untracked_total)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* ── 7. Recent transactions ──────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2
            className="text-base font-extrabold text-[#3D4A5C]"
            style={{ fontFamily: 'var(--font-nunito), sans-serif' }}
          >
            Transaksi Terbaru
          </h2>
          <Link
            href="/transactions"
            className="text-xs font-semibold text-[#4A7B9D] flex items-center gap-0.5 hover:text-[#3A6585] transition-colors"
          >
            Lihat semua
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recentTxs.length === 0 ? (
          <div
            className="rounded-3xl p-6 border flex flex-col items-center text-center gap-3"
            style={{
              background: 'rgba(255,255,255,0.78)',
              backdropFilter: 'blur(12px)',
              borderColor: 'rgba(184,212,232,0.25)',
            }}
          >
            <PixelCat size={56} />
            <div>
              <p
                className="font-bold text-[#3D4A5C] text-sm"
                style={{ fontFamily: 'var(--font-nunito), sans-serif' }}
              >
                Belum ada transaksi
              </p>
              <p className="text-xs text-[#7A8899] mt-0.5">
                Catat transaksi pertama kamu!
              </p>
            </div>
            <Link
              href="/transactions/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs shadow-sm transition-all hover:shadow-md active:scale-[0.97]"
              style={{
                background: 'linear-gradient(135deg, #B8D4E8 0%, #A8C8E0 100%)',
                color: '#2D3E50',
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Catat Transaksi
            </Link>
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
            {recentTxs.map((tx, idx) => (
              <div
                key={tx.id}
                className="flex items-center gap-3 px-4 py-3.5"
                style={{
                  borderTop: idx > 0 ? '1px solid rgba(184,212,232,0.15)' : undefined,
                }}
              >
                {/* Type dot + category icon */}
                <div className="relative flex-shrink-0">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center"
                    style={{
                      background:
                        tx.type === 'income'
                          ? 'rgba(168,216,185,0.25)'
                          : tx.type === 'expense'
                            ? 'rgba(242,168,168,0.25)'
                            : 'rgba(201,184,232,0.25)',
                    }}
                  >
                    {tx.type === 'transfer' ? (
                      <ArrowLeftRight
                        className="h-4 w-4"
                        style={{ color: '#7B5EA7' }}
                      />
                    ) : tx.category ? (
                      <CategoryIcon
                        name={tx.category.icon}
                        className="h-4 w-4"
                        // @ts-expect-error style prop
                        style={{ color: tx.category.color ?? (tx.type === 'income' ? '#3E7A57' : '#C05050') }}
                      />
                    ) : (
                      <MoreHorizontal
                        className="h-4 w-4"
                        style={{ color: tx.type === 'income' ? '#3E7A57' : '#C05050' }}
                      />
                    )}
                  </div>
                  <TxTypeDot type={tx.type} />
                </div>

                {/* Label */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#3D4A5C] truncate leading-tight">
                    {tx.type === 'transfer'
                      ? `${tx.account.name} → ${tx.to_account?.name ?? '—'}`
                      : tx.category?.name ?? (tx.note ?? 'Transaksi')}
                  </p>
                  <p className="text-[11px] text-[#9AAAB8] mt-0.5 truncate">
                    {tx.account.name}
                    {tx.note && tx.category && (
                      <span className="ml-1 text-[#B0BEC8]">· {tx.note}</span>
                    )}
                  </p>
                </div>

                {/* Amount + date */}
                <div className="text-right flex-shrink-0">
                  <p
                    className={`text-sm font-extrabold leading-tight ${transactionAmountColor(tx.type)}`}
                    style={{ fontFamily: 'var(--font-nunito), sans-serif' }}
                  >
                    {transactionAmountPrefix(tx.type)}
                    {formatCurrency(tx.amount)}
                  </p>
                  <p className="text-[10px] text-[#B0BEC8] mt-0.5">
                    {formatDate(tx.date, 'dd MMM')}
                  </p>
                </div>
              </div>
            ))}

            {/* Footer link */}
            <div
              className="px-4 py-3 border-t flex items-center justify-center"
              style={{ borderColor: 'rgba(184,212,232,0.15)' }}
            >
              <Link
                href="/transactions"
                className="text-xs font-bold text-[#4A7B9D] flex items-center gap-1 hover:text-[#3A6585] transition-colors"
              >
                Lihat semua transaksi
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* ── FAB: Quick add transaction ─────────────────────────────────────── */}
      <div className="h-4" />
    </div>
  )
}
