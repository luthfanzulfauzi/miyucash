import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { TransactionWithRelations } from '@/types'
import { TransactionDetail } from './transaction-detail'

interface Props {
  params: Promise<{ id: string }>
}

export const metadata = { title: 'Detail Transaksi' }

export default async function TransactionPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Get tracker membership
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: membership } = await db
    .from('tracker_members')
    .select('tracker_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) redirect('/onboarding')

  const trackerId = (membership as { tracker_id: string }).tracker_id

  // Fetch transaction with relations
  const { data: transaction } = await db
    .from('transactions')
    .select(`
      *,
      account:accounts!account_id(id, name, type),
      to_account:accounts!to_account_id(id, name, type),
      category:categories(id, name, icon, color),
      created_by_user:users(id, name, avatar_url)
    `)
    .eq('id', id)
    .eq('tracker_id', trackerId)
    .maybeSingle()

  if (!transaction) redirect('/transactions')

  // Fetch accounts and categories for edit form
  const [{ data: accounts }, { data: categories }] = await Promise.all([
    db.from('accounts').select('*').eq('tracker_id', trackerId).order('name'),
    db.from('categories').select('*').eq('tracker_id', trackerId).order('name'),
  ])

  return (
    <TransactionDetail
      transaction={transaction as TransactionWithRelations}
      accounts={accounts ?? []}
      categories={categories ?? []}
    />
  )
}
