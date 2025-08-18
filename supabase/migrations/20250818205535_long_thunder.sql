/*
  # Add payment_method column to transactions table

  1. New Columns
    - `payment_method` (text, required) - method of payment used in the transaction
    - `installments_count` (integer, optional) - number of installments for split transactions
    - `recurring` (boolean, default false) - indicates if transaction is recurring
    - `recurrence_rule_id` (uuid, optional) - links to recurrence rules

  2. Constraints
    - Add check constraint for valid payment methods
    - Add foreign key for recurrence_rule_id

  3. Updates
    - Set default payment method for existing records
    - Make payment_method required after setting defaults
*/

-- Add the payment_method column as nullable first
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE transactions ADD COLUMN payment_method TEXT;
  END IF;
END $$;

-- Add installments_count column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'installments_count'
  ) THEN
    ALTER TABLE transactions ADD COLUMN installments_count INTEGER;
  END IF;
END $$;

-- Add recurring column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'recurring'
  ) THEN
    ALTER TABLE transactions ADD COLUMN recurring BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add recurrence_rule_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'recurrence_rule_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN recurrence_rule_id UUID;
  END IF;
END $$;

-- Set default payment method for existing records
UPDATE transactions 
SET payment_method = 'dinheiro' 
WHERE payment_method IS NULL;

-- Make payment_method required
ALTER TABLE transactions 
ALTER COLUMN payment_method SET NOT NULL;

-- Add check constraint for payment methods
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'transactions_payment_method_check'
  ) THEN
    ALTER TABLE transactions ADD CONSTRAINT transactions_payment_method_check 
    CHECK (payment_method IN (
      'dinheiro', 'boleto', 'credito_em_conta', 'debito_em_conta', 
      'cheque_a_vista', 'cheque_a_prazo', 'cartao_de_credito', 
      'cartao_de_debito', 'guia', 'permuta', 'pix', 'debito_automatico'
    ));
  END IF;
END $$;

-- Add foreign key constraint for recurrence_rule_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'transactions_recurrence_rule_id_fkey'
  ) THEN
    ALTER TABLE transactions 
    ADD CONSTRAINT transactions_recurrence_rule_id_fkey 
    FOREIGN KEY (recurrence_rule_id) REFERENCES recurrence_rules(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add index for recurrence_rule_id
CREATE INDEX IF NOT EXISTS idx_transactions_recurrence_rule 
ON transactions(recurrence_rule_id);