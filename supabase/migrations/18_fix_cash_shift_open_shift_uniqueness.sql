-- ============================================================================
-- FIX: cash_shifts unique constraint blocked closing shifts
-- Problem:
--   no_duplicate_open_shifts was defined as UNIQUE(store_id, terminal_id, status),
--   which also enforces uniqueness for CLOSED/SUSPENDED rows.
-- Solution:
--   1) Drop the old table-level unique constraint.
--   2) Normalize inconsistent rows manually closed via SQL editor.
--   3) Enforce uniqueness only for OPEN shifts using partial unique indexes.
-- ============================================================================

-- 1) Remove incorrect uniqueness rule.
ALTER TABLE cash_shifts
DROP CONSTRAINT IF EXISTS no_duplicate_open_shifts;

-- 2) Normalize rows that were manually "closed" without status transition.
UPDATE cash_shifts
SET
    status = 'CLOSED',
    closed_by = COALESCE(closed_by, opened_by),
    updated_at = NOW()
WHERE status = 'OPEN'
  AND (closed_at IS NOT NULL OR closing_cash_actual IS NOT NULL);

-- 3) Ensure closed rows have a closed_at timestamp.
UPDATE cash_shifts
SET
    closed_at = COALESCE(closed_at, NOW()),
    closed_by = COALESCE(closed_by, opened_by),
    updated_at = NOW()
WHERE status = 'CLOSED'
  AND closed_at IS NULL;

-- 4) Correct uniqueness: only one OPEN shift per terminal per store.
CREATE UNIQUE INDEX IF NOT EXISTS idx_cash_shifts_one_open_per_terminal
ON cash_shifts (store_id, terminal_id)
WHERE status = 'OPEN' AND terminal_id IS NOT NULL;

-- Optional safety: only one OPEN shift without terminal_id per store.
CREATE UNIQUE INDEX IF NOT EXISTS idx_cash_shifts_one_open_without_terminal
ON cash_shifts (store_id)
WHERE status = 'OPEN' AND terminal_id IS NULL;
