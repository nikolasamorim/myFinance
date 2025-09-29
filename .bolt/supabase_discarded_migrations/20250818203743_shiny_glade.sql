/*
  # Advanced Transaction Management Schema

  1. New Tables
    - `recurrence_rules` - Manages recurring transaction rules
    - `installment_groups` - Groups related installment transactions
  
  2. Updated Tables
    - `transactions` - Enhanced with new fields for installments, recurrence, and payment methods
  
  3. Security
    - Enable RLS on all new tables
    - Add policies for workspace-based access
    - Maintain data integrity with foreign keys
  
  4. Features
    - Support for installment transactions with grouping
    - Recurring transaction rules with flexible scheduling
    - Enhanced payment method tracking
    - Competence date for accounting purposes
*/

-- Update transactions table with new fields
DO $$
BEGIN
  -- Add new columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'transaction_issue_date'
  ) THEN
    ALTER TABLE transactions ADD COLUMN transaction_issue_date date DEFAULT CURRENT_DATE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'transaction_competence_date'
  ) THEN
    ALTER TABLE transactions ADD COLUMN transaction_competence_date text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'transaction_payment_method'
  ) THEN
    ALTER TABLE transactions ADD COLUMN transaction_payment_method text DEFAULT 'pix';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'transaction_is_paid'
  ) THEN
    ALTER TABLE transactions ADD COLUMN transaction_is_paid boolean DEFAULT false;
  END IF;

  -- Update existing status values to match new is_paid field
  UPDATE transactions 
  SET transaction_is_paid = CASE 
    WHEN transaction_status = 'paid' OR transaction_status = 'received' THEN true 
    ELSE false 
  END
  WHERE transaction_is_paid IS NULL;
END $$;

-- Add constraints for new fields
DO $$
BEGIN
  -- Payment method constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'transactions' AND constraint_name = 'transactions_payment_method_check'
  ) THEN
    ALTER TABLE transactions ADD CONSTRAINT transactions_payment_method_check 
    CHECK (transaction_payment_method = ANY (ARRAY[
      'cash'::text, 'boleto'::text, 'credit_to_account'::text, 'debit_to_account'::text,
      'check_cash'::text, 'check_term'::text, 'credit_card'::text, 'debit_card'::text,
      'bank_slip'::text, 'barter'::text, 'pix'::text, 'auto_debit'::text
    ]));
  END IF;
END $$;

-- Create recurrence_rules table if it doesn't exist
CREATE TABLE IF NOT EXISTS recurrence_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (transaction_type = ANY (ARRAY['income'::text, 'expense'::text, 'debt'::text, 'investment'::text])),
  description text NOT NULL,
  start_date date NOT NULL,
  recurrence_type text NOT NULL CHECK (recurrence_type = ANY (ARRAY['daily'::text, 'weekly'::text, 'monthly'::text, 'yearly'::text])),
  repeat_count integer,
  end_date date,
  due_adjustment text DEFAULT 'none' CHECK (due_adjustment = ANY (ARRAY['none'::text, 'previous_business_day'::text, 'next_business_day'::text])),
  recurrence_day text,
  status text DEFAULT 'active' CHECK (status = ANY (ARRAY['active'::text, 'paused'::text, 'canceled'::text])),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create installment_groups table if it doesn't exist
CREATE TABLE IF NOT EXISTS installment_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_value numeric(15,2) NOT NULL,
  installment_count integer NOT NULL CHECK (installment_count > 0),
  initial_due_date date NOT NULL,
  description text NOT NULL,
  payment_method_id text,
  account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
  card_id uuid REFERENCES credit_cards(credit_card_id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE recurrence_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE installment_groups ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for recurrence_rules
CREATE POLICY "Users can access recurrence rules in their workspaces"
  ON recurrence_rules
  FOR ALL
  TO authenticated
  USING (workspace_id IN (
    SELECT workspace_user_workspace_id
    FROM workspace_users
    WHERE workspace_user_user_id = uid()
  ))
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_user_workspace_id
      FROM workspace_users
      WHERE workspace_user_user_id = uid()
    ) AND user_id = uid()
  );

-- Create RLS policies for installment_groups
CREATE POLICY "Users can access installment groups in their workspaces"
  ON installment_groups
  FOR ALL
  TO authenticated
  USING (workspace_id IN (
    SELECT workspace_user_workspace_id
    FROM workspace_users
    WHERE workspace_user_user_id = uid()
  ))
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_user_workspace_id
      FROM workspace_users
      WHERE workspace_user_user_id = uid()
    ) AND user_id = uid()
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_recurrence_rules_workspace ON recurrence_rules(workspace_id);
CREATE INDEX IF NOT EXISTS idx_recurrence_rules_user ON recurrence_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_recurrence_rules_type ON recurrence_rules(transaction_type);
CREATE INDEX IF NOT EXISTS idx_recurrence_rules_status ON recurrence_rules(status);

CREATE INDEX IF NOT EXISTS idx_installment_groups_workspace ON installment_groups(workspace_id);
CREATE INDEX IF NOT EXISTS idx_installment_groups_user ON installment_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_installment_groups_account ON installment_groups(account_id);
CREATE INDEX IF NOT EXISTS idx_installment_groups_card ON installment_groups(card_id);

CREATE INDEX IF NOT EXISTS idx_transactions_installment_group ON transactions(installment_group_id);
CREATE INDEX IF NOT EXISTS idx_transactions_recurrence ON transactions(recurrence_id);
CREATE INDEX IF NOT EXISTS idx_transactions_installment_number ON transactions(installment_number);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_recurrence_rules_updated_at
  BEFORE UPDATE ON recurrence_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_installment_groups_updated_at
  BEFORE UPDATE ON installment_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();