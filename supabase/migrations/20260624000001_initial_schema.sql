-- Migration: 20260624000001_initial_schema
-- Purpose: Create all tables for MiyuCash
-- Idempotent: yes (uses IF NOT EXISTS)

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TYPES
-- ============================================================
DO $$ BEGIN
  CREATE TYPE account_type AS ENUM ('cash', 'bank', 'ewallet');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE category_type AS ENUM ('expense', 'income');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE transaction_type AS ENUM ('expense', 'income', 'transfer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- USERS (extends Supabase auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  name        TEXT NOT NULL,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TRACKERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.trackers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  owner_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  invite_code  TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS trackers_invite_code_idx ON public.trackers (invite_code);

-- ============================================================
-- TRACKER MEMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tracker_members (
  tracker_id  UUID NOT NULL REFERENCES public.trackers(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tracker_id, user_id)
);

-- Enforce max 2 members per tracker
CREATE OR REPLACE FUNCTION check_tracker_member_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.tracker_members WHERE tracker_id = NEW.tracker_id) >= 2 THEN
    RAISE EXCEPTION 'Tracker already has maximum 2 members';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_tracker_member_limit ON public.tracker_members;
CREATE TRIGGER enforce_tracker_member_limit
  BEFORE INSERT ON public.tracker_members
  FOR EACH ROW EXECUTE FUNCTION check_tracker_member_limit();

-- ============================================================
-- ACCOUNTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.accounts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracker_id       UUID NOT NULL REFERENCES public.trackers(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  type             account_type NOT NULL,
  initial_balance  NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency         TEXT NOT NULL DEFAULT 'IDR',
  created_by       UUID NOT NULL REFERENCES public.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracker_id  UUID NOT NULL REFERENCES public.trackers(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  type        category_type NOT NULL,
  icon        TEXT NOT NULL DEFAULT 'circle',
  color       TEXT NOT NULL DEFAULT '#B8D4E8',
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CYCLES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cycles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracker_id  UUID NOT NULL REFERENCES public.trackers(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT end_after_start CHECK (end_date > start_date)
);

-- Only 1 active cycle per tracker
CREATE UNIQUE INDEX IF NOT EXISTS one_active_cycle_per_tracker
  ON public.cycles (tracker_id)
  WHERE is_active = TRUE;

-- ============================================================
-- BUDGETS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.budgets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id     UUID NOT NULL REFERENCES public.cycles(id) ON DELETE CASCADE,
  category_id  UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  amount       NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  UNIQUE (cycle_id, category_id)
);

-- ============================================================
-- TRANSACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracker_id     UUID NOT NULL REFERENCES public.trackers(id) ON DELETE CASCADE,
  type           transaction_type NOT NULL,
  amount         NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  date           DATE NOT NULL,
  account_id     UUID NOT NULL REFERENCES public.accounts(id),
  to_account_id  UUID REFERENCES public.accounts(id),
  category_id    UUID REFERENCES public.categories(id),
  note           TEXT,
  created_by     UUID NOT NULL REFERENCES public.users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT transfer_requires_to_account CHECK (
    (type = 'transfer' AND to_account_id IS NOT NULL)
    OR (type != 'transfer' AND to_account_id IS NULL)
  ),
  CONSTRAINT no_self_transfer CHECK (
    account_id != to_account_id OR to_account_id IS NULL
  )
);
