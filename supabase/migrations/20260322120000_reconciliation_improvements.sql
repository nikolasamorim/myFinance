-- Melhorias na rotina de conciliação bancária
-- Implementa Fase 4A (melhorias imediatas) + Fase 4B (preparação Open Finance)
-- Auditoria: mellow-hatching-elephant

-- ─── 1. ENUM: import_source ───────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE public.import_source_type AS ENUM ('manual', 'ofx', 'open_finance');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 2. ENUM: reconciliation_match_type ───────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE public.reconciliation_match_type AS ENUM ('auto', 'manual', 'rule');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 3. Novas colunas em transactions ─────────────────────────────────────────

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS import_source   public.import_source_type NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS external_id     TEXT,
  ADD COLUMN IF NOT EXISTS raw_data        JSONB,
  ADD COLUMN IF NOT EXISTS ignore_reason   TEXT;

-- Migra registros importados existentes para import_source = 'ofx'
UPDATE public.transactions
  SET import_source = 'ofx'
  WHERE transaction_origin = 'import'
    AND import_source = 'manual';

-- Índice parcial de deduplicação: mesmo workspace+source+external_id é único
-- Garante idempotência na re-importação do mesmo arquivo OFX
CREATE UNIQUE INDEX IF NOT EXISTS uq_transactions_external_id
  ON public.transactions (transaction_workspace_id, import_source, external_id)
  WHERE external_id IS NOT NULL;

-- ─── 4. Melhorias em bank_reconciliations ─────────────────────────────────────

ALTER TABLE public.bank_reconciliations
  ADD COLUMN IF NOT EXISTS match_score        NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS amount_difference  NUMERIC(18,4),
  ADD COLUMN IF NOT EXISTS match_type         public.reconciliation_match_type NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at         TIMESTAMPTZ NOT NULL DEFAULT now();

-- Remove constraint que impede N:1 (múltiplas importadas → 1 lançamento do sistema)
-- Cenário real: N parcelas de cartão no extrato → 1 lançamento agrupado no sistema
ALTER TABLE public.bank_reconciliations
  DROP CONSTRAINT IF EXISTS uq_bank_rec_system;

-- ─── 5. Tabela import_batches ─────────────────────────────────────────────────
-- Rastreabilidade de cada importação: permite auditoria e rollback futuro

CREATE TABLE IF NOT EXISTS public.import_batches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
  account_id    UUID REFERENCES accounts(id) ON DELETE SET NULL,
  source        public.import_source_type NOT NULL DEFAULT 'ofx',
  created_by    UUID NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  item_count    INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'completed'
                  CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  file_name     TEXT
);

CREATE INDEX IF NOT EXISTS idx_import_batches_workspace
  ON public.import_batches (workspace_id);

ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "import_batches_workspace_members"
  ON public.import_batches FOR ALL
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

-- ─── 6. RPC: get_reconciliation_summary ───────────────────────────────────────
-- Substitui a abordagem N+1 do GET /summary por uma única query com LEFT JOIN

CREATE OR REPLACE FUNCTION public.get_reconciliation_summary(p_workspace_id UUID)
RETURNS TABLE (account_id UUID, pending_count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    t.transaction_bank_id AS account_id,
    COUNT(*) AS pending_count
  FROM transactions t
  LEFT JOIN bank_reconciliations br
    ON br.imported_transaction_id = t.transaction_id
  WHERE t.transaction_workspace_id = p_workspace_id
    AND t.transaction_origin = 'import'
    AND t.reconciliation_ignored = false
    AND br.id IS NULL
    AND t.transaction_bank_id IS NOT NULL
  GROUP BY t.transaction_bank_id;
$$;
