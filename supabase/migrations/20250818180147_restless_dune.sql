/*
  # Add updated_at column to credit_cards table

  1. Changes
    - Add `updated_at` column to `credit_cards` table
    - Set default value to `now()`
    - Create trigger to automatically update the column on record updates

  This resolves the database error where triggers expect an `updated_at` column
  but the table only has `credit_card_updated_at`.
*/

-- Add updated_at column to credit_cards table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'credit_cards' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE credit_cards ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create trigger to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to credit_cards table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'update_credit_cards_updated_at_trigger'
    AND event_object_table = 'credit_cards'
  ) THEN
    CREATE TRIGGER update_credit_cards_updated_at_trigger
      BEFORE UPDATE ON credit_cards
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;