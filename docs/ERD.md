# ERD — Entity Relationship Document
**MiyuCash: Budgeting & Finance Tracker**
Version 1.0 | 2026-06-24

---

## 1. Entity Relationship Diagram

```
┌─────────────────┐          ┌──────────────────────┐
│      users      │          │       trackers        │
├─────────────────┤          ├──────────────────────┤
│ id (PK)         │◄────┐    │ id (PK)              │
│ email           │     │    │ name                 │
│ name            │     │    │ owner_id (FK→users)  │◄──────────┐
│ avatar_url      │     │    │ invite_code (UNIQUE) │           │
│ created_at      │     │    │ created_at           │           │
└─────────────────┘     │    └──────────────────────┘           │
                        │              │                         │
                        │              │ 1                       │
                        │              ▼ N                       │
                        │    ┌──────────────────────┐           │
                        │    │   tracker_members    │           │
                        │    ├──────────────────────┤           │
                        └────│ user_id (FK→users)   │           │
                             │ tracker_id (FK→...)  │───────────┘
                             │ joined_at            │
                             │ PK (tracker_id,      │
                             │     user_id)         │
                             └──────────────────────┘

┌──────────────────────┐          ┌──────────────────────┐
│       accounts       │          │      categories      │
├──────────────────────┤          ├──────────────────────┤
│ id (PK)              │          │ id (PK)              │
│ tracker_id (FK)      │          │ tracker_id (FK)      │
│ name                 │          │ name                 │
│ type                 │          │ type                 │
│ initial_balance      │          │ icon                 │
│ currency             │          │ color                │
│ created_by (FK→users)│          │ is_default           │
│ created_at           │          │ created_at           │
└──────────────────────┘          └──────────────────────┘
          │                                  │
          │                                  │
          └──────────┐    ┌──────────────────┘
                     ▼    ▼
            ┌──────────────────────┐
            │     transactions     │
            ├──────────────────────┤
            │ id (PK)              │
            │ tracker_id (FK)      │
            │ type                 │◄── 'expense' | 'income' | 'transfer'
            │ amount               │
            │ date                 │
            │ account_id (FK→acct) │
            │ to_account_id (FK)   │◄── NULL kecuali transfer
            │ category_id (FK→cat) │◄── NULL untuk transfer
            │ note                 │
            │ created_by (FK→users)│
            │ created_at           │
            └──────────────────────┘

┌──────────────────────┐          ┌──────────────────────┐
│        cycles        │          │       budgets        │
├──────────────────────┤          ├──────────────────────┤
│ id (PK)              │◄─────────│ cycle_id (FK)        │
│ tracker_id (FK)      │          │ category_id (FK→cat) │
│ name                 │          │ amount               │
│ start_date           │          │ id (PK)              │
│ end_date             │          │ UNIQUE(cycle_id,     │
│ is_active            │          │        category_id)  │
│ created_at           │          └──────────────────────┘
└──────────────────────┘
```

---

## 2. SQL Schema (Supabase / PostgreSQL)

```sql
-- ============================================================
-- USERS (extends Supabase auth.users)
-- ============================================================
CREATE TABLE public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  name        TEXT NOT NULL,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TRACKERS
-- ============================================================
CREATE TABLE public.trackers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  owner_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  invite_code  TEXT NOT NULL UNIQUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TRACKER MEMBERS
-- ============================================================
CREATE TABLE public.tracker_members (
  tracker_id  UUID NOT NULL REFERENCES public.trackers(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tracker_id, user_id)
);

-- Constraint: max 2 members per tracker (enforced via trigger)
CREATE OR REPLACE FUNCTION check_tracker_member_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM tracker_members WHERE tracker_id = NEW.tracker_id) >= 2 THEN
    RAISE EXCEPTION 'Tracker sudah memiliki 2 member';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_tracker_member_limit
  BEFORE INSERT ON tracker_members
  FOR EACH ROW EXECUTE FUNCTION check_tracker_member_limit();

-- ============================================================
-- ACCOUNTS
-- ============================================================
CREATE TYPE account_type AS ENUM ('cash', 'bank', 'ewallet');

CREATE TABLE public.accounts (
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
CREATE TYPE category_type AS ENUM ('expense', 'income');

CREATE TABLE public.categories (
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
CREATE TABLE public.cycles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracker_id  UUID NOT NULL REFERENCES public.trackers(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT end_after_start CHECK (end_date > start_date)
);

-- Hanya 1 cycle aktif per tracker (partial unique index)
CREATE UNIQUE INDEX one_active_cycle_per_tracker
  ON cycles (tracker_id)
  WHERE is_active = TRUE;

-- ============================================================
-- BUDGETS
-- ============================================================
CREATE TABLE public.budgets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id     UUID NOT NULL REFERENCES public.cycles(id) ON DELETE CASCADE,
  category_id  UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  amount       NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  UNIQUE (cycle_id, category_id)
);

-- ============================================================
-- TRANSACTIONS
-- ============================================================
CREATE TYPE transaction_type AS ENUM ('expense', 'income', 'transfer');

CREATE TABLE public.transactions (
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

  -- Transfer: to_account_id required, category_id must be null
  CONSTRAINT transfer_rules CHECK (
    (type = 'transfer' AND to_account_id IS NOT NULL AND to_account_id != account_id)
    OR (type != 'transfer' AND to_account_id IS NULL)
  ),
  -- Transfer: no self-transfer
  CONSTRAINT no_self_transfer CHECK (account_id != to_account_id)
);
```

