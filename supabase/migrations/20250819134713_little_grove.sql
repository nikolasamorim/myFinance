/*
  # Fix transaction bank foreign key constraint

  1. Changes
    - Drop the incorrect foreign key constraint that references 'banks' table
    - Add correct foreign key constraint that references 'accounts' table
    - Add payment_method column to transactions table
    - Add recurring column to transactions table
    - Add recurrence_rule_id column to transactions table

  2. Security
    - Maintain existing RLS policies
    - No changes to security model
*/

-- First, drop the incorrect foreign key constraint
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_transaction_bank_id_fkey;

-- Add the correct foreign key constraint to reference accounts table
ALTER TABLE transactions ADD CONSTRAINT transactions_transaction_bank_id_fkey 
  FOREIGN KEY (transaction_bank_id) REFERENCES accounts(id) ON DELETE SET NULL;

-- Add missing columns that the application expects
DO $$
BEGIN
  -- Add payment_method column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE transactions ADD COLUMN payment_method text;
  END IF;

  -- Add recurring column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'recurring'
  ) THEN
    ALTER TABLE transactions ADD COLUMN recurring boolean DEFAULT false;
  END IF;

  -- Add recurrence_rule_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'recurrence_rule_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN recurrence_rule_id uuid;
    ALTER TABLE transactions ADD CONSTRAINT transactions_recurrence_rule_id_fkey 
      FOREIGN KEY (recurrence_rule_id) REFERENCES recurrence_rules(id) ON DELETE SET NULL;
  END IF;
END $$;