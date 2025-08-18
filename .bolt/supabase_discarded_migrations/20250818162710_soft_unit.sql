/*
  # Create Financial Management Tables

  This migration creates the core financial management tables with proper relationships
  and multi-workspace architecture support.

  ## New Tables
  1. **accounts** - Cash and bank accounts management
     - `id` (uuid, primary key)
     - `workspace_id` (uuid, foreign key to workspaces)
     - `type` (enum: cash, bank)
     - `initial_balance` (decimal)
     - `opened_at` (date)
     - `title` (text)
     - `description` (text, optional)
     - `unit_id` (uuid, optional)
     - `accounting_code` (text, optional)
     - `cost_center_id` (uuid, optional, FK to cost_centers)
     - `cancel_days` (integer, default 0)
     - `created_at`, `updated_at` (timestamps)

  2. **credit_cards** - Credit card management
     - `id` (uuid, primary key)
     - `workspace_id` (uuid, foreign key to workspaces)
     - `unit_id` (uuid, required)
     - `title` (text)
     - `flag` (text, card network)
     - `limit` (decimal)
     - `linked_account_id` (uuid, optional FK to accounts)
     - `due_day` (integer, 1-31)
     - `closing_day` (integer, 1-31)
     - `organization_id` (uuid, optional)
     - `description` (text, optional)
     - `created_at`, `updated_at` (timestamps)

  3. **categories** - Transaction categories with hierarchy
     - `id` (uuid, primary key)
     - `workspace_id` (uuid, foreign key to workspaces)
     - `title` (text)
     - `type` (enum: income, expense)
     - `parent_id` (uuid, optional FK to categories)
     - `is_fixed` (boolean, default false)
     - `counterparty_id` (uuid, optional)
     - `reduced_code` (text, optional)
     - `description` (text, optional)
     - `created_at`, `updated_at` (timestamps)

  4. **cost_centers** - Cost center management with hierarchy
     - `id` (uuid, primary key)
     - `workspace_id` (uuid, foreign key to workspaces)
     - `title` (text)
     - `code` (text, optional)
     - `parent_id` (uuid, optional FK to cost_centers)
     - `unit_id` (uuid, optional)
     - `accounting_code` (text, optional)
     - `status` (enum: active, inactive, default active)
     - `description` (text, optional)
     - `created_at`, `updated_at` (timestamps)

  5. **activity_logs** - Audit trail and user activity tracking
     - `id` (uuid, primary key)
     - `user_id` (uuid, foreign key to auth.users)
     - `workspace_id` (uuid, foreign key to workspaces)
     - `action` (enum: create, update, delete, login, logout, view)
     - `entity_type` (text)
     - `entity_id` (uuid)
     - `changes` (jsonb, optional)
     - `description` (text, optional)
     - `created_at` (timestamp)

  ## Security
  - Enable RLS on all tables
  - Add policies for workspace-based access control
  - Add appropriate indexes for performance

  ## Important Notes
  - All tables support multi-workspace architecture
  - Hierarchical support for categories and cost_centers
  - Proper foreign key constraints with cascade deletes where appropriate
  - Audit trail support through activity_logs table
*/

-- Create ENUM types
DO $$ BEGIN
    CREATE TYPE account_type AS ENUM ('cash', 'bank');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE category_type AS ENUM ('income', 'expense');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE cost_center_status AS ENUM ('active', 'inactive');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE activity_action AS ENUM ('create', 'update', 'delete', 'login', 'logout', 'view');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create accounts table
CREATE TABLE IF NOT EXISTS accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
    type account_type NOT NULL,
    initial_balance decimal(14,2) DEFAULT 0,
    opened_at date NOT NULL,
    title text NOT NULL,
    description text,
    unit_id uuid,
    accounting_code text,
    cost_center_id uuid,
    cancel_days integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create credit_cards table
CREATE TABLE IF NOT EXISTS credit_cards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
    unit_id uuid NOT NULL,
    title text NOT NULL,
    flag text NOT NULL,
    limit decimal(14,2) NOT NULL,
    linked_account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
    due_day integer NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
    closing_day integer NOT NULL CHECK (closing_day >= 1 AND closing_day <= 31),
    organization_id uuid,
    description text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create categories table (hierarchical)
CREATE TABLE IF NOT EXISTS categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
    title text NOT NULL,
    type category_type NOT NULL,
    parent_id uuid REFERENCES categories(id) ON DELETE SET NULL,
    is_fixed boolean DEFAULT false,
    counterparty_id uuid,
    reduced_code text,
    description text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create cost_centers table (hierarchical)
