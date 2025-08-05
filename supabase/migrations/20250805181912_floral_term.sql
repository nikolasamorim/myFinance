/*
  # Solução definitiva para recursão RLS

  1. Desabilita RLS temporariamente
  2. Remove todas as políticas problemáticas
  3. Cria políticas simples e diretas
  4. Reabilita RLS com estrutura limpa
*/

-- Desabilitar RLS temporariamente para limpeza
ALTER TABLE public.workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_users DISABLE ROW LEVEL SECURITY;

-- Remover todas as políticas existentes
DROP POLICY IF EXISTS "workspace_owner_all" ON public.workspaces;
DROP POLICY IF EXISTS "workspace_member_read" ON public.workspaces;
DROP POLICY IF EXISTS "workspace_users_owner_all" ON public.workspace_users;
DROP POLICY IF EXISTS "workspace_users_self_read" ON public.workspace_users;
DROP POLICY IF EXISTS "Users can access workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can manage workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can access workspace users" ON public.workspace_users;
DROP POLICY IF EXISTS "Users can manage workspace users" ON public.workspace_users;

-- Reabilitar RLS
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_users ENABLE ROW LEVEL SECURITY;

-- Criar políticas simples para workspaces
CREATE POLICY "workspaces_select_owner" ON public.workspaces
  FOR SELECT TO authenticated
  USING (workspace_owner_user_id = auth.uid());

CREATE POLICY "workspaces_insert_owner" ON public.workspaces
  FOR INSERT TO authenticated
  WITH CHECK (workspace_owner_user_id = auth.uid());

CREATE POLICY "workspaces_update_owner" ON public.workspaces
  FOR UPDATE TO authenticated
  USING (workspace_owner_user_id = auth.uid())
  WITH CHECK (workspace_owner_user_id = auth.uid());

CREATE POLICY "workspaces_delete_owner" ON public.workspaces
  FOR DELETE TO authenticated
  USING (workspace_owner_user_id = auth.uid());

-- Criar políticas simples para workspace_users
CREATE POLICY "workspace_users_select_owner" ON public.workspace_users
  FOR SELECT TO authenticated
  USING (
    workspace_user_workspace_id IN (
      SELECT workspace_id FROM public.workspaces 
      WHERE workspace_owner_user_id = auth.uid()
    )
    OR workspace_user_user_id = auth.uid()
  );

CREATE POLICY "workspace_users_insert_owner" ON public.workspace_users
  FOR INSERT TO authenticated
  WITH CHECK (
    workspace_user_workspace_id IN (
      SELECT workspace_id FROM public.workspaces 
      WHERE workspace_owner_user_id = auth.uid()
    )
  );

CREATE POLICY "workspace_users_update_owner" ON public.workspace_users
  FOR UPDATE TO authenticated
  USING (
    workspace_user_workspace_id IN (
      SELECT workspace_id FROM public.workspaces 
      WHERE workspace_owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_user_workspace_id IN (
      SELECT workspace_id FROM public.workspaces 
      WHERE workspace_owner_user_id = auth.uid()
    )
  );

CREATE POLICY "workspace_users_delete_owner" ON public.workspace_users
  FOR DELETE TO authenticated
  USING (
    workspace_user_workspace_id IN (
      SELECT workspace_id FROM public.workspaces 
      WHERE workspace_owner_user_id = auth.uid()
    )
  );