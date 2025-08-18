/*
  # Create accounts table

  1. New Tables
    - `accounts`
      - `id` (uuid, primary key)
      - `workspace_id` (uuid, foreign key to workspaces)
      - `title` (text, required)
      - `type` (enum: cash, bank, required)
      - `initial_balance` (decimal, default 0)
      - `opened_at` (date, required)
      - `cost_center_id` (uuid, optional foreign key to cost_centers)
      - `description` (text, optional)
      - `unit_id` (uuid, optional)
      - `accounting_code` (text, optional)
      - `cancel_days` (integer, default 0)
      - `created_at` and `updated_at` (timestamps)

  2. Security
    - Enable RLS on `accounts` table
    - Add policies for workspace-based access
    - Add policies for authenticated users

  3. Indexes
    - Index on workspace_id for performance
    - Index on type for filtering
    - Index on cost_center_id for joins
*/

-- Create accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('cash', 'bank')),
  initial_balance decimal(14,2) DEFAULT 0,
  opened_at date NOT NULL,
  cost_center_id uuid,
  description text,
  unit_id uuid,
  accounting_code text,
  cancel_days integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key constraints
ALTER TABLE accounts 
ADD CONSTRAINT accounts_workspace_id_fkey 
FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id) ON DELETE CASCADE;

-- Add foreign key to cost_centers if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cost_centers') THEN
    ALTER TABLE accounts 
    ADD CONSTRAINT accounts_cost_center_id_fkey 
    FOREIGN KEY (cost_center_id) REFERENCES cost_centers(cost_center_id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_accounts_workspace ON accounts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(type);
CREATE INDEX IF NOT EXISTS idx_accounts_cost_center ON accounts(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_accounts_opened_at ON accounts(opened_at);

-- Enable Row Level Security
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can access accounts in their workspaces"
  ON accounts
  FOR ALL
  TO authenticated
  USING (workspace_id IN (
    SELECT workspace_user_workspace_id 
    FROM workspace_users 
    WHERE workspace_user_user_id = auth.uid()
  ));

CREATE POLICY "Users can manage accounts in their workspaces"
  ON accounts
  FOR ALL
  TO authenticated
  WITH CHECK (workspace_id IN (
    SELECT workspace_user_workspace_id 
    FROM workspace_users 
    WHERE workspace_user_user_id = auth.uid()
  ));

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();