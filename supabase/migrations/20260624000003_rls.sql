-- Migration: 20260624000003_rls
-- Purpose: Row Level Security policies for all tables

-- ============================================================
-- Helper: check if current user is a member of a tracker
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_tracker_member(tid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tracker_members
    WHERE tracker_id = tid AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- USERS
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own"
  ON public.users FOR SELECT
  USING (id = auth.uid());

DROP POLICY IF EXISTS "users_select_tracker_members" ON public.users;
CREATE POLICY "users_select_tracker_members"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tracker_members tm1
      JOIN public.tracker_members tm2 ON tm1.tracker_id = tm2.tracker_id
      WHERE tm1.user_id = auth.uid() AND tm2.user_id = public.users.id
    )
  );

DROP POLICY IF EXISTS "users_insert_own" ON public.users;
CREATE POLICY "users_insert_own"
  ON public.users FOR INSERT
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  USING (id = auth.uid());

-- ============================================================
-- TRACKERS
-- ============================================================
ALTER TABLE public.trackers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trackers_select_member" ON public.trackers;
CREATE POLICY "trackers_select_member"
  ON public.trackers FOR SELECT
  USING (public.is_tracker_member(id));

-- Allow anyone to lookup tracker by invite_code (for join flow)
DROP POLICY IF EXISTS "trackers_select_by_invite_code" ON public.trackers;
CREATE POLICY "trackers_select_by_invite_code"
  ON public.trackers FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "trackers_insert_owner" ON public.trackers;
CREATE POLICY "trackers_insert_owner"
  ON public.trackers FOR INSERT
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "trackers_update_owner" ON public.trackers;
CREATE POLICY "trackers_update_owner"
  ON public.trackers FOR UPDATE
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "trackers_delete_owner" ON public.trackers;
CREATE POLICY "trackers_delete_owner"
  ON public.trackers FOR DELETE
  USING (owner_id = auth.uid());

-- ============================================================
-- TRACKER MEMBERS
-- ============================================================
ALTER TABLE public.tracker_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tracker_members_select" ON public.tracker_members;
CREATE POLICY "tracker_members_select"
  ON public.tracker_members FOR SELECT
  USING (public.is_tracker_member(tracker_id));

DROP POLICY IF EXISTS "tracker_members_insert_self" ON public.tracker_members;
CREATE POLICY "tracker_members_insert_self"
  ON public.tracker_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "tracker_members_delete_owner" ON public.tracker_members;
CREATE POLICY "tracker_members_delete_owner"
  ON public.tracker_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.trackers
      WHERE id = tracker_id AND owner_id = auth.uid()
    )
    AND user_id != auth.uid()
  );

-- ============================================================
-- ACCOUNTS
-- ============================================================
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "accounts_all_tracker_member" ON public.accounts;
CREATE POLICY "accounts_all_tracker_member"
  ON public.accounts FOR ALL
  USING (public.is_tracker_member(tracker_id))
  WITH CHECK (public.is_tracker_member(tracker_id));

-- ============================================================
-- CATEGORIES
-- ============================================================
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories_all_tracker_member" ON public.categories;
CREATE POLICY "categories_all_tracker_member"
  ON public.categories FOR ALL
  USING (public.is_tracker_member(tracker_id))
  WITH CHECK (public.is_tracker_member(tracker_id));

-- ============================================================
-- CYCLES
-- ============================================================
ALTER TABLE public.cycles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cycles_all_tracker_member" ON public.cycles;
CREATE POLICY "cycles_all_tracker_member"
  ON public.cycles FOR ALL
  USING (public.is_tracker_member(tracker_id))
  WITH CHECK (public.is_tracker_member(tracker_id));

-- ============================================================
-- BUDGETS
-- ============================================================
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "budgets_all_tracker_member" ON public.budgets;
CREATE POLICY "budgets_all_tracker_member"
  ON public.budgets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.cycles c
      WHERE c.id = cycle_id AND public.is_tracker_member(c.tracker_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cycles c
      WHERE c.id = cycle_id AND public.is_tracker_member(c.tracker_id)
    )
  );

-- ============================================================
-- TRANSACTIONS
-- ============================================================
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transactions_all_tracker_member" ON public.transactions;
CREATE POLICY "transactions_all_tracker_member"
  ON public.transactions FOR ALL
  USING (public.is_tracker_member(tracker_id))
  WITH CHECK (public.is_tracker_member(tracker_id));
