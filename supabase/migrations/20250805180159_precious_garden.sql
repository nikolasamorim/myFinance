/*
  # Fix infinite recursion in workspace RLS policies

  1. Problem
    - Current RLS policies for workspaces table are causing infinite recursion
    - This happens when policies reference the same table they're protecting

  2. Solution
    - Drop existing problematic policies
    - Create simplified, non-recursive policies
    - Use direct auth.uid() comparisons instead of subqueries

  3. New Policies
    - SELECT: Users can read workspaces they own or are members of
    - INSERT: Users can create workspaces (they become the owner)
    - UPDATE: Only workspace owners can update
    - DELETE: Only workspace owners can delete
*/

-- Drop all existing policies for workspaces table
DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can read workspaces they belong to" ON workspaces;
DROP POLICY IF EXISTS "Workspace owners can update their workspaces" ON workspaces;
DROP POLICY IF EXISTS "workspace_member_select" ON workspaces;
DROP POLICY IF EXISTS "workspace_owner_delete" ON workspaces;
DROP POLICY IF EXISTS "workspace_owner_insert" ON workspaces;
DROP POLICY IF EXISTS "workspace_owner_select" ON workspaces;
DROP POLICY IF EXISTS "workspace_owner_update" ON workspaces;

-- Create simple, non-recursive policies
CREATE POLICY "workspace_owner_all"
  ON workspaces
  FOR ALL
  TO authenticated
  USING (workspace_owner_user_id = auth.uid())
  WITH CHECK (workspace_owner_user_id = auth.uid());

-- Allow users to read workspaces where they are members
CREATE POLICY "workspace_member_read"
  ON workspaces
  FOR SELECT
  TO authenticated
  USING (
    workspace_owner_user_id = auth.uid() 
    OR 
    EXISTS (
      SELECT 1 FROM workspace_users 
      WHERE workspace_users.workspace_user_workspace_id = workspaces.workspace_id 
      AND workspace_users.workspace_user_user_id = auth.uid()
    )
  );