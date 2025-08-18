/*
  # Add type field to cost centers

  1. Schema Changes
    - Add `type` column to `cost_centers` table with values 'revenue' or 'expense'
    - Set default value to 'expense'
    - Add check constraint for valid values

  2. Data Migration
    - Set all existing cost centers to 'expense' type as default

  3. Security
    - No RLS changes needed (inherits existing policies)
*/

-- Add type column to cost_centers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cost_centers' AND column_name = 'type'
  ) THEN
    ALTER TABLE cost_centers ADD COLUMN type text DEFAULT 'expense';
  END IF;
END $$;

-- Add check constraint for valid type values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'cost_centers_type_check'
  ) THEN
    ALTER TABLE cost_centers ADD CONSTRAINT cost_centers_type_check 
    CHECK (type = ANY (ARRAY['revenue'::text, 'expense'::text]));
  END IF;
END $$;

-- Update existing cost centers to have expense type
UPDATE cost_centers SET type = 'expense' WHERE type IS NULL;