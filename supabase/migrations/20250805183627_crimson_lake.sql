/*
  # Complete RLS Policy Overhaul

  1. Security
    - Drop all existing policies to start fresh
    - Create simple, non-recursive policies
    - Enable RLS on all tables
    
  2. New Tables
    - Clean workspace and user management
    - Simple relationship structure
    
  3. Policies
    - Direct user-based policies without circular references
    - Clear ownership and membership rules
*/

-- Disable RLS temporarily for cleanup
ALTER TABLE public.workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_centers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.banks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_cards DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.brokers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.people DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "workspaces_delete_owner" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_insert_owner" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_select_owner" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_update_owner" ON public.workspaces;
DROP POLICY IF EXISTS "workspace_owner_all" ON public.workspaces;
DROP POLICY IF EXISTS "workspace_member_read" ON public.workspaces;

DROP POLICY IF EXISTS "workspace_users_delete_owner" ON public.workspace_users;
DROP POLICY IF EXISTS "workspace_users_insert_owner" ON public.workspace_users;
DROP POLICY IF EXISTS "workspace_users_select_owner" ON public.workspace_users;
DROP POLICY IF EXISTS "workspace_users_update_owner" ON public.workspace_users;
DROP POLICY IF EXISTS "workspace_users_owner_all" ON public.workspace_users;
DROP POLICY IF EXISTS "workspace_users_self_read" ON public.workspace_users;

DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- Re-enable RLS
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brokers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;

-- Create simple, direct policies for users table
CREATE POLICY "users_own_profile" ON public.users
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create simple, direct policies for workspaces table
CREATE POLICY "workspaces_owner_access" ON public.workspaces
  FOR ALL USING (auth.uid() = workspace_owner_user_id)
  WITH CHECK (auth.uid() = workspace_owner_user_id);

-- Create simple, direct policies for workspace_users table
CREATE POLICY "workspace_users_own_records" ON public.workspace_users
  FOR ALL USING (auth.uid() = workspace_user_user_id)
  WITH CHECK (auth.uid() = workspace_user_user_id);

CREATE POLICY "workspace_users_owner_manage" ON public.workspace_users
  FOR ALL USING (
    auth.uid() IN (
      SELECT workspace_owner_user_id 
      FROM public.workspaces 
      WHERE workspace_id = workspace_user_workspace_id
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT workspace_owner_user_id 
      FROM public.workspaces 
      WHERE workspace_id = workspace_user_workspace_id
    )
  );

-- Create policies for other tables (simplified)
CREATE POLICY "transactions_workspace_access" ON public.transactions
  FOR ALL USING (
    auth.uid() IN (
      SELECT workspace_owner_user_id 
      FROM public.workspaces 
      WHERE workspace_id = transaction_workspace_id
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT workspace_owner_user_id 
      FROM public.workspaces 
      WHERE workspace_id = transaction_workspace_id
    )
  );

CREATE POLICY "categories_workspace_access" ON public.categories
  FOR ALL USING (
    auth.uid() IN (
      SELECT workspace_owner_user_id 
      FROM public.workspaces 
      WHERE workspace_id = category_workspace_id
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT workspace_owner_user_id 
      FROM public.workspaces 
      WHERE workspace_id = category_workspace_id
    )
  );

CREATE POLICY "cost_centers_workspace_access" ON public.cost_centers
  FOR ALL USING (
    auth.uid() IN (
      SELECT workspace_owner_user_id 
      FROM public.workspaces 
      WHERE workspace_id = cost_center_workspace_id
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT workspace_owner_user_id 
      FROM public.workspaces 
      WHERE workspace_id = cost_center_workspace_id
    )
  );

CREATE POLICY "banks_workspace_access" ON public.banks
  FOR ALL USING (
    auth.uid() IN (
      SELECT workspace_owner_user_id 
      FROM public.workspaces 
      WHERE workspace_id = bank_workspace_id
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT workspace_owner_user_id 
      FROM public.workspaces 
      WHERE workspace_id = bank_workspace_id
    )
  );

CREATE POLICY "credit_cards_workspace_access" ON public.credit_cards
  FOR ALL USING (
    auth.uid() IN (
      SELECT workspace_owner_user_id 
      FROM public.workspaces 
      WHERE workspace_id = credit_card_workspace_id
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT workspace_owner_user_id 
      FROM public.workspaces 
      WHERE workspace_id = credit_card_workspace_id
    )
  );

CREATE POLICY "brokers_workspace_access" ON public.brokers
  FOR ALL USING (
    auth.uid() IN (
      SELECT workspace_owner_user_id 
      FROM public.workspaces 
      WHERE workspace_id = broker_workspace_id
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT workspace_owner_user_id 
      FROM public.workspaces 
      WHERE workspace_id = broker_workspace_id
    )
  );

CREATE POLICY "people_workspace_access" ON public.people
  FOR ALL USING (
    auth.uid() IN (
      SELECT workspace_owner_user_id 
      FROM public.workspaces 
      WHERE workspace_id = person_workspace_id
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT workspace_owner_user_id 
      FROM public.workspaces 
      WHERE workspace_id = person_workspace_id
    )
  );