---

## 3. Row Level Security (RLS)

```sql
-- ============================================================
-- Helper function: cek apakah user adalah member tracker
-- ============================================================
CREATE OR REPLACE FUNCTION is_tracker_member(tid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM tracker_members
    WHERE tracker_id = tid AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================
-- RLS: TRACKERS
-- ============================================================
ALTER TABLE trackers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "member can read tracker"
  ON trackers FOR SELECT
  USING (is_tracker_member(id));

CREATE POLICY "owner can update tracker"
  ON trackers FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "user can create tracker"
  ON trackers FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- ============================================================
-- RLS: TRACKER_MEMBERS
-- ============================================================
ALTER TABLE tracker_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "member can read members"
  ON tracker_members FOR SELECT
  USING (is_tracker_member(tracker_id));

CREATE POLICY "user can join tracker"
  ON tracker_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "owner can remove member"
  ON tracker_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM trackers
      WHERE id = tracker_id AND owner_id = auth.uid()
    )
    AND user_id != auth.uid()
  );

-- ============================================================
-- RLS: ACCOUNTS, CATEGORIES, CYCLES, BUDGETS, TRANSACTIONS
-- (pola sama: member bisa baca & tulis, data terikat tracker)
-- ============================================================
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tracker member full access"
  ON accounts FOR ALL
  USING (is_tracker_member(tracker_id))
  WITH CHECK (is_tracker_member(tracker_id));

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tracker member full access"
  ON categories FOR ALL
  USING (is_tracker_member(tracker_id))
  WITH CHECK (is_tracker_member(tracker_id));

ALTER TABLE cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tracker member full access"
  ON cycles FOR ALL
  USING (is_tracker_member(tracker_id))
  WITH CHECK (is_tracker_member(tracker_id));

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tracker member full access"
  ON budgets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cycles c
      WHERE c.id = cycle_id AND is_tracker_member(c.tracker_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cycles c
      WHERE c.id = cycle_id AND is_tracker_member(c.tracker_id)
    )
  );

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tracker member full access"
  ON transactions FOR ALL
  USING (is_tracker_member(tracker_id))
  WITH CHECK (is_tracker_member(tracker_id));

-- ============================================================
-- RLS: USERS
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user can read own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "user can read tracker member profiles"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tracker_members tm1
      JOIN tracker_members tm2 ON tm1.tracker_id = tm2.tracker_id
      WHERE tm1.user_id = auth.uid() AND tm2.user_id = users.id
    )
  );

CREATE POLICY "user can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "user can insert own profile"
  ON users FOR INSERT
  WITH CHECK (id = auth.uid());

-- ============================================================
-- Invite code lookup (tanpa auth — untuk validasi sebelum join)
-- ============================================================
CREATE POLICY "anyone can lookup by invite code"
  ON trackers FOR SELECT
  USING (true);
-- Note: batasi field yang di-expose, jangan return owner_id
-- Di aplikasi, query hanya SELECT id, name, invite_code
```

---

## 4. Indexes

```sql
-- Performance indexes
CREATE INDEX idx_transactions_tracker_date ON transactions (tracker_id, date DESC);
CREATE INDEX idx_transactions_tracker_type ON transactions (tracker_id, type);
CREATE INDEX idx_transactions_account ON transactions (account_id);
CREATE INDEX idx_transactions_category ON transactions (category_id);
CREATE INDEX idx_cycles_tracker_active ON cycles (tracker_id, is_active);
CREATE INDEX idx_budgets_cycle ON budgets (cycle_id);
CREATE INDEX idx_tracker_members_user ON tracker_members (user_id);
```