CREATE TABLE IF NOT EXISTS cost_centers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
    title text NOT NULL,
    code text,
    parent_id uuid REFERENCES cost_centers(id) ON DELETE SET NULL,
    unit_id uuid,
    accounting_code text,
    status cost_center_status DEFAULT 'active',
    description text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Add foreign key constraint for accounts.cost_center_id after cost_centers table is created
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'accounts_cost_center_id_fkey'
    ) THEN
        ALTER TABLE accounts ADD CONSTRAINT accounts_cost_center_id_fkey 
        FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id uuid NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
    action activity_action NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    changes jsonb,
    description text,
    created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_accounts_workspace ON accounts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(type);
CREATE INDEX IF NOT EXISTS idx_accounts_cost_center ON accounts(cost_center_id);

CREATE INDEX IF NOT EXISTS idx_credit_cards_workspace ON credit_cards(workspace_id);
CREATE INDEX IF NOT EXISTS idx_credit_cards_linked_account ON credit_cards(linked_account_id);
CREATE INDEX IF NOT EXISTS idx_credit_cards_unit ON credit_cards(unit_id);

CREATE INDEX IF NOT EXISTS idx_categories_workspace ON categories(workspace_id);
CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);

CREATE INDEX IF NOT EXISTS idx_cost_centers_workspace ON cost_centers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_cost_centers_parent ON cost_centers(parent_id);
CREATE INDEX IF NOT EXISTS idx_cost_centers_status ON cost_centers(status);

CREATE INDEX IF NOT EXISTS idx_activity_logs_workspace ON activity_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);

-- Enable Row Level Security
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for accounts
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

-- Create RLS policies for credit_cards
CREATE POLICY "Users can access credit cards in their workspaces"
    ON credit_cards
    FOR ALL
    TO authenticated
    USING (workspace_id IN (
        SELECT workspace_user_workspace_id 
        FROM workspace_users 
        WHERE workspace_user_user_id = auth.uid()
    ));

CREATE POLICY "Users can manage credit cards in their workspaces"
    ON credit_cards
    FOR ALL
    TO authenticated
    WITH CHECK (workspace_id IN (
        SELECT workspace_user_workspace_id 
        FROM workspace_users 
        WHERE workspace_user_user_id = auth.uid()
    ));

-- Create RLS policies for categories
CREATE POLICY "Users can access categories in their workspaces"
    ON categories
    FOR ALL
    TO authenticated
    USING (workspace_id IN (
        SELECT workspace_user_workspace_id 
        FROM workspace_users 
        WHERE workspace_user_user_id = auth.uid()
    ));

CREATE POLICY "Users can manage categories in their workspaces"
    ON categories
    FOR ALL
    TO authenticated
    WITH CHECK (workspace_id IN (
        SELECT workspace_user_workspace_id 
        FROM workspace_users 
        WHERE workspace_user_user_id = auth.uid()
    ));

-- Create RLS policies for cost_centers
CREATE POLICY "Users can access cost centers in their workspaces"
    ON cost_centers
    FOR ALL
    TO authenticated
    USING (workspace_id IN (
        SELECT workspace_user_workspace_id 
        FROM workspace_users 
        WHERE workspace_user_user_id = auth.uid()
    ));

CREATE POLICY "Users can manage cost centers in their workspaces"
    ON cost_centers
    FOR ALL
    TO authenticated
    WITH CHECK (workspace_id IN (
        SELECT workspace_user_workspace_id 
        FROM workspace_users 
        WHERE workspace_user_user_id = auth.uid()
    ));

-- Create RLS policies for activity_logs
CREATE POLICY "Users can view activity logs in their workspaces"
    ON activity_logs
    FOR SELECT
    TO authenticated
    USING (workspace_id IN (
        SELECT workspace_user_workspace_id 
        FROM workspace_users 
        WHERE workspace_user_user_id = auth.uid()
    ));

CREATE POLICY "System can insert activity logs"
    ON activity_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid() AND workspace_id IN (
        SELECT workspace_user_workspace_id 
        FROM workspace_users 
        WHERE workspace_user_user_id = auth.uid()
    ));

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_accounts_updated_at
    BEFORE UPDATE ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credit_cards_updated_at
    BEFORE UPDATE ON credit_cards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cost_centers_updated_at
    BEFORE UPDATE ON cost_centers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();