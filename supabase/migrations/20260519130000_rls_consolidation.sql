/*
  # RLS: consolidação de políticas permissivas + correção de auth_rls_initplan

  Contexto (Item 2 do plano de escala). Dois lints de performance do advisor:
  - multiple_permissive_policies: várias políticas PERMISSIVE para a mesma
    ação/role são avaliadas em OR, uma a uma, por linha. Consolidamos em UMA
    política por ação cujo predicado é o OR exato das anteriores → mesmo
    comportamento, menos trabalho por linha.
  - auth_rls_initplan: chamadas a auth.uid()/auth.jwt() sem subquery são
    reavaliadas por linha. Envolvemos em (select auth.uid()) para o planner
    avaliar uma única vez (initplan).

  Princípio: behavior-preserving por construção. O acesso efetivo de cada tabela
  é o OR de todas as policies atuais; a policy consolidada reproduz esse OR.
  Onde SELECT e escrita tinham regras diferentes (workspaces, teams,
  team_members), mantemos uma policy POR COMANDO para não alterar a semântica.

  Fora de escopo: `catalogs` (módulo legado vazio, usa claim JWT que o app não
  emite) fica como está.

  Padrão "membro OU owner" reutilizado:
    membro:  <wscol> IN (SELECT workspace_user_workspace_id FROM workspace_users
                         WHERE workspace_user_user_id = (select auth.uid()))
    owner:   (select auth.uid()) IN (SELECT workspace_owner_user_id FROM workspaces
                         WHERE workspace_id = <tbl>.<wscol>)
*/

-- ─── Tabelas de domínio (triplet member+manage+owner → 1 policy ALL) ───────────

-- transactions
DROP POLICY IF EXISTS "Users can access transactions in their workspaces" ON public.transactions;
DROP POLICY IF EXISTS "Users can manage transactions in their workspaces" ON public.transactions;
DROP POLICY IF EXISTS "transactions_workspace_access" ON public.transactions;
CREATE POLICY "transactions_ws_rw" ON public.transactions
  AS PERMISSIVE FOR ALL TO authenticated
  USING (
    transaction_workspace_id IN (SELECT workspace_user_workspace_id FROM workspace_users WHERE workspace_user_user_id = (select auth.uid()))
    OR (select auth.uid()) IN (SELECT workspace_owner_user_id FROM workspaces WHERE workspace_id = transactions.transaction_workspace_id)
  )
  WITH CHECK (
    transaction_workspace_id IN (SELECT workspace_user_workspace_id FROM workspace_users WHERE workspace_user_user_id = (select auth.uid()))
    OR (select auth.uid()) IN (SELECT workspace_owner_user_id FROM workspaces WHERE workspace_id = transactions.transaction_workspace_id)
  );

-- banks
DROP POLICY IF EXISTS "Users can access banks in their workspaces" ON public.banks;
DROP POLICY IF EXISTS "Users can manage banks in their workspaces" ON public.banks;
DROP POLICY IF EXISTS "banks_workspace_access" ON public.banks;
CREATE POLICY "banks_ws_rw" ON public.banks
  AS PERMISSIVE FOR ALL TO authenticated
  USING (
    bank_workspace_id IN (SELECT workspace_user_workspace_id FROM workspace_users WHERE workspace_user_user_id = (select auth.uid()))
    OR (select auth.uid()) IN (SELECT workspace_owner_user_id FROM workspaces WHERE workspace_id = banks.bank_workspace_id)
  )
  WITH CHECK (
    bank_workspace_id IN (SELECT workspace_user_workspace_id FROM workspace_users WHERE workspace_user_user_id = (select auth.uid()))
    OR (select auth.uid()) IN (SELECT workspace_owner_user_id FROM workspaces WHERE workspace_id = banks.bank_workspace_id)
  );

-- categories
DROP POLICY IF EXISTS "Users can access categories in their workspaces" ON public.categories;
DROP POLICY IF EXISTS "Users can manage categories in their workspaces" ON public.categories;
DROP POLICY IF EXISTS "categories_workspace_access" ON public.categories;
CREATE POLICY "categories_ws_rw" ON public.categories
  AS PERMISSIVE FOR ALL TO authenticated
  USING (
    category_workspace_id IN (SELECT workspace_user_workspace_id FROM workspace_users WHERE workspace_user_user_id = (select auth.uid()))
    OR (select auth.uid()) IN (SELECT workspace_owner_user_id FROM workspaces WHERE workspace_id = categories.category_workspace_id)
  )
  WITH CHECK (
    category_workspace_id IN (SELECT workspace_user_workspace_id FROM workspace_users WHERE workspace_user_user_id = (select auth.uid()))
    OR (select auth.uid()) IN (SELECT workspace_owner_user_id FROM workspaces WHERE workspace_id = categories.category_workspace_id)
  );

