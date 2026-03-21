-- Cria a rotina de conciliação bancária
-- Vincula transações importadas (OFX/automação) a lançamentos gerados no sistema

-- ─── Tabela principal de conciliações ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.bank_reconciliations (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id              UUID NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
  imported_transaction_id   UUID NOT NULL REFERENCES transactions(transaction_id) ON DELETE CASCADE,
  system_transaction_id     UUID NOT NULL REFERENCES transactions(transaction_id) ON DELETE CASCADE,
  reconciled_by_user_id     UUID NOT NULL,
  reconciled_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes                     TEXT,
  -- Cada transação importada só pode ter um vínculo
  CONSTRAINT uq_bank_rec_imported UNIQUE (imported_transaction_id),
  -- Cada lançamento do sistema só pode ser vinculado uma vez
  CONSTRAINT uq_bank_rec_system   UNIQUE (system_transaction_id),
  -- Impede auto-vínculo
  CONSTRAINT chk_bank_rec_no_self CHECK (imported_transaction_id <> system_transaction_id)
);

CREATE INDEX IF NOT EXISTS idx_bank_rec_workspace ON public.bank_reconciliations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_bank_rec_imported  ON public.bank_reconciliations(imported_transaction_id);
CREATE INDEX IF NOT EXISTS idx_bank_rec_system    ON public.bank_reconciliations(system_transaction_id);

-- ─── Flag de ignorado na tabela transactions ──────────────────────────────────
-- Transações importadas marcadas como ignoradas não aparecem nos pendentes

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS reconciliation_ignored BOOLEAN NOT NULL DEFAULT false;

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.bank_reconciliations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bank_rec_workspace_members"
  ON public.bank_reconciliations FOR ALL
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
