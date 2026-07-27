import { createClient, getActiveTrackerId } from '@/lib/supabase/server'

import { AccountsClient } from './accounts-client'
import type { AccountWithBalance } from '@/types'
import type { Database } from '@/types/supabase'

type AccountRow = Database['public']['Tables']['accounts']['Row']

export const metadata = { title: 'Akun Keuangan' }

export default async function AccountsPage() {
  const [supabase, trackerId] = await Promise.all([createClient(), getActiveTrackerId()])
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Balances are aggregated in SQL (RPC) so they are never truncated by
  // PostgREST's max_rows, no matter how many transactions the tracker has.
  const [{ data: accounts }, { data: balances }] = await Promise.all([
    supabase
      .from('accounts')
      .select('*')
      .eq('tracker_id', trackerId)
      .order('created_at', { ascending: true }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).rpc('get_account_balances', { p_tracker_id: trackerId }),
  ])

  const balanceMap = new Map<string, number>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((balances as any[]) ?? []).map((b) => [b.acct_id as string, Number(b.balance)]),
  )

  const accountsWithBalance: AccountWithBalance[] = ((accounts ?? []) as AccountRow[]).map((a) => ({
    ...a,
    current_balance: balanceMap.get(a.id) ?? Number(a.initial_balance),
  }))

  return (
    <AccountsClient
      initialAccounts={accountsWithBalance}
      trackerId={trackerId}
      userId={user.id}
    />
  )
}
