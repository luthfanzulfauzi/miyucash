-- Migration: 20260727000003_cycle_overlap_and_audit
-- Purpose:
--   (a) Prevent overlapping budget cycles within the same tracker. Transactions
--       are attributed to a cycle purely by date range, so overlapping cycles
--       would double-count a transaction across two cycles' reports.
--   (b) Add cycles.updated_at for basic edit traceability (retroactive date
--       edits change which transactions a cycle counts).
-- Idempotent: yes (IF NOT EXISTS / DROP ... IF EXISTS before ADD).
-- Note: verified no existing cycles overlap before adding the constraint.

-- btree_gist lets a GiST exclusion constraint mix equality (uuid) with range (&&).
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- (b) Traceability column
ALTER TABLE public.cycles
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- (a) No overlapping date ranges per tracker. Inclusive bounds [start, end].
ALTER TABLE public.cycles DROP CONSTRAINT IF EXISTS cycles_no_overlap;
ALTER TABLE public.cycles
  ADD CONSTRAINT cycles_no_overlap
  EXCLUDE USING gist (
    tracker_id WITH =,
    daterange(start_date, end_date, '[]') WITH &&
  );
