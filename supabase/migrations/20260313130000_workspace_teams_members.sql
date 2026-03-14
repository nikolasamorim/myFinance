/*
  # Workspace Teams & Member Roles

  1. Changes to existing tables
    - Add `role` column to `workspace_users` (owner | admin | member)
    - Add `joined_at` column to `workspace_users`

  2. New tables
    - `teams` — equipes dentro de um workspace
    - `team_members` — membros de cada equipe com papel (admin | member)

  3. RLS
    - teams: membros do workspace leem; dono do workspace escreve
    - team_members: auto-select; dono do workspace gerencia
*/

-- ─── workspace_users: add role & joined_at ───────────────────────────────────

ALTER TABLE public.workspace_users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member'
    CONSTRAINT workspace_users_role_check CHECK (role IN ('owner', 'admin', 'member')),
  ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ─── teams ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.teams (
  team_id      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID         NOT NULL REFERENCES public.workspaces(workspace_id) ON DELETE CASCADE,
  name         TEXT         NOT NULL,
  created_by   UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Workspace members can read teams
CREATE POLICY "teams_select_workspace_member"
  ON public.teams FOR SELECT TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspaces
      WHERE workspace_owner_user_id = auth.uid()
      UNION
      SELECT workspace_user_workspace_id FROM public.workspace_users
      WHERE workspace_user_user_id = auth.uid()
    )
  );

-- Only workspace owner can insert / update / delete teams
CREATE POLICY "teams_write_workspace_owner"
  ON public.teams FOR ALL TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspaces
      WHERE workspace_owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspaces
      WHERE workspace_owner_user_id = auth.uid()
    )
  );

-- ─── team_members ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.team_members (
  team_id   UUID         NOT NULL REFERENCES public.teams(team_id) ON DELETE CASCADE,
  user_id   UUID         NOT NULL REFERENCES auth.users(id)        ON DELETE CASCADE,
  role      TEXT         NOT NULL DEFAULT 'member'
              CONSTRAINT team_members_role_check CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Users can read their own team memberships
CREATE POLICY "team_members_self_select"
  ON public.team_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Workspace owner can manage all team memberships within their workspace
CREATE POLICY "team_members_owner_all"
  ON public.team_members FOR ALL TO authenticated
  USING (
    team_id IN (
      SELECT t.team_id FROM public.teams t
      JOIN public.workspaces w ON w.workspace_id = t.workspace_id
      WHERE w.workspace_owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    team_id IN (
      SELECT t.team_id FROM public.teams t
      JOIN public.workspaces w ON w.workspace_id = t.workspace_id
      WHERE w.workspace_owner_user_id = auth.uid()
    )
  );
