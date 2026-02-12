/*
  # Fix Recurrence Rules RLS Policies

  ## Summary
  Creates missing RLS policies for recurrence_rules table and adds created_by_user_id for audit.
  The table has RLS enabled but no policies, blocking all operations.

  ## Problem Diagnosed
  - RLS is enabled on recurrence_rules ✅
  - No policies exist ❌
  - Table already has workspace_id (NOT NULL, FK to workspaces) ✅
  - Code tries to insert user_id but column doesn't exist ❌

  ## Changes Made
  1. Add created_by_user_id column for audit purposes (nullable)
  2. Create 4 RLS policies (SELECT, INSERT, UPDATE, DELETE)
  3. All policies validate workspace membership

  ## Policies Created
  1. **SELECT**: Users can view rules from workspaces they own or are members of
  2. **INSERT**: Users can create rules in workspaces they own or are members of
  3. **UPDATE**: Users can update rules in workspaces they own or are members of
  4. **DELETE**: Users can delete rules in workspaces they own or are members of

  ## Security Model
  - Users must be either:
    - Owner of the workspace (workspace_owner_user_id = auth.uid())
    - OR Member of the workspace (exists in workspace_users table)
  - All operations check workspace membership via workspace_id
  - Uses auth.uid() for secure user identification
*/

-- ============================================================================
-- Add created_by_user_id column for audit purposes (nullable)
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recurrence_rules' AND column_name = 'created_by_user_id'
  ) THEN
    ALTER TABLE recurrence_rules ADD COLUMN created_by_user_id uuid;
    COMMENT ON COLUMN recurrence_rules.created_by_user_id IS 'User who created the rule (audit only, not used for authorization)';
  END IF;
END $$;

-- ============================================================================
-- Drop existing policies if any (safety measure)
-- ============================================================================
DROP POLICY IF EXISTS "Users can view recurrence rules in their workspaces" ON recurrence_rules;
DROP POLICY IF EXISTS "Users can create recurrence rules in their workspaces" ON recurrence_rules;
DROP POLICY IF EXISTS "Users can update recurrence rules in their workspaces" ON recurrence_rules;
DROP POLICY IF EXISTS "Users can delete recurrence rules in their workspaces" ON recurrence_rules;

-- ============================================================================
-- SELECT POLICY: View rules from accessible workspaces
-- ============================================================================
CREATE POLICY "Users can view recurrence rules in their workspaces"
ON recurrence_rules
FOR SELECT
TO authenticated
USING (
  EXISTS (
    -- User is owner of the workspace
    SELECT 1 FROM workspaces
    WHERE workspaces.workspace_id = recurrence_rules.workspace_id
      AND workspaces.workspace_owner_user_id = auth.uid()
  )
  OR EXISTS (
    -- User is member of the workspace
    SELECT 1 FROM workspace_users
    WHERE workspace_users.workspace_user_workspace_id = recurrence_rules.workspace_id
      AND workspace_users.workspace_user_user_id = auth.uid()
  )
);

-- ============================================================================
-- INSERT POLICY: Create rules in accessible workspaces
-- ============================================================================
CREATE POLICY "Users can create recurrence rules in their workspaces"
ON recurrence_rules
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    -- User is owner of the workspace
    SELECT 1 FROM workspaces
    WHERE workspaces.workspace_id = recurrence_rules.workspace_id
      AND workspaces.workspace_owner_user_id = auth.uid()
  )
  OR EXISTS (
    -- User is member of the workspace
    SELECT 1 FROM workspace_users
    WHERE workspace_users.workspace_user_workspace_id = recurrence_rules.workspace_id
      AND workspace_users.workspace_user_user_id = auth.uid()
  )
);

-- ============================================================================
-- UPDATE POLICY: Update rules in accessible workspaces
-- ============================================================================
CREATE POLICY "Users can update recurrence rules in their workspaces"
ON recurrence_rules
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    -- User is owner of the workspace
    SELECT 1 FROM workspaces
    WHERE workspaces.workspace_id = recurrence_rules.workspace_id
      AND workspaces.workspace_owner_user_id = auth.uid()
  )
  OR EXISTS (
    -- User is member of the workspace
    SELECT 1 FROM workspace_users
    WHERE workspace_users.workspace_user_workspace_id = recurrence_rules.workspace_id
      AND workspace_users.workspace_user_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    -- User is owner of the workspace (after update)
    SELECT 1 FROM workspaces
    WHERE workspaces.workspace_id = recurrence_rules.workspace_id
      AND workspaces.workspace_owner_user_id = auth.uid()
  )
  OR EXISTS (
    -- User is member of the workspace (after update)
    SELECT 1 FROM workspace_users
    WHERE workspace_users.workspace_user_workspace_id = recurrence_rules.workspace_id
      AND workspace_users.workspace_user_user_id = auth.uid()
  )
);

-- ============================================================================
-- DELETE POLICY: Delete rules in accessible workspaces
-- ============================================================================
CREATE POLICY "Users can delete recurrence rules in their workspaces"
ON recurrence_rules
FOR DELETE
TO authenticated
USING (
  EXISTS (
    -- User is owner of the workspace
    SELECT 1 FROM workspaces
    WHERE workspaces.workspace_id = recurrence_rules.workspace_id
      AND workspaces.workspace_owner_user_id = auth.uid()
  )
  OR EXISTS (
    -- User is member of the workspace
    SELECT 1 FROM workspace_users
    WHERE workspace_users.workspace_user_workspace_id = recurrence_rules.workspace_id
      AND workspace_users.workspace_user_user_id = auth.uid()
  )
);

-- ============================================================================
-- Verification: Ensure RLS is enabled
-- ============================================================================
ALTER TABLE recurrence_rules ENABLE ROW LEVEL SECURITY;

-- Add comment for documentation
COMMENT ON TABLE recurrence_rules IS 'Recurrence rules for automatic transaction generation. RLS policies ensure users can only access rules from workspaces they own or are members of.';
