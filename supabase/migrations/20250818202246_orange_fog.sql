/*
  # Advanced Transaction System - Recurring and Installments

  1. New Tables
    - `recurrence_rules` - Manages recurring transaction patterns
    - `installment_groups` - Groups installment transactions together
    
  2. Updates to Existing Tables
    - Add recurrence_id to transactions table
    - Add installment_group_id to transactions table  
    - Add installment_number and installment_total to transactions table

  3. Security
    - Enable RLS on all new tables
    - Add workspace-based access policies
    - Maintain data integrity with foreign keys

  4. Indexes
    - Performance indexes for common queries
    - Unique constraints where needed
*/

-- Create recurrence_rules table
CREATE TABLE IF NOT EXISTS recurrence_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (transaction_type IN ('income', 'expense', 'debt', 'investment')),
  description text NOT NULL,
  start_date date NOT NULL,
  recurrence_type text NOT NULL CHECK (recurrence_type IN ('daily', 'weekly', 'monthly', 'yearly')),
  repeat_count integer,
  end_date date,
  due_adjustment text DEFAULT 'none' CHECK (due_adjustment IN ('none', 'previous_business_day', 'next_business_day')),
  recurrence_day text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'paused', 'canceled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create installment_groups table
CREATE TABLE IF NOT EXISTS installment_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_value numeric(15,2) NOT NULL,
  installment_count integer NOT NULL CHECK (installment_count > 0),
  initial_due_date date NOT NULL,
  description text NOT NULL,
  payment_method_id text,
  account_id uuid,
  card_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add new columns to transactions table
DO $$
BEGIN
  -- Add recurrence_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'recurrence_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN recurrence_id uuid REFERENCES recurrence_rules(id) ON DELETE SET NULL;
  END IF;

  -- Add installment_group_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'installment_group_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN installment_group_id uuid REFERENCES installment_groups(id) ON DELETE SET NULL;
  END IF;

  -- Add installment_number column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'installment_number'
  ) THEN
    ALTER TABLE transactions ADD COLUMN installment_number integer;
  END IF;

  -- Add installment_total column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'installment_total'
  ) THEN
    ALTER TABLE transactions ADD COLUMN installment_total integer;
  END IF;
END $$;

-- Add foreign key constraints for installment_groups
DO $$
BEGIN
  -- Add account_id foreign key if accounts table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'accounts') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'installment_groups_account_id_fkey'
    ) THEN
      ALTER TABLE installment_groups 
      ADD CONSTRAINT installment_groups_account_id_fkey 
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL;
    END IF;
  END IF;

  -- Add card_id foreign key if credit_cards table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'credit_cards') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'installment_groups_card_id_fkey'
    ) THEN
      ALTER TABLE installment_groups 
      ADD CONSTRAINT installment_groups_card_id_fkey 
      FOREIGN KEY (card_id) REFERENCES credit_cards(credit_card_id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_recurrence_rules_workspace ON recurrence_rules(workspace_id);
CREATE INDEX IF NOT EXISTS idx_recurrence_rules_user ON recurrence_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_recurrence_rules_status ON recurrence_rules(status);
CREATE INDEX IF NOT EXISTS idx_recurrence_rules_type ON recurrence_rules(transaction_type);

CREATE INDEX IF NOT EXISTS idx_installment_groups_workspace ON installment_groups(workspace_id);
CREATE INDEX IF NOT EXISTS idx_installment_groups_user ON installment_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_installment_groups_account ON installment_groups(account_id);
CREATE INDEX IF NOT EXISTS idx_installment_groups_card ON installment_groups(card_id);

CREATE INDEX IF NOT EXISTS idx_transactions_recurrence ON transactions(recurrence_id);
CREATE INDEX IF NOT EXISTS idx_transactions_installment_group ON transactions(installment_group_id);
CREATE INDEX IF NOT EXISTS idx_transactions_installment_number ON transactions(installment_number);

-- Enable RLS on new tables
ALTER TABLE recurrence_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE installment_groups ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for recurrence_rules
CREATE POLICY "Users can access recurrence rules in their workspaces"
  ON recurrence_rules
  FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_user_workspace_id
      FROM workspace_users
      WHERE workspace_user_user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_user_workspace_id
      FROM workspace_users
      WHERE workspace_user_user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

-- Create RLS policies for installment_groups
CREATE POLICY "Users can access installment groups in their workspaces"
  ON installment_groups
  FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_user_workspace_id
      FROM workspace_users
      WHERE workspace_user_user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_user_workspace_id
      FROM workspace_users
      WHERE workspace_user_user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

-- Create triggers for updated_at columns
CREATE TRIGGER trigger_update_recurrence_rules_updated_at
  BEFORE UPDATE ON recurrence_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_installment_groups_updated_at
  BEFORE UPDATE ON installment_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();