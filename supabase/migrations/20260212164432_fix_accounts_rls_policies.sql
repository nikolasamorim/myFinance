/*
  # Fix Accounts RLS Policies

  ## Summary
  Restores missing RLS policies for the accounts table. The table had RLS enabled but no policies,
  which was blocking all SELECT, INSERT, UPDATE, and DELETE operations.

  ## Problem Diagnosed
  - RLS is enabled on accounts table ✅
  - No policies exist ❌
  - Result: Users cannot see or create accounts

  ## Policies Created
  1. **SELECT**: Users can view accounts from workspaces they own or are members of
  2. **INSERT**: Users can create accounts in workspaces they own or are members of
  3. **UPDATE**: Users can update accounts in workspaces they own or are members of
  4. **DELETE**: Users can delete accounts in workspaces they own or are members of

  ## Security Model
  - Users must be either:
    - Owner of the workspace (workspace_owner_user_id = auth.uid())
    - OR Member of the workspace (exists in workspace_users table)
  - All operations check workspace membership via workspace_id
  - Uses auth.uid() for secure user identification
*/

-- Drop existing policies if any (safety measure)
DROP POLICY IF EXISTS "Users can view accounts in their workspaces" ON accounts;
DROP POLICY IF EXISTS "Users can create accounts in their workspaces" ON accounts;
DROP POLICY IF EXISTS "Users can update accounts in their workspaces" ON accounts;
DROP POLICY IF EXISTS "Users can delete accounts in their workspaces" ON accounts;

-- ============================================================================
-- SELECT POLICY: View accounts from accessible workspaces
-- ============================================================================
CREATE POLICY "Users can view accounts in their workspaces"
ON accounts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    -- User is owner of the workspace
    SELECT 1 FROM workspaces
    WHERE workspaces.workspace_id = accounts.workspace_id
      AND workspaces.workspace_owner_user_id = auth.uid()
  )
  OR EXISTS (
    -- User is member of the workspace
    SELECT 1 FROM workspace_users
    WHERE workspace_users.workspace_user_workspace_id = accounts.workspace_id
      AND workspace_users.workspace_user_user_id = auth.uid()
  )
);

-- ============================================================================
-- INSERT POLICY: Create accounts in accessible workspaces
-- ============================================================================
CREATE POLICY "Users can create accounts in their workspaces"
ON accounts
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    -- User is owner of the workspace
    SELECT 1 FROM workspaces
    WHERE workspaces.workspace_id = accounts.workspace_id
      AND workspaces.workspace_owner_user_id = auth.uid()
  )
  OR EXISTS (
    -- User is member of the workspace
    SELECT 1 FROM workspace_users
    WHERE workspace_users.workspace_user_workspace_id = accounts.workspace_id
      AND workspace_users.workspace_user_user_id = auth.uid()
  )
);

-- ============================================================================
-- UPDATE POLICY: Update accounts in accessible workspaces
-- ============================================================================
CREATE POLICY "Users can update accounts in their workspaces"
ON accounts
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    -- User is owner of the workspace
    SELECT 1 FROM workspaces
    WHERE workspaces.workspace_id = accounts.workspace_id
      AND workspaces.workspace_owner_user_id = auth.uid()
  )
  OR EXISTS (
    -- User is member of the workspace
    SELECT 1 FROM workspace_users
    WHERE workspace_users.workspace_user_workspace_id = accounts.workspace_id
      AND workspace_users.workspace_user_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    -- User is owner of the workspace (after update)
    SELECT 1 FROM workspaces
    WHERE workspaces.workspace_id = accounts.workspace_id
      AND workspaces.workspace_owner_user_id = auth.uid()
  )
  OR EXISTS (
    -- User is member of the workspace (after update)
    SELECT 1 FROM workspace_users
    WHERE workspace_users.workspace_user_workspace_id = accounts.workspace_id
      AND workspace_users.workspace_user_user_id = auth.uid()
  )
);

-- ============================================================================
-- DELETE POLICY: Delete accounts in accessible workspaces
-- ============================================================================
CREATE POLICY "Users can delete accounts in their workspaces"
ON accounts
FOR DELETE
TO authenticated
USING (
  EXISTS (
    -- User is owner of the workspace
    SELECT 1 FROM workspaces
    WHERE workspaces.workspace_id = accounts.workspace_id
      AND workspaces.workspace_owner_user_id = auth.uid()
  )
  OR EXISTS (
    -- User is member of the workspace
    SELECT 1 FROM workspace_users
    WHERE workspace_users.workspace_user_workspace_id = accounts.workspace_id
      AND workspace_users.workspace_user_user_id = auth.uid()
  )
);

-- ============================================================================
-- Verification: Ensure RLS is enabled
-- ============================================================================
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- Add comment for documentation
COMMENT ON TABLE accounts IS 'Bank accounts and cash accounts. RLS policies ensure users can only access accounts from workspaces they own or are members of.';
