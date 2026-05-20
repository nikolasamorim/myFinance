/*
  # Integridade do motor de faturas (Fase 2 do plano de correção)

  Corrige os gargalos do bloco de motor de faturas, redefinindo as RPCs/triggers
  da migration 20260307120000 sobre o schema de 20251003101050:

  - G04: editar a data (ou trocar o cartão) de uma transação não pode duplicar o
         item entre faturas — sync remove o item de qualquer fatura que não seja
         a janela correta.
  - G08: min_payment = 0 em fatura zerada/negativa; nunca maior que o total.
  - G07: saldo do cartão deixa de contar a dívida em dobro — a fatura cujo saldo
         foi rolado (carried_forward_at) sai do cálculo; saldo = Σ por fatura de
         GREATEST(0, statement_amount - total_paid).
  - G09: status é recomputado de total_paid×statement_amount após qualquer
         recálculo/pagamento (fatura 'open' permanece 'open'; fechamento é
         explícito via close_statement/cron).
  - G11: carry padronizado em (statement_amount - total_paid); a fatura anterior
         é marcada como rolada para não contar duas vezes.

  Incorporado por reescrever as mesmas funções:
  - G13: ensure_open_statement vira upsert-then-select atômico (ON CONFLICT),
         sem condição de corrida.
  - G10 (lado-DB): register_statement_payment recomputa total_paid via SUM
         (seguro sob concorrência). A validação de entrada na API é Fase 3.

  Inclui reconciliação única dos dados existentes ao final.
*/

-- ============================================================================
-- 0. Schema — marcador de fatura "rolada" (saldo levado para a sucessora)
-- ============================================================================
ALTER TABLE card_statements
  ADD COLUMN IF NOT EXISTS carried_forward_at TIMESTAMPTZ;