-- cost_centers
DROP POLICY IF EXISTS "Users can access cost centers in their workspaces" ON public.cost_centers;
DROP POLICY IF EXISTS "Users can manage cost centers in their workspaces" ON public.cost_centers;
DROP POLICY IF EXISTS "cost_centers_workspace_access" ON public.cost_centers;
CREATE POLICY "cost_centers_ws_rw" ON public.cost_centers
  AS PERMISSIVE FOR ALL TO authenticated
  USING (
    cost_center_workspace_id IN (SELECT workspace_user_workspace_id FROM workspace_users WHERE workspace_user_user_id = (select auth.uid()))
    OR (select auth.uid()) IN (SELECT workspace_owner_user_id FROM workspaces WHERE workspace_id = cost_centers.cost_center_workspace_id)
  )
  WITH CHECK (
    cost_center_workspace_id IN (SELECT workspace_user_workspace_id FROM workspace_users WHERE workspace_user_user_id = (select auth.uid()))
    OR (select auth.uid()) IN (SELECT workspace_owner_user_id FROM workspaces WHERE workspace_id = cost_centers.cost_center_workspace_id)
  );

-- credit_cards
DROP POLICY IF EXISTS "Users can access credit cards in their workspaces" ON public.credit_cards;
DROP POLICY IF EXISTS "Users can manage credit cards in their workspaces" ON public.credit_cards;
DROP POLICY IF EXISTS "credit_cards_workspace_access" ON public.credit_cards;
CREATE POLICY "credit_cards_ws_rw" ON public.credit_cards
  AS PERMISSIVE FOR ALL TO authenticated
  USING (
    credit_card_workspace_id IN (SELECT workspace_user_workspace_id FROM workspace_users WHERE workspace_user_user_id = (select auth.uid()))
    OR (select auth.uid()) IN (SELECT workspace_owner_user_id FROM workspaces WHERE workspace_id = credit_cards.credit_card_workspace_id)
  )
  WITH CHECK (
    credit_card_workspace_id IN (SELECT workspace_user_workspace_id FROM workspace_users WHERE workspace_user_user_id = (select auth.uid()))
    OR (select auth.uid()) IN (SELECT workspace_owner_user_id FROM workspaces WHERE workspace_id = credit_cards.credit_card_workspace_id)
  );

-- brokers (legado/vazio, mesmo padrão)
DROP POLICY IF EXISTS "Users can access brokers in their workspaces" ON public.brokers;
DROP POLICY IF EXISTS "Users can manage brokers in their workspaces" ON public.brokers;
DROP POLICY IF EXISTS "brokers_workspace_access" ON public.brokers;
CREATE POLICY "brokers_ws_rw" ON public.brokers
  AS PERMISSIVE FOR ALL TO authenticated
  USING (
    broker_workspace_id IN (SELECT workspace_user_workspace_id FROM workspace_users WHERE workspace_user_user_id = (select auth.uid()))
    OR (select auth.uid()) IN (SELECT workspace_owner_user_id FROM workspaces WHERE workspace_id = brokers.broker_workspace_id)
  )
  WITH CHECK (
    broker_workspace_id IN (SELECT workspace_user_workspace_id FROM workspace_users WHERE workspace_user_user_id = (select auth.uid()))
    OR (select auth.uid()) IN (SELECT workspace_owner_user_id FROM workspaces WHERE workspace_id = brokers.broker_workspace_id)
  );

-- people (legado/vazio, mesmo padrão)
DROP POLICY IF EXISTS "Users can access people in their workspaces" ON public.people;
DROP POLICY IF EXISTS "Users can manage people in their workspaces" ON public.people;
DROP POLICY IF EXISTS "people_workspace_access" ON public.people;
CREATE POLICY "people_ws_rw" ON public.people
  AS PERMISSIVE FOR ALL TO authenticated
  USING (
    person_workspace_id IN (SELECT workspace_user_workspace_id FROM workspace_users WHERE workspace_user_user_id = (select auth.uid()))
    OR (select auth.uid()) IN (SELECT workspace_owner_user_id FROM workspaces WHERE workspace_id = people.person_workspace_id)
  )
  WITH CHECK (
    person_workspace_id IN (SELECT workspace_user_workspace_id FROM workspace_users WHERE workspace_user_user_id = (select auth.uid()))
    OR (select auth.uid()) IN (SELECT workspace_owner_user_id FROM workspaces WHERE workspace_id = people.person_workspace_id)
  );

-- ─── Faturas (membro ALL + view owner/membro SELECT → 1 policy ALL membro|owner) ─
-- Nota: escrita passa a permitir owner além de membro (privilégio coerente; não
-- remove acesso de ninguém — owners atuais já são membros).

