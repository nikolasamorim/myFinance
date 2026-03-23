-- ═══════════════════════════════════════════════════════════════════════════════
-- Pluggy Open Finance Integration
-- Tabelas: pluggy_connections, pluggy_api_key_cache
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. pluggy_connections ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pluggy_connections (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id       uuid NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
  account_id         uuid REFERENCES accounts(id) ON DELETE SET NULL,
  pluggy_item_id     text NOT NULL,
  pluggy_account_id  text,
  institution_name   text NOT NULL,
  status             text NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active','updating','login_error','error','disconnected')),
  consent_expires_at timestamptz,
  last_sync_at       timestamptz,
  initial_sync_done  boolean NOT NULL DEFAULT false,
  error_message      text,
  retry_count        integer NOT NULL DEFAULT 0,
  created_by         uuid REFERENCES auth.users(id),
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now(),
  UNIQUE(workspace_id, pluggy_item_id)
);

CREATE INDEX IF NOT EXISTS idx_pluggy_connections_workspace
  ON public.pluggy_connections (workspace_id);

CREATE INDEX IF NOT EXISTS idx_pluggy_connections_item_id
  ON public.pluggy_connections (pluggy_item_id);

ALTER TABLE public.pluggy_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pluggy_connections_workspace_members"
  ON public.pluggy_connections FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_user_workspace_id FROM workspace_users
      WHERE workspace_user_user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_user_workspace_id FROM workspace_users
      WHERE workspace_user_user_id = auth.uid()
    )
  );

-- ─── 2. pluggy_api_key_cache (singleton) ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pluggy_api_key_cache (
  id         integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  api_key    text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.pluggy_api_key_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pluggy_api_key_cache_deny_all"
  ON public.pluggy_api_key_cache FOR ALL
  USING (false)
  WITH CHECK (false);

-- ─── 3. Triggers updated_at ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_pluggy_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pluggy_connections_updated_at
  BEFORE UPDATE ON public.pluggy_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_pluggy_updated_at();

CREATE TRIGGER trg_pluggy_api_key_cache_updated_at
  BEFORE UPDATE ON public.pluggy_api_key_cache
  FOR EACH ROW EXECUTE FUNCTION public.update_pluggy_updated_at();
