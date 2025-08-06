/*
  # Add transaction status column

  1. New Column
    - `transaction_status` (text, default 'pending')
      - Tracks whether a transaction has been completed or is still pending
      - Valid values: 'pending', 'received', 'paid'

  2. Updates
    - Add the new column to the transactions table
    - Set default value for existing records
    - Add check constraint for valid status values
*/

-- Add transaction_status column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'transaction_status'
  ) THEN
    ALTER TABLE transactions ADD COLUMN transaction_status text DEFAULT 'pending';
  END IF;
END $$;

-- Add check constraint for valid status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'transactions_transaction_status_check'
  ) THEN
    ALTER TABLE transactions ADD CONSTRAINT transactions_transaction_status_check 
    CHECK (transaction_status = ANY (ARRAY['pending'::text, 'received'::text, 'paid'::text]));
  END IF;
END $$;