-- card_statements
DROP POLICY IF EXISTS "workspace_cs" ON public.card_statements;
DROP POLICY IF EXISTS "Users can view card_statements in their workspaces" ON public.card_statements;
CREATE POLICY "card_statements_ws_rw" ON public.card_statements
  AS PERMISSIVE FOR ALL TO authenticated
  USING (
    workspace_id IN (SELECT workspace_user_workspace_id FROM workspace_users WHERE workspace_user_user_id = (select auth.uid()))
    OR (select auth.uid()) IN (SELECT workspace_owner_user_id FROM workspaces WHERE workspace_id = card_statements.workspace_id)
  )
  WITH CHECK (
    workspace_id IN (SELECT workspace_user_workspace_id FROM workspace_users WHERE workspace_user_user_id = (select auth.uid()))
    OR (select auth.uid()) IN (SELECT workspace_owner_user_id FROM workspaces WHERE workspace_id = card_statements.workspace_id)
  );

-- statement_items
DROP POLICY IF EXISTS "workspace_si" ON public.statement_items;
DROP POLICY IF EXISTS "Users can view statement_items in their workspaces" ON public.statement_items;
CREATE POLICY "statement_items_ws_rw" ON public.statement_items
  AS PERMISSIVE FOR ALL TO authenticated
  USING (
    workspace_id IN (SELECT workspace_user_workspace_id FROM workspace_users WHERE workspace_user_user_id = (select auth.uid()))
    OR (select auth.uid()) IN (SELECT workspace_owner_user_id FROM workspaces WHERE workspace_id = statement_items.workspace_id)
  )
  WITH CHECK (
    workspace_id IN (SELECT workspace_user_workspace_id FROM workspace_users WHERE workspace_user_user_id = (select auth.uid()))
    OR (select auth.uid()) IN (SELECT workspace_owner_user_id FROM workspaces WHERE workspace_id = statement_items.workspace_id)
  );

-- statement_payments
DROP POLICY IF EXISTS "workspace_sp" ON public.statement_payments;
DROP POLICY IF EXISTS "Users can view statement_payments in their workspaces" ON public.statement_payments;
CREATE POLICY "statement_payments_ws_rw" ON public.statement_payments
  AS PERMISSIVE FOR ALL TO authenticated
  USING (
    workspace_id IN (SELECT workspace_user_workspace_id FROM workspace_users WHERE workspace_user_user_id = (select auth.uid()))
    OR (select auth.uid()) IN (SELECT workspace_owner_user_id FROM workspaces WHERE workspace_id = statement_payments.workspace_id)
  )
  WITH CHECK (
    workspace_id IN (SELECT workspace_user_workspace_id FROM workspace_users WHERE workspace_user_user_id = (select auth.uid()))
    OR (select auth.uid()) IN (SELECT workspace_owner_user_id FROM workspaces WHERE workspace_id = statement_payments.workspace_id)
  );

-- ─── visualizations (membro OU dono do registro) → 1 policy ALL ────────────────
DROP POLICY IF EXISTS "Users can access visualizations in their workspaces" ON public.visualizations;
DROP POLICY IF EXISTS "Users can manage their own visualizations" ON public.visualizations;
CREATE POLICY "visualizations_rw" ON public.visualizations
  AS PERMISSIVE FOR ALL TO authenticated
  USING (
    visualization_workspace_id IN (SELECT workspace_user_workspace_id FROM workspace_users WHERE workspace_user_user_id = (select auth.uid()))
    OR visualization_user_id = (select auth.uid())
  )
  WITH CHECK (
    visualization_workspace_id IN (SELECT workspace_user_workspace_id FROM workspace_users WHERE workspace_user_user_id = (select auth.uid()))
    OR visualization_user_id = (select auth.uid())
  );

-- ─── workspace_users (próprio registro OU owner do workspace) → 1 policy ALL ────
DROP POLICY IF EXISTS "workspace_users_own_records" ON public.workspace_users;
DROP POLICY IF EXISTS "workspace_users_owner_manage" ON public.workspace_users;
CREATE POLICY "workspace_users_rw" ON public.workspace_users
  AS PERMISSIVE FOR ALL TO authenticated
  USING (
    (select auth.uid()) = workspace_user_user_id
    OR public.is_workspace_owner(workspace_user_workspace_id)
  )
  WITH CHECK (
    (select auth.uid()) = workspace_user_user_id
    OR public.is_workspace_owner(workspace_user_workspace_id)
  );

-- ─── workspaces (SELECT: owner OU membro; escrita: só owner) → split por comando ─
DROP POLICY IF EXISTS "workspaces_owner_access" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_member_read" ON public.workspaces;
CREATE POLICY "workspaces_select" ON public.workspaces
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    (select auth.uid()) = workspace_owner_user_id
    OR EXISTS (SELECT 1 FROM workspace_users wu WHERE wu.workspace_user_workspace_id = workspaces.workspace_id AND wu.workspace_user_user_id = (select auth.uid()))
  );
