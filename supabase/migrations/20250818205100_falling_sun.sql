/*
  # Add payment_method and missing fields to transactions table

  1. New Columns
    - `payment_method` (TEXT, required) - method of payment used in the transaction
    - `installments_count` (INTEGER, optional) - number of installments when transaction is split
    - `recurring` (BOOLEAN, default false) - indicates if transaction is recurring
    - `installment_group_id` (UUID, optional) - groups related installment entries
    - `recurrence_rule_id` (UUID, optional) - links to recurrence rules for recurring transactions

  2. Updates
    - Add foreign key constraints for new relationship fields
    - Add check constraints for payment_method enum values
    - Update existing data to have default payment_method values

  3. Security
    - Maintain existing RLS policies
*/

-- Add new columns to transactions table
DO $$
BEGIN
  -- Add payment_method column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE transactions ADD COLUMN payment_method TEXT;
  END IF;

  -- Add installments_count column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'installments_count'
  ) THEN
    ALTER TABLE transactions ADD COLUMN installments_count INTEGER;
  END IF;

  -- Add recurring column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'recurring'
  ) THEN
    ALTER TABLE transactions ADD COLUMN recurring BOOLEAN DEFAULT false;
  END IF;

  -- Add recurrence_rule_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'recurrence_rule_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN recurrence_rule_id UUID;
  END IF;
END $$;

-- Update existing transactions to have a default payment_method
UPDATE transactions 
SET payment_method = 'pix' 
WHERE payment_method IS NULL;

-- Make payment_method NOT NULL after setting defaults
ALTER TABLE transactions ALTER COLUMN payment_method SET NOT NULL;

-- Add check constraint for payment_method
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'transactions_payment_method_check'
  ) THEN
    ALTER TABLE transactions ADD CONSTRAINT transactions_payment_method_check 
    CHECK (payment_method = ANY (ARRAY[
      'dinheiro'::text, 
      'boleto'::text, 
      'credito_em_conta'::text, 
      'debito_em_conta'::text, 
      'cheque_a_vista'::text, 
      'cheque_a_prazo'::text, 
      'cartao_de_credito'::text, 
      'cartao_de_debito'::text, 
      'guia'::text, 
      'permuta'::text, 
      'pix'::text, 
      'debito_automatico'::text
    ]));
  END IF;
END $$;

-- Add foreign key constraint for recurrence_rule_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'transactions_recurrence_rule_id_fkey'
  ) THEN
    ALTER TABLE transactions ADD CONSTRAINT transactions_recurrence_rule_id_fkey 
    FOREIGN KEY (recurrence_rule_id) REFERENCES recurrence_rules(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_payment_method ON transactions(payment_method);
CREATE INDEX IF NOT EXISTS idx_transactions_recurring ON transactions(recurring);
CREATE INDEX IF NOT EXISTS idx_transactions_recurrence_rule ON transactions(recurrence_rule_id);
CREATE INDEX IF NOT EXISTS idx_transactions_installments_count ON transactions(installments_count);