/*
  # Performance: índice composto + cobertura de foreign keys

  Contexto (Item 1 do plano de escala):
  - A query dominante de transações filtra por workspace e ordena por data desc.
    Hoje existem índices de coluna única em (transaction_workspace_id) e
    (transaction_date); um índice composto serve melhor esse padrão em volume.
  - 11 foreign keys de tabelas EM USO não têm índice de cobertura (reportado pelo
    performance advisor), o que degrada joins e ON DELETE CASCADE em escala.

  Fora de escopo de propósito:
  - Tabelas do módulo "catálogo/status" (brokers, catalogs, people, entity_types,
    entity_status_current, entity_status_history, status_transitions) estão VAZIAS
    e sem uso no app — seus FKs não são indexados aqui (scaffolding legado).
  - Índices marcados "unused" pelo advisor NÃO são removidos: é artefato de baixo
    volume (a maior tabela tem ~500 linhas), não evidência de inutilidade.

  Nota de produção: com tabelas volumosas, criar estes índices com
  CREATE INDEX CONCURRENTLY fora de uma transação para evitar lock de escrita.
  No volume atual o CREATE INDEX simples é instantâneo.
*/

-- ─── transactions: índice composto para o padrão workspace + data ──────────────
CREATE INDEX IF NOT EXISTS idx_transactions_workspace_date
  ON public.transactions (transaction_workspace_id, transaction_date DESC);

-- ─── Cobertura de foreign keys (apenas tabelas em uso) ─────────────────────────
CREATE INDEX IF NOT EXISTS idx_notifications_workspace
  ON public.notifications (workspace_id);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_workspace
  ON public.notification_preferences (workspace_id);

CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_workspace
  ON public.notification_subscriptions (workspace_id);

CREATE INDEX IF NOT EXISTS idx_teams_workspace
  ON public.teams (workspace_id);

CREATE INDEX IF NOT EXISTS idx_teams_created_by
  ON public.teams (created_by);

CREATE INDEX IF NOT EXISTS idx_team_members_user
  ON public.team_members (user_id);

CREATE INDEX IF NOT EXISTS idx_pluggy_connections_account
  ON public.pluggy_connections (account_id);

CREATE INDEX IF NOT EXISTS idx_pluggy_connections_created_by
  ON public.pluggy_connections (created_by);

CREATE INDEX IF NOT EXISTS idx_import_batches_account
  ON public.import_batches (account_id);

CREATE INDEX IF NOT EXISTS idx_statement_items_category
  ON public.statement_items (category_id);

CREATE INDEX IF NOT EXISTS idx_statement_items_cost_center
  ON public.statement_items (cost_center_id);
