-- Migration: 20260727000002_account_balances_rpc
-- Purpose: Compute account balances with a SQL aggregate so they are never
--   silently truncated by PostgREST's max_rows (1000). The previous approach
--   fetched every transaction and summed in JS, which under-/over-reported
--   balances once a tracker crossed 1000 lifetime transactions.
-- Idempotent: yes (CREATE OR REPLACE).

CREATE OR REPLACE FUNCTION public.get_account_balances(p_tracker_id uuid)
RETURNS TABLE (acct_id uuid, balance numeric)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT
    a.id,
    a.initial_balance
      + COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'income'   AND t.account_id    = a.id), 0)
      - COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'expense'  AND t.account_id    = a.id), 0)
      - COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'transfer' AND t.account_id    = a.id), 0)
      + COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'transfer' AND t.to_account_id = a.id), 0)
  FROM public.accounts a
  LEFT JOIN public.transactions t
    ON t.tracker_id = a.tracker_id
   AND (t.account_id = a.id OR t.to_account_id = a.id)
  WHERE a.tracker_id = p_tracker_id
  GROUP BY a.id, a.initial_balance;
$$;

-- SECURITY INVOKER keeps RLS in force: only tracker members can read the
-- underlying accounts/transactions, so the balances are scoped automatically.
GRANT EXECUTE ON FUNCTION public.get_account_balances(uuid) TO authenticated;
