-- Migration: 20260727000001_fix_join_security
-- Purpose: Close the cross-tenant access hole in the invite/join flow.
--   1) Stop exposing every tracker (and its invite_code) to everyone.
--   2) Stop allowing arbitrary self-insert into tracker_members.
--   3) Move invite verification + the 2-member cap into a SECURITY DEFINER RPC.
-- Idempotent: yes (DROP POLICY IF EXISTS + CREATE OR REPLACE FUNCTION).

-- ------------------------------------------------------------
-- 1. Drop the world-readable trackers policy.
--    Previously `USING (true)` let anyone (even anon) read every tracker
--    row including its invite_code. The remaining `trackers_select_member`
--    policy (is_tracker_member(id)) is sufficient; invite lookups now go
--    through join_tracker() below.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "trackers_select_by_invite_code" ON public.trackers;

-- ------------------------------------------------------------
-- 2. Drop the unguarded membership self-insert.
--    Previously any authenticated user could insert themselves into any
--    tracker_members row (no invite proof), joining any not-yet-full tracker.
--    The tracker owner is still auto-added via the add_owner_as_member
--    trigger (SECURITY DEFINER), so tracker creation is unaffected.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "tracker_members_insert_self" ON public.tracker_members;

-- ------------------------------------------------------------
-- 3. Server-side join. Verifies the invite code, enforces the 2-member cap,
--    and inserts the caller — atomically and race-safe. Runs as SECURITY
--    DEFINER so it can read trackers / write membership in a controlled way,
--    without granting those rights to clients directly.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.join_tracker(p_code text)
RETURNS TABLE (out_tracker_id uuid, out_tracker_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id    uuid;
  v_name  text;
  v_uid   uuid := auth.uid();
  v_count int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT t.id, t.name INTO v_id, v_name
  FROM public.trackers t
  WHERE t.invite_code = upper(p_code);

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'invalid_code';
  END IF;

  -- Serialize concurrent joins to the same tracker (prevents TOCTOU on the cap).
  PERFORM pg_advisory_xact_lock(hashtext(v_id::text));

  -- Already a member? Idempotent success.
  IF EXISTS (
    SELECT 1 FROM public.tracker_members m
    WHERE m.tracker_id = v_id AND m.user_id = v_uid
  ) THEN
    out_tracker_id := v_id;
    out_tracker_name := v_name;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT count(*) INTO v_count
  FROM public.tracker_members m
  WHERE m.tracker_id = v_id;

  IF v_count >= 2 THEN
    RAISE EXCEPTION 'tracker_full';
  END IF;

  INSERT INTO public.tracker_members (tracker_id, user_id)
  VALUES (v_id, v_uid);

  out_tracker_id := v_id;
  out_tracker_name := v_name;
  RETURN NEXT;
END;
$$;

-- Only authenticated users may call it — never anon/public.
REVOKE ALL ON FUNCTION public.join_tracker(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.join_tracker(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.join_tracker(text) TO authenticated;
