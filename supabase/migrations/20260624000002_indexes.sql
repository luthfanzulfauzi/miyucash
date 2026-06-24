-- Migration: 20260624000002_indexes
-- Purpose: Performance indexes for common queries

CREATE INDEX IF NOT EXISTS idx_transactions_tracker_date
  ON public.transactions (tracker_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_tracker_type
  ON public.transactions (tracker_id, type);

CREATE INDEX IF NOT EXISTS idx_transactions_account
  ON public.transactions (account_id);

CREATE INDEX IF NOT EXISTS idx_transactions_to_account
  ON public.transactions (to_account_id)
  WHERE to_account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_category
  ON public.transactions (category_id)
  WHERE category_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cycles_tracker_active
  ON public.cycles (tracker_id, is_active);

CREATE INDEX IF NOT EXISTS idx_budgets_cycle
  ON public.budgets (cycle_id);

CREATE INDEX IF NOT EXISTS idx_tracker_members_user
  ON public.tracker_members (user_id);

CREATE INDEX IF NOT EXISTS idx_categories_tracker_type
  ON public.categories (tracker_id, type);
