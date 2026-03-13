-- ============================================================================
-- NOTIFICATIONS SYSTEM
-- ============================================================================

-- ─── Tables ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id  UUID NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
  type          TEXT NOT NULL,
  title         TEXT NOT NULL,
  message       TEXT NOT NULL,
  entity_type   TEXT,
  entity_id     UUID,
  data          JSONB DEFAULT '{}'::jsonb,
  is_read       BOOLEAN NOT NULL DEFAULT false,
  is_dismissed  BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  scheduled_for TIMESTAMPTZ,
  CONSTRAINT notifications_type_check CHECK (type IN (
    'invoice_closing', 'invoice_due',
    'transaction_status_changed', 'recurrence_processed',
    'recurrence_paused', 'recurrence_canceled',
    'account_low_balance', 'budget_exceeded',
    'custom'
  )),
  CONSTRAINT notifications_entity_type_check CHECK (
    entity_type IS NULL OR entity_type IN (
      'transaction', 'account', 'category', 'credit_card', 'recurrence_rule'
    )
  )
);

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id      UUID NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  enabled           BOOLEAN NOT NULL DEFAULT true,
  advance_days      INTEGER DEFAULT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT notification_preferences_type_check CHECK (notification_type IN (
    'invoice_closing', 'invoice_due',
    'transaction_status_changed', 'recurrence_processed',
    'recurrence_paused', 'recurrence_canceled',
    'account_low_balance', 'budget_exceeded',
    'custom'
  )),
  CONSTRAINT notification_preferences_unique UNIQUE (user_id, workspace_id, notification_type)
);

CREATE TABLE IF NOT EXISTS public.notification_subscriptions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id       UUID NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
  entity_type        TEXT NOT NULL,
  entity_id          UUID NOT NULL,
  notification_types TEXT[] NOT NULL DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT notification_subscriptions_entity_type_check CHECK (entity_type IN (
    'transaction', 'account', 'category', 'credit_card', 'recurrence_rule'
  )),
  CONSTRAINT notification_subscriptions_unique UNIQUE (user_id, workspace_id, entity_type, entity_id)
);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  USING ((SELECT auth.uid()) = user_id AND is_dismissed = false);

CREATE POLICY "notifications_insert_own"
  ON public.notifications FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "notifications_delete_own"
  ON public.notifications FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "notif_prefs_select_own"
  ON public.notification_preferences FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "notif_prefs_insert_own"
  ON public.notification_preferences FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "notif_prefs_update_own"
  ON public.notification_preferences FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "notif_prefs_delete_own"
  ON public.notification_preferences FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "notif_subs_select_own"
  ON public.notification_subscriptions FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "notif_subs_insert_own"
  ON public.notification_subscriptions FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "notif_subs_update_own"
  ON public.notification_subscriptions FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "notif_subs_delete_own"
  ON public.notification_subscriptions FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

-- Primary lookup: user's notifications per workspace (hot path for dropdown)
CREATE INDEX IF NOT EXISTS idx_notifications_user_workspace
  ON public.notifications (user_id, workspace_id, created_at DESC)
  WHERE is_dismissed = false;

-- Unread count badge
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON public.notifications (user_id, workspace_id, is_read)
  WHERE is_dismissed = false AND is_read = false;

-- Scheduled notification processing (Phase 3)
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled
  ON public.notifications (scheduled_for)
  WHERE scheduled_for IS NOT NULL AND is_dismissed = false;

-- Entity-based lookup
CREATE INDEX IF NOT EXISTS idx_notifications_entity
  ON public.notifications (entity_type, entity_id)
  WHERE entity_id IS NOT NULL;

-- Preference lookup
CREATE INDEX IF NOT EXISTS idx_notif_prefs_user_workspace
  ON public.notification_preferences (user_id, workspace_id);

-- Subscription lookup by entity
CREATE INDEX IF NOT EXISTS idx_notif_subs_entity
  ON public.notification_subscriptions (user_id, workspace_id, entity_type, entity_id);

-- ─── Helper RPC Functions ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION is_notification_enabled(
  p_user_id      UUID,
  p_workspace_id UUID,
  p_type         TEXT
)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT enabled FROM notification_preferences
     WHERE user_id = p_user_id
       AND workspace_id = p_workspace_id
       AND notification_type = p_type),
    true
  );
$$;

CREATE OR REPLACE FUNCTION get_notification_advance_days(
  p_user_id      UUID,
  p_workspace_id UUID,
  p_type         TEXT
)
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT advance_days FROM notification_preferences
     WHERE user_id = p_user_id
       AND workspace_id = p_workspace_id
       AND notification_type = p_type),
    3
  );
$$;

-- updated_at trigger for preferences
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_notif_prefs_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_notification_preferences_updated_at();
