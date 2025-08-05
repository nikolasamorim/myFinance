-- Drop existing policies to avoid conflicts and ensure a clean slate
DROP POLICY IF EXISTS enable_all_for_workspace_owner ON public.workspaces;
DROP POLICY IF EXISTS enable_select_for_workspace_members ON public.workspaces;
DROP POLICY IF EXISTS enable_all_for_workspace_owner_on_members ON public.workspace_users;
DROP POLICY IF EXISTS enable_select_for_self_workspace_user ON public.workspace_users;

-- Recreate RLS policies for public.workspaces
-- Policy for ALL operations (INSERT, SELECT, UPDATE, DELETE) for the workspace owner
CREATE POLICY enable_all_for_workspace_owner
ON public.workspaces
FOR ALL
TO authenticated
USING (workspace_owner_user_id = auth.uid())
WITH CHECK (workspace_owner_user_id = auth.uid());

-- Policy for SELECT operations for members of a workspace
CREATE POLICY enable_select_for_workspace_members
ON public.workspaces
FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM public.workspace_users WHERE workspace_user_workspace_id = workspaces.workspace_id AND workspace_user_user_id = auth.uid()));

-- Recreate RLS policies for public.workspace_users
-- Policy for ALL operations (INSERT, SELECT, UPDATE, DELETE) for the workspace owner on its members
CREATE POLICY enable_all_for_workspace_owner_on_members
ON public.workspace_users
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.workspaces WHERE workspace_id = workspace_user_workspace_id AND workspace_owner_user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.workspaces WHERE workspace_id = workspace_user_workspace_id AND workspace_owner_user_id = auth.uid()));

-- Policy for SELECT operations for a user to see their own workspace_user entry
CREATE POLICY enable_select_for_self_workspace_user
ON public.workspace_users
FOR SELECT
TO authenticated
USING (workspace_user_user_id = auth.uid());