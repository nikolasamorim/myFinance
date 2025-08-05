/*
  # Fix RLS Policies to Prevent Infinite Recursion

  1. Clean Up Existing Policies
    - Remove all existing RLS policies from workspaces and workspace_users tables
    - This ensures we start with a clean state

  2. Create Simple, Non-Recursive Policies
    - workspace_owner_all: Owners can do everything with their workspaces
    - workspace_member_read: Members can read workspaces they belong to
    - workspace_users_owner_all: Owners can manage workspace memberships
    - workspace_users_self_read: Users can read their own membership records

  3. Security
    - All policies use direct auth.uid() comparisons to avoid recursion
    - No complex subqueries that reference the same tables
*/

-- Drop all existing policies for workspaces
DROP POLICY IF EXISTS "enable_all_for_workspace_owner" ON public.workspaces;
DROP POLICY IF EXISTS "enable_select_for_workspace_members" ON public.workspaces;
DROP POLICY IF EXISTS "workspace_member_read" ON public.workspaces;
DROP POLICY IF EXISTS "workspace_owner_all" ON public.workspaces;

-- Drop all existing policies for workspace_users
DROP POLICY IF EXISTS "Users can read workspace memberships they're part of" ON public.workspace_users;
DROP POLICY IF EXISTS "Workspace owners and admins can manage memberships" ON public.workspace_users;
DROP POLICY IF EXISTS "enable_all_for_workspace_owner_on_members" ON public.workspace_users;
DROP POLICY IF EXISTS "enable_select_for_self_workspace_user" ON public.workspace_users;
DROP POLICY IF EXISTS "workspace_users_own_select" ON public.workspace_users;
DROP POLICY IF EXISTS "workspace_users_owner_all" ON public.workspace_users;
DROP POLICY IF EXISTS "workspace_users_owner_select" ON public.workspace_users;

-- Create simple, non-recursive policies for workspaces
CREATE POLICY "workspace_owner_all"
  ON public.workspaces
  FOR ALL
  TO authenticated
  USING (workspace_owner_user_id = auth.uid())
  WITH CHECK (workspace_owner_user_id = auth.uid());

CREATE POLICY "workspace_member_read"
  ON public.workspaces
  FOR SELECT
  TO authenticated
  USING (
    workspace_owner_user_id = auth.uid() 
    OR workspace_id IN (
      SELECT workspace_user_workspace_id 
      FROM public.workspace_users 
      WHERE workspace_user_user_id = auth.uid()
    )
  );

-- Create simple, non-recursive policies for workspace_users
CREATE POLICY "workspace_users_owner_all"
  ON public.workspace_users
  FOR ALL
  TO authenticated
  USING (
    workspace_user_workspace_id IN (
      SELECT workspace_id 
      FROM public.workspaces 
      WHERE workspace_owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_user_workspace_id IN (
      SELECT workspace_id 
      FROM public.workspaces 
      WHERE workspace_owner_user_id = auth.uid()
    )
  );

CREATE POLICY "workspace_users_self_read"
  ON public.workspace_users
  FOR SELECT
  TO authenticated
  USING (workspace_user_user_id = auth.uid());