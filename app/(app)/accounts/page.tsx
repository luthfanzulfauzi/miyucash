import { createClient, getActiveTrackerId } from '@/lib/supabase/server'

import { AccountsClient } from './accounts-client'
import type { AccountWithBalance } from '@/types'
import type { Database } from '@/types/supabase'

type AccountRow = Database['public']['Tables']['accounts']['Row']
type TxnRow = Pick<Database['public']['Tables']['transactions']['Row'], 'type' | 'amount' | 'account_id' | 'to_account_id'>

export const metadata = { title: 'Akun Keuangan' }

function computeBalance(
  account: { id: string; initial_balance: number },
  transactions: { type: string; amount: number; account_id: string; to_account_id: string | null }[]
): number {
  let balance = Number(account.initial_balance)
  for (const t of transactions) {
    if (t.type === 'income' && t.account_id === account.id) balance += Number(t.amount)
    if (t.type === 'expense' && t.account_id === account.id) balance -= Number(t.amount)
    if (t.type === 'transfer' && t.account_id === account.id) balance -= Number(t.amount)
    if (t.type === 'transfer' && t.to_account_id === account.id) balance += Number(t.amount)
  }
  return balance
}

export default async function AccountsPage() {
  const [supabase, trackerId] = await Promise.all([createClient(), getActiveTrackerId()])
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Fetch accounts and all transactions in parallel
  const [{ data: accounts }, { data: transactions }] = await Promise.all([
    supabase
      .from('accounts')
      .select('*')
      .eq('tracker_id', trackerId)
      .order('created_at', { ascending: true }),
    supabase
      .from('transactions')
      .select('type, amount, account_id, to_account_id')
      .eq('tracker_id', trackerId),
  ])

  const accountsWithBalance: AccountWithBalance[] = ((accounts ?? []) as AccountRow[]).map((a) => ({
    ...a,
    current_balance: computeBalance(a, (transactions ?? []) as TxnRow[]),
  }))

  return (
    <AccountsClient
      initialAccounts={accountsWithBalance}
      trackerId={trackerId}
      userId={user.id}
    />
  )
}
