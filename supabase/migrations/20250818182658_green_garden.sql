/*
  # Remove credit card account relationship

  1. Schema Changes
    - Remove `account_id` column from `credit_cards` table
    - Remove any foreign key constraints related to accounts

  2. Security
    - No changes to RLS policies needed
    - Existing policies remain intact

  3. Notes
    - This removes the mandatory relationship between credit cards and accounts
    - Credit cards will now be independent entities
*/

-- Remove the account_id column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'credit_cards' AND column_name = 'account_id'
  ) THEN
    ALTER TABLE credit_cards DROP COLUMN account_id;
  END IF;
END $$;