-- ============================================================================
-- 1. recalc_card_balance — saldo do cartão sem duplo-cont (G07)
-- ============================================================================
CREATE OR REPLACE FUNCTION recalc_card_balance(p_card_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE credit_cards SET
    current_balance = COALESCE((
      SELECT SUM(GREATEST(0, cs.statement_amount - cs.total_paid))
      FROM card_statements cs
      WHERE cs.credit_card_id = p_card_id
        AND cs.carried_forward_at IS NULL
    ), 0)
  WHERE credit_card_id = p_card_id;
END;
$$;


-- ============================================================================
-- 2. recompute_statement_status — status coerente com pagamentos (G09)
--    'open' é preservado: o fechamento é uma ação explícita.
-- ============================================================================
CREATE OR REPLACE FUNCTION recompute_statement_status(p_statement_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_status TEXT;
  v_amount NUMERIC(15,2);
  v_paid   NUMERIC(15,2);
BEGIN
  SELECT status, statement_amount, total_paid
  INTO v_status, v_amount, v_paid
  FROM card_statements WHERE id = p_statement_id;

  IF NOT FOUND THEN RETURN; END IF;
  IF v_status = 'open' THEN RETURN; END IF;

  UPDATE card_statements SET
    status = CASE
      WHEN v_paid >= v_amount THEN 'paid_full'
      WHEN v_paid > 0          THEN 'paid_partial'
      ELSE 'closed'
    END,
    paid_at = CASE
      WHEN v_paid >= v_amount AND v_amount > 0 THEN COALESCE(paid_at, now())
      ELSE NULL
    END,
    updated_at = now()
  WHERE id = p_statement_id;
END;
$$;


-- ============================================================================
-- 3. recalc_statement_amount — total + min_payment (G08) + status + saldo
-- ============================================================================
CREATE OR REPLACE FUNCTION recalc_statement_amount(p_statement_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_card_id UUID;
  v_paid    NUMERIC(15,2);
  v_amount  NUMERIC(15,2);
  v_floor   NUMERIC(15,2);
  v_pct     NUMERIC(5,2);
  v_min     NUMERIC(15,2);
BEGIN
  SELECT credit_card_id, total_paid INTO v_card_id, v_paid
  FROM card_statements WHERE id = p_statement_id;
  IF NOT FOUND THEN RETURN; END IF;

  v_amount := COALESCE((
    SELECT SUM(amount) FROM statement_items WHERE card_statement_id = p_statement_id
  ), 0);

  SELECT min_payment_floor, min_payment_pct INTO v_floor, v_pct
  FROM credit_cards WHERE credit_card_id = v_card_id;

  -- G08: sem mínimo em fatura zerada/negativa; nunca acima do total.
  v_min := CASE
    WHEN v_amount <= 0 THEN 0
    ELSE LEAST(v_amount, GREATEST(COALESCE(v_floor, 0), v_amount * COALESCE(v_pct, 0) / 100.0))
  END;

  UPDATE card_statements SET
    statement_amount     = v_amount,
    min_payment_amount   = v_min,
    carry_forward_amount = GREATEST(0, v_amount - COALESCE(v_paid, 0)),
    updated_at           = now()
  WHERE id = p_statement_id;

  PERFORM recompute_statement_status(p_statement_id);  -- G09
  PERFORM recalc_card_balance(v_card_id);              -- G07
END;
$$;


-- ============================================================================
-- 4. ensure_open_statement — atômico (G13) + carry consistente (G07/G11)
-- ============================================================================
CREATE OR REPLACE FUNCTION ensure_open_statement(card_id UUID, p_period_start DATE)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_statement_id UUID;
  v_workspace_id UUID;
  v_period_end   DATE;
  v_due_date     DATE;
  v_prev         RECORD;
  v_carry        NUMERIC(15,2);
BEGIN
  SELECT credit_card_workspace_id INTO v_workspace_id
  FROM credit_cards WHERE credit_card_id = card_id;

  SELECT csw.period_end, csw.due_date INTO v_period_end, v_due_date
  FROM compute_statement_window(card_id, p_period_start) csw;

  -- G13: insere e, em concorrência, cai no DO NOTHING + SELECT do existente.
  INSERT INTO card_statements (workspace_id, credit_card_id, period_start, period_end, due_date, status)
  VALUES (v_workspace_id, card_id, p_period_start, v_period_end, v_due_date, 'open')
  ON CONFLICT (credit_card_id, period_start) DO NOTHING
  RETURNING id INTO v_statement_id;

  IF v_statement_id IS NULL THEN
    SELECT id INTO v_statement_id
    FROM card_statements
    WHERE credit_card_id = card_id AND period_start = p_period_start;
    RETURN v_statement_id;  -- já existia: não recria carry
  END IF;

  -- Fatura recém-criada: rola o saldo da fatura anterior ainda não rolada.
  SELECT cs.id, cs.statement_amount, cs.total_paid
  INTO v_prev
  FROM card_statements cs
  WHERE cs.credit_card_id = card_id
    AND cs.period_start < p_period_start
    AND cs.carried_forward_at IS NULL
    AND cs.status IN ('closed', 'paid_partial')
  ORDER BY cs.period_start DESC
  LIMIT 1;

  IF FOUND THEN
    v_carry := GREATEST(0, v_prev.statement_amount - v_prev.total_paid);
    IF v_carry > 0 THEN
      INSERT INTO statement_items (card_statement_id, type, description, amount, occurred_at, workspace_id, credit_card_id)
      VALUES (v_statement_id, 'carry_forward', 'Saldo anterior', v_carry, p_period_start, v_workspace_id, card_id);

      -- G07: marca a anterior como rolada para sair do cálculo de saldo.
      UPDATE card_statements SET carried_forward_at = now(), updated_at = now()
      WHERE id = v_prev.id;

      PERFORM recalc_statement_amount(v_statement_id);
      PERFORM recalc_card_balance(card_id);
    END IF;
  END IF;

  RETURN v_statement_id;
END;
$$;


-- ============================================================================
-- 5. sync_item_from_transaction — sem duplicar entre faturas (G04)
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_item_from_transaction(p_transaction_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_txn          RECORD;
  v_window       RECORD;
  v_statement_id UUID;
  v_item_type    TEXT;
  v_old          RECORD;
BEGIN
  SELECT * INTO v_txn FROM transactions WHERE transaction_id = p_transaction_id;
  IF NOT FOUND OR v_txn.transaction_card_id IS NULL THEN
    RETURN;
  END IF;

  SELECT * INTO v_window
  FROM compute_statement_window(v_txn.transaction_card_id, v_txn.transaction_date::DATE);

  v_statement_id := ensure_open_statement(v_txn.transaction_card_id, v_window.period_start);

  -- G04: remove o item de qualquer outra fatura (mudança de data/cartão).
  FOR v_old IN
    SELECT DISTINCT card_statement_id
    FROM statement_items
    WHERE transaction_id = p_transaction_id
      AND card_statement_id <> v_statement_id
  LOOP
    DELETE FROM statement_items
    WHERE transaction_id = p_transaction_id
      AND card_statement_id = v_old.card_statement_id;
    PERFORM recalc_statement_amount(v_old.card_statement_id);
  END LOOP;

  IF v_txn.transaction_amount < 0 THEN
    v_item_type := 'refund';
  ELSIF v_txn.installment_number IS NOT NULL THEN
    v_item_type := 'installment';
  ELSE
    v_item_type := 'purchase';
  END IF;

  INSERT INTO statement_items (
    card_statement_id, transaction_id, type, description, amount, occurred_at,
    category_id, cost_center_id, installment_number, installment_total,
    workspace_id, credit_card_id
  )
  VALUES (
    v_statement_id, p_transaction_id, v_item_type,
    v_txn.transaction_description, v_txn.transaction_amount, v_txn.transaction_date::DATE,
    v_txn.transaction_category_id, v_txn.transaction_cost_center_id,
    v_txn.installment_number, v_txn.installment_total,
    v_txn.transaction_workspace_id, v_txn.transaction_card_id
  )
  ON CONFLICT (card_statement_id, transaction_id) WHERE transaction_id IS NOT NULL
  DO UPDATE SET
    type = EXCLUDED.type,
    description = EXCLUDED.description,
    amount = EXCLUDED.amount,
    occurred_at = EXCLUDED.occurred_at,
    category_id = EXCLUDED.category_id,
    cost_center_id = EXCLUDED.cost_center_id,
    installment_number = EXCLUDED.installment_number,
    installment_total = EXCLUDED.installment_total;

  PERFORM recalc_statement_amount(v_statement_id);
END;
$$;


-- ============================================================================
-- 6. register_statement_payment — total_paid via SUM (G10-DB) + status (G09)
-- ============================================================================
CREATE OR REPLACE FUNCTION register_statement_payment(
  p_statement_id UUID,
  amount_param NUMERIC,
  paid_at_param DATE,
  method_param TEXT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_workspace_id UUID;
  v_card_id      UUID;
  v_total_paid   NUMERIC(15,2);
BEGIN
  SELECT workspace_id, credit_card_id INTO v_workspace_id, v_card_id
  FROM card_statements WHERE id = p_statement_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Statement not found';
  END IF;

  INSERT INTO statement_payments (card_statement_id, amount, paid_at, method, workspace_id)
  VALUES (p_statement_id, amount_param, paid_at_param, method_param, v_workspace_id);

  -- G10 (lado-DB): recomputa de forma autoritativa, seguro sob concorrência.
  v_total_paid := COALESCE((
    SELECT SUM(amount) FROM statement_payments WHERE card_statement_id = p_statement_id
  ), 0);

  UPDATE card_statements SET
    total_paid = v_total_paid,
    carry_forward_amount = GREATEST(0, statement_amount - v_total_paid),
    updated_at = now()
  WHERE id = p_statement_id;

  PERFORM recompute_statement_status(p_statement_id);  -- G09
  PERFORM recalc_card_balance(v_card_id);              -- G07
END;
$$;


-- ============================================================================
-- 7. close_statement — recomputa status após fechar (G09)
-- ============================================================================
CREATE OR REPLACE FUNCTION close_statement(p_statement_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM card_statements WHERE id = p_statement_id AND status = 'open') THEN
    RAISE EXCEPTION 'Statement is not open or does not exist';
  END IF;

  PERFORM recalc_statement_amount(p_statement_id);  -- ainda 'open' aqui

  UPDATE card_statements SET
    status = 'closed',
    closed_at = now(),
    updated_at = now()
  WHERE id = p_statement_id;

  PERFORM recompute_statement_status(p_statement_id);  -- vira paid_* se já paga
END;
$$;


-- ============================================================================
-- 8. Saldo agora é recalculado dentro das RPCs acima → remove trigger antigo
--    que somava itens crus e não cobria pagamentos (G07).
-- ============================================================================
DROP TRIGGER IF EXISTS trg_statement_item_balance ON statement_items;
DROP FUNCTION IF EXISTS trg_update_card_balance();


-- ============================================================================
-- 9. Reconciliação única dos dados existentes
-- ============================================================================

-- 9.1 Marca como rolada a fatura imediatamente anterior a cada item de
--     carry_forward já existente (espelha o que ensure_open_statement fez).
UPDATE card_statements p
SET carried_forward_at = COALESCE(p.carried_forward_at, now())
FROM (
  SELECT DISTINCT
    (SELECT cs_p.id
       FROM card_statements cs_p
      WHERE cs_p.credit_card_id = cs_n.credit_card_id
        AND cs_p.period_start < cs_n.period_start
      ORDER BY cs_p.period_start DESC
      LIMIT 1) AS prev_id
  FROM statement_items si
  JOIN card_statements cs_n ON cs_n.id = si.card_statement_id
  WHERE si.type = 'carry_forward'
) m
WHERE p.id = m.prev_id;

-- 9.2 Recalcula valor/min_payment/status de todas as faturas e, por
--     consequência, o saldo de cada cartão sob o novo invariante.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM card_statements LOOP
    PERFORM recalc_statement_amount(r.id);
  END LOOP;
END $$;
