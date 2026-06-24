export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: { id: string; email: string; name: string; avatar_url: string | null; created_at: string }
        Insert: { id: string; email: string; name: string; avatar_url?: string | null; created_at?: string }
        Update: { id?: string; email?: string; name?: string; avatar_url?: string | null }
        Relationships: []
      }
      trackers: {
        Row: { id: string; name: string; owner_id: string; invite_code: string; created_at: string }
        Insert: { id?: string; name: string; owner_id: string; invite_code: string; created_at?: string }
        Update: { name?: string; invite_code?: string }
        Relationships: []
      }
      tracker_members: {
        Row: { tracker_id: string; user_id: string; joined_at: string }
        Insert: { tracker_id: string; user_id: string; joined_at?: string }
        Update: never
        Relationships: []
      }
      accounts: {
        Row: { id: string; tracker_id: string; name: string; type: 'cash' | 'bank' | 'ewallet'; initial_balance: number; currency: string; created_by: string; created_at: string }
        Insert: { id?: string; tracker_id: string; name: string; type: 'cash' | 'bank' | 'ewallet'; initial_balance?: number; currency?: string; created_by: string; created_at?: string }
        Update: { name?: string; type?: 'cash' | 'bank' | 'ewallet'; initial_balance?: number }
        Relationships: []
      }
      categories: {
        Row: { id: string; tracker_id: string; name: string; type: 'expense' | 'income'; icon: string; color: string; is_default: boolean; created_at: string }
        Insert: { id?: string; tracker_id: string; name: string; type: 'expense' | 'income'; icon?: string; color?: string; is_default?: boolean; created_at?: string }
        Update: { name?: string; icon?: string; color?: string }
        Relationships: []
      }
      cycles: {
        Row: { id: string; tracker_id: string; name: string; start_date: string; end_date: string; is_active: boolean; created_at: string }
        Insert: { id?: string; tracker_id: string; name: string; start_date: string; end_date: string; is_active?: boolean; created_at?: string }
        Update: { name?: string; start_date?: string; end_date?: string; is_active?: boolean }
        Relationships: []
      }
      budgets: {
        Row: { id: string; cycle_id: string; category_id: string; amount: number }
        Insert: { id?: string; cycle_id: string; category_id: string; amount: number }
        Update: { amount?: number }
        Relationships: []
      }
      transactions: {
        Row: { id: string; tracker_id: string; type: 'expense' | 'income' | 'transfer'; amount: number; date: string; account_id: string; to_account_id: string | null; category_id: string | null; note: string | null; created_by: string; created_at: string }
        Insert: { id?: string; tracker_id: string; type: 'expense' | 'income' | 'transfer'; amount: number; date: string; account_id: string; to_account_id?: string | null; category_id?: string | null; note?: string | null; created_by: string; created_at?: string }
        Update: { type?: 'expense' | 'income' | 'transfer'; amount?: number; date?: string; account_id?: string; to_account_id?: string | null; category_id?: string | null; note?: string | null }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_tracker_member: { Args: { tid: string }; Returns: boolean }
      generate_invite_code: { Args: Record<PropertyKey, never>; Returns: string }
    }
    Enums: {
      account_type: 'cash' | 'bank' | 'ewallet'
      category_type: 'expense' | 'income'
      transaction_type: 'expense' | 'income' | 'transfer'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