CREATE POLICY "workspaces_insert" ON public.workspaces
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = workspace_owner_user_id);
CREATE POLICY "workspaces_update" ON public.workspaces
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((select auth.uid()) = workspace_owner_user_id)
  WITH CHECK ((select auth.uid()) = workspace_owner_user_id);
CREATE POLICY "workspaces_delete" ON public.workspaces
  AS PERMISSIVE FOR DELETE TO authenticated
  USING ((select auth.uid()) = workspace_owner_user_id);

-- ─── teams (SELECT: owner OU membro; escrita: só owner) → split por comando ─────
DROP POLICY IF EXISTS "teams_write_workspace_owner" ON public.teams;
DROP POLICY IF EXISTS "teams_select_workspace_member" ON public.teams;
CREATE POLICY "teams_select" ON public.teams
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    workspace_id IN (SELECT workspace_id FROM workspaces WHERE workspace_owner_user_id = (select auth.uid()))
    OR workspace_id IN (SELECT workspace_user_workspace_id FROM workspace_users WHERE workspace_user_user_id = (select auth.uid()))
  );
CREATE POLICY "teams_insert" ON public.teams
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM workspaces WHERE workspace_owner_user_id = (select auth.uid())));
CREATE POLICY "teams_update" ON public.teams
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspaces WHERE workspace_owner_user_id = (select auth.uid())))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM workspaces WHERE workspace_owner_user_id = (select auth.uid())));
CREATE POLICY "teams_delete" ON public.teams
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspaces WHERE workspace_owner_user_id = (select auth.uid())));

-- ─── team_members (SELECT: owner do workspace OU próprio; escrita: só owner) ─────
DROP POLICY IF EXISTS "team_members_owner_all" ON public.team_members;
DROP POLICY IF EXISTS "team_members_self_select" ON public.team_members;
CREATE POLICY "team_members_select" ON public.team_members
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    team_id IN (SELECT t.team_id FROM teams t JOIN workspaces w ON w.workspace_id = t.workspace_id WHERE w.workspace_owner_user_id = (select auth.uid()))
    OR user_id = (select auth.uid())
  );
CREATE POLICY "team_members_insert" ON public.team_members
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (team_id IN (SELECT t.team_id FROM teams t JOIN workspaces w ON w.workspace_id = t.workspace_id WHERE w.workspace_owner_user_id = (select auth.uid())));
CREATE POLICY "team_members_update" ON public.team_members
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (team_id IN (SELECT t.team_id FROM teams t JOIN workspaces w ON w.workspace_id = t.workspace_id WHERE w.workspace_owner_user_id = (select auth.uid())))
  WITH CHECK (team_id IN (SELECT t.team_id FROM teams t JOIN workspaces w ON w.workspace_id = t.workspace_id WHERE w.workspace_owner_user_id = (select auth.uid())));
CREATE POLICY "team_members_delete" ON public.team_members
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (team_id IN (SELECT t.team_id FROM teams t JOIN workspaces w ON w.workspace_id = t.workspace_id WHERE w.workspace_owner_user_id = (select auth.uid())));

-- ─── Single-policy: apenas corrigir auth_rls_initplan (wrap em select) ──────────

-- bank_reconciliations
DROP POLICY IF EXISTS "bank_rec_workspace_members" ON public.bank_reconciliations;
CREATE POLICY "bank_rec_workspace_members" ON public.bank_reconciliations
  AS PERMISSIVE FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_user_workspace_id FROM workspace_users WHERE workspace_user_user_id = (select auth.uid())))
  WITH CHECK (workspace_id IN (SELECT workspace_user_workspace_id FROM workspace_users WHERE workspace_user_user_id = (select auth.uid())));

-- import_batches
DROP POLICY IF EXISTS "import_batches_workspace_members" ON public.import_batches;
CREATE POLICY "import_batches_workspace_members" ON public.import_batches
  AS PERMISSIVE FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_user_workspace_id FROM workspace_users WHERE workspace_user_user_id = (select auth.uid())))
  WITH CHECK (workspace_id IN (SELECT workspace_user_workspace_id FROM workspace_users WHERE workspace_user_user_id = (select auth.uid())));

-- pluggy_connections
DROP POLICY IF EXISTS "pluggy_connections_workspace_members" ON public.pluggy_connections;
CREATE POLICY "pluggy_connections_workspace_members" ON public.pluggy_connections
  AS PERMISSIVE FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_user_workspace_id FROM workspace_users WHERE workspace_user_user_id = (select auth.uid())))
  WITH CHECK (workspace_id IN (SELECT workspace_user_workspace_id FROM workspace_users WHERE workspace_user_user_id = (select auth.uid())));
