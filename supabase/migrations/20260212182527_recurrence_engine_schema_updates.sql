/*
  # Recurrence Engine Schema Updates

  ## Summary
  Prepares recurrence_rules and transactions tables for the materialized
  recurrence engine that generates all occurrences in the database.

  ## Changes

  1. **recurrence_rules table**
     - Add `generated_until` (date, nullable) - tracks the furthest date
       to which occurrences have been materialized
     - Expand status CHECK constraint to include 'completed' and 'error'

  2. **transactions table**
     - Unique index on (parent_recurrence_rule_id, recurrence_instance_date)
       already exists as `uq_recurrence_rule_instance_date` - no action needed

  ## Security
  - No RLS changes needed (policies already in place from prior migration)

  ## Notes
  - The `generated_until` column enables the engine to know where it left off
    and only generate forward from that point
  - Status 'completed' marks rules that have exhausted repeat_count or passed end_date
  - Status 'error' marks rules that failed 10+ consecutive times
*/

-- ============================================================================
-- 1. Add generated_until column to recurrence_rules
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recurrence_rules'
      AND column_name = 'generated_until'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE recurrence_rules ADD COLUMN generated_until date;
    COMMENT ON COLUMN recurrence_rules.generated_until IS 'Furthest date to which transaction occurrences have been materialized';
  END IF;
END $$;

-- ============================================================================
-- 2. Expand status CHECK constraint to include completed and error
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'recurrence_rules_status_check'
  ) THEN
    ALTER TABLE recurrence_rules DROP CONSTRAINT recurrence_rules_status_check;
  END IF;

  ALTER TABLE recurrence_rules ADD CONSTRAINT recurrence_rules_status_check
    CHECK (status = ANY (ARRAY['active'::text, 'paused'::text, 'canceled'::text, 'completed'::text, 'error'::text]));
END $$;

-- ============================================================================
-- 3. Add index on recurrence_rules for maintenance job queries
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_recurrence_rules_active_generated
  ON recurrence_rules (workspace_id, status, generated_until)
  WHERE status = 'active';

-- ============================================================================
-- 4. Backfill generated_until for existing rules that already have transactions
-- ============================================================================
UPDATE recurrence_rules rr
SET generated_until = sub.max_date
FROM (
  SELECT parent_recurrence_rule_id, MAX(recurrence_instance_date) AS max_date
  FROM transactions
  WHERE parent_recurrence_rule_id IS NOT NULL
    AND recurrence_instance_date IS NOT NULL
  GROUP BY parent_recurrence_rule_id
) sub
WHERE rr.id = sub.parent_recurrence_rule_id
  AND rr.generated_until IS NULL;
