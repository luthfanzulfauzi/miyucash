import type { Database } from './supabase'

export type User = Database['public']['Tables']['users']['Row']
export type Tracker = Database['public']['Tables']['trackers']['Row']
export type TrackerMember = Database['public']['Tables']['tracker_members']['Row']
export type Account = Database['public']['Tables']['accounts']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type Cycle = Database['public']['Tables']['cycles']['Row']
export type Budget = Database['public']['Tables']['budgets']['Row']
export type Transaction = Database['public']['Tables']['transactions']['Row']

export type AccountType = 'cash' | 'bank' | 'ewallet'
export type CategoryType = 'expense' | 'income'
export type TransactionType = 'expense' | 'income' | 'transfer'

export interface AccountWithBalance extends Account {
  current_balance: number
}

export interface CategoryWithBudget extends Category {
  budget_limit: number
  spent: number
  pct: number
}

export interface TransactionWithRelations extends Transaction {
  account: Pick<Account, 'id' | 'name' | 'type'>
  to_account?: Pick<Account, 'id' | 'name' | 'type'> | null
  category?: Pick<Category, 'id' | 'name' | 'icon' | 'color'> | null
  created_by_user?: Pick<User, 'id' | 'name' | 'avatar_url'>
}

export interface TrackerWithMembers extends Tracker {
  members: (TrackerMember & { user: User })[]
}

export interface DashboardSummary {
  total_income: number
  total_expense: number
  net_balance: number
  untracked_total: number
}
