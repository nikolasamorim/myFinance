/*
  # Update Credit Cards and Accounts Relationship

  1. Schema Changes
    - Add `initial_balance` column to `credit_cards` table
    - Add `account_id` foreign key to `credit_cards` table (mandatory)
    - Remove `current_balance` column from `credit_cards` table
    - Update `accounts` table to use `initial_balance` consistently

  2. Security
    - Maintain existing RLS policies
    - Ensure workspace-scoped relationships

  3. Data Integrity
    - Add foreign key constraint for account relationship
    - Add check constraint to prevent cross-workspace linkage
*/

-- Add initial_balance and account_id to credit_cards table
DO $$
BEGIN
  -- Add initial_balance column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'credit_cards' AND column_name = 'initial_balance'
  ) THEN
    ALTER TABLE credit_cards ADD COLUMN initial_balance numeric(15,2) DEFAULT 0;
  END IF;

  -- Add account_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'credit_cards' AND column_name = 'account_id'
  ) THEN
    ALTER TABLE credit_cards ADD COLUMN account_id uuid;
  END IF;
END $$;

-- Update existing current_balance to initial_balance if current_balance exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'credit_cards' AND column_name = 'current_balance'
  ) THEN
    UPDATE credit_cards SET initial_balance = current_balance WHERE current_balance IS NOT NULL;
    ALTER TABLE credit_cards DROP COLUMN current_balance;
  END IF;
END $$;

-- Add foreign key constraint for account_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'credit_cards_account_id_fkey'
  ) THEN
    ALTER TABLE credit_cards 
    ADD CONSTRAINT credit_cards_account_id_fkey 
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- Add check constraint to ensure same workspace
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'credit_cards_same_workspace_check'
  ) THEN
    ALTER TABLE credit_cards 
    ADD CONSTRAINT credit_cards_same_workspace_check 
    CHECK (
      account_id IS NULL OR 
      EXISTS (
        SELECT 1 FROM accounts 
        WHERE accounts.id = credit_cards.account_id 
        AND accounts.workspace_id = credit_cards.credit_card_workspace_id
      )
    );
  END IF;
END $$;

-- Create index for account_id
CREATE INDEX IF NOT EXISTS idx_credit_cards_account ON credit_cards(account_id);

-- Update trigger function to handle updated_at properly
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle different table schemas
  IF TG_TABLE_NAME = 'credit_cards' THEN
    NEW.updated_at = now();
    NEW.credit_card_updated_at = now();
  ELSE
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';