import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { TransactionWithRelations } from '@/types'
import { TransactionList } from './transaction-list'

export const metadata = { title: 'Transaksi' }

export default async function TransactionsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Get tracker_id from membership
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: membership } = await db
    .from('tracker_members')
    .select('tracker_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) redirect('/onboarding')

  const trackerId = (membership as { tracker_id: string }).tracker_id

  // Fetch transactions with all relations
  const { data: transactions } = await db
    .from('transactions')
    .select(`
      *,
      account:accounts!account_id(id, name, type),
      to_account:accounts!to_account_id(id, name, type),
      category:categories(id, name, icon, color),
      created_by_user:users(id, name, avatar_url)
    `)
    .eq('tracker_id', trackerId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="min-h-screen" style={{ background: '#F5F0E8' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-30 px-4 pt-6 pb-4"
        style={{
          background: 'rgba(245,240,232,0.90)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-2xl font-extrabold text-[#3D4A5C] tracking-tight"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              Transaksi
            </h1>
            <p className="text-xs text-[#7A8899] mt-0.5">
              {transactions?.length ?? 0} transaksi terakhir
            </p>
          </div>
          <Link
            href="/transactions/new"
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl font-bold text-sm text-[#3D4A5C] transition-all active:scale-95 shadow-sm"
            style={{ background: '#B8D4E8' }}
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            Tambah
          </Link>
        </div>
      </div>

      {/* Transaction list with filters */}
      <div className="px-4 pb-6">
        <TransactionList transactions={(transactions as TransactionWithRelations[]) ?? []} />
      </div>
    </div>
  )
}