---

## 5. Default Data (Seed saat Tracker Dibuat)

```sql
-- Dipanggil saat INSERT tracker baru
-- Categories default expense
INSERT INTO categories (tracker_id, name, type, icon, color, is_default) VALUES
  (:tracker_id, 'Makan & Minum',    'expense', 'utensils',   '#F2C4A0', true),
  (:tracker_id, 'Transport',         'expense', 'car',        '#B8D4E8', true),
  (:tracker_id, 'Belanja',           'expense', 'shopping-bag','C9B8E8', true),
  (:tracker_id, 'Tagihan & Utilitas','expense', 'zap',        '#F5E6A3', true),
  (:tracker_id, 'Kesehatan',         'expense', 'heart',      '#F2A8A8', true),
  (:tracker_id, 'Hiburan',           'expense', 'tv',         '#A8D8B9', true),
  (:tracker_id, 'Pendidikan',        'expense', 'book-open',  '#B8D4E8', true),
  (:tracker_id, 'Lainnya',           'expense', 'more-horizontal','#E8E8E8',true);

-- Categories default income
INSERT INTO categories (tracker_id, name, type, icon, color, is_default) VALUES
  (:tracker_id, 'Gaji',      'income', 'briefcase', '#A8D8B9', true),
  (:tracker_id, 'Bonus',     'income', 'gift',      '#F5E6A3', true),
  (:tracker_id, 'Freelance', 'income', 'laptop',    '#B8D4E8', true),
  (:tracker_id, 'Investasi', 'income', 'trending-up','C9B8E8', true),
  (:tracker_id, 'Lainnya',   'income', 'more-horizontal','#E8E8E8',true);
```

---

## 6. Key Queries

### Saldo Akun
```sql
SELECT
  a.id,
  a.name,
  a.type,
  a.initial_balance + COALESCE(SUM(
    CASE
      WHEN t.type = 'income'   AND t.account_id    = a.id THEN  t.amount
      WHEN t.type = 'expense'  AND t.account_id    = a.id THEN -t.amount
      WHEN t.type = 'transfer' AND t.account_id    = a.id THEN -t.amount
      WHEN t.type = 'transfer' AND t.to_account_id = a.id THEN  t.amount
      ELSE 0
    END
  ), 0) AS current_balance
FROM accounts a
LEFT JOIN transactions t ON (t.account_id = a.id OR t.to_account_id = a.id)
WHERE a.tracker_id = :tracker_id
GROUP BY a.id, a.name, a.type, a.initial_balance;
```

### Budget Progress per Kategori (Cycle Aktif)
```sql
SELECT
  c.id AS category_id,
  c.name AS category_name,
  c.icon,
  c.color,
  b.amount AS budget_limit,
  COALESCE(SUM(t.amount), 0) AS spent,
  ROUND(COALESCE(SUM(t.amount), 0) / b.amount * 100, 1) AS pct
FROM budgets b
JOIN categories c ON c.id = b.category_id
JOIN cycles cy ON cy.id = b.cycle_id AND cy.is_active = true AND cy.tracker_id = :tracker_id
LEFT JOIN transactions t
  ON t.category_id = c.id
  AND t.type = 'expense'
  AND t.tracker_id = :tracker_id
  AND t.date BETWEEN cy.start_date AND cy.end_date
WHERE b.cycle_id = cy.id
GROUP BY c.id, c.name, c.icon, c.color, b.amount;
```

### Total Untracked (Cycle Aktif)
```sql
SELECT COALESCE(SUM(t.amount), 0) AS untracked_total
FROM transactions t
JOIN cycles cy
  ON cy.tracker_id = t.tracker_id
  AND cy.is_active = true
WHERE t.tracker_id = :tracker_id
  AND t.type = 'expense'
  AND t.date BETWEEN cy.start_date AND cy.end_date
  AND (
    t.category_id IS NULL
    OR t.category_id NOT IN (
      SELECT b.category_id FROM budgets b WHERE b.cycle_id = cy.id
    )
  );
```

### Dashboard Summary (Cycle Aktif)
```sql
SELECT
  COALESCE(SUM(CASE WHEN t.type = 'income'  THEN t.amount ELSE 0 END), 0) AS total_income,
  COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) AS total_expense
FROM transactions t
JOIN cycles cy
  ON cy.tracker_id = t.tracker_id
  AND cy.is_active = true
WHERE t.tracker_id = :tracker_id
  AND t.date BETWEEN cy.start_date AND cy.end_date;
```
