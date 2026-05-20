/*
  # Fase 3: automação de faturas + guardas de configuração

  - G05: fechamento automático de faturas vencidas (close_due_statements) via
         pg_cron diário, com notificação 'invoice_closing' ao dono do workspace.
  - G06: marcação de faturas vencidas (mark_overdue_statements) no mesmo job.
  - G12 (DB): compute_statement_window levanta erro claro se o cartão não tem
         dia de fechamento/vencimento; sync ignora graciosamente cartões sem
         dias (não quebra o INSERT da transação). Backfill defensivo de nulos.

  Observação: compute_statement_window e sync_item_from_transaction são
  recriadas COM `SET search_path` no corpo para preservar o hardening
  (CREATE OR REPLACE descarta settings não declarados).
*/

-- ============================================================================
-- G12: backfill defensivo de cartões sem dias (hoje 0 linhas)
-- ============================================================================
UPDATE credit_cards
SET credit_card_closing_day = COALESCE(credit_card_closing_day, 1),
    credit_card_due_day     = COALESCE(credit_card_due_day, 10)
WHERE credit_card_closing_day IS NULL OR credit_card_due_day IS NULL;


-- ============================================================================
-- G12: compute_statement_window — erro claro quando faltam os dias
-- ============================================================================
CREATE OR REPLACE FUNCTION compute_statement_window(card_id UUID, anchor_date DATE)
RETURNS TABLE(period_start DATE, period_end DATE, due_date DATE)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_closing_day INT;
  v_due_day INT;
  v_close_month DATE;
  v_prev_month DATE;
  v_due_month DATE;
  v_period_start DATE;
  v_period_end DATE;
  v_due_date DATE;
BEGIN
  SELECT credit_card_closing_day, credit_card_due_day
  INTO v_closing_day, v_due_day
  FROM credit_cards
  WHERE credit_card_id = card_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Credit card not found: %', card_id;
  END IF;

  IF v_closing_day IS NULL OR v_due_day IS NULL THEN
    RAISE EXCEPTION 'Cartão % sem dia de fechamento/vencimento configurado', card_id;
  END IF;

  IF EXTRACT(DAY FROM anchor_date) <= v_closing_day THEN
    v_close_month := DATE_TRUNC('month', anchor_date)::DATE;
  ELSE
    v_close_month := (DATE_TRUNC('month', anchor_date) + INTERVAL '1 month')::DATE;
  END IF;

  v_prev_month := (v_close_month - INTERVAL '1 month')::DATE;
  v_due_month := (v_close_month + INTERVAL '1 month')::DATE;

  v_period_end := _clamp_day(EXTRACT(YEAR FROM v_close_month)::INT, EXTRACT(MONTH FROM v_close_month)::INT, v_closing_day);
  v_period_start := _clamp_day(EXTRACT(YEAR FROM v_prev_month)::INT, EXTRACT(MONTH FROM v_prev_month)::INT, v_closing_day) + 1;
  v_due_date := _clamp_day(EXTRACT(YEAR FROM v_due_month)::INT, EXTRACT(MONTH FROM v_due_month)::INT, v_due_day);

  RETURN QUERY SELECT v_period_start, v_period_end, v_due_date;
END;
$$;


-- ============================================================================
-- G12: sync_item_from_transaction — ignora cartão sem dias (não quebra INSERT)
--      (mantém a lógica G04 de dedupe entre faturas)
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_item_from_transaction(p_transaction_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
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

  -- G12: cartão sem dia de fechamento/vencimento → não sincroniza (transação salva normalmente)
  PERFORM 1 FROM credit_cards
  WHERE credit_card_id = v_txn.transaction_card_id
    AND credit_card_closing_day IS NOT NULL
    AND credit_card_due_day IS NOT NULL;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT * INTO v_window
  FROM compute_statement_window(v_txn.transaction_card_id, v_txn.transaction_date::DATE);

  v_statement_id := ensure_open_statement(v_txn.transaction_card_id, v_window.period_start);

  -- G04: remove o item de qualquer outra fatura (mudança de data/cartão)
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
-- G05: fechamento automático + notificação ao dono do workspace
-- ============================================================================
CREATE OR REPLACE FUNCTION close_due_statements()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  r          RECORD;
  v_owner    UUID;
  v_card     TEXT;
  v_amount   NUMERIC(15,2);
  v_count    INTEGER := 0;
BEGIN
  FOR r IN
    SELECT id, workspace_id, credit_card_id, due_date
    FROM card_statements
    WHERE status = 'open' AND period_end < current_date
  LOOP
    PERFORM recalc_statement_amount(r.id);

    UPDATE card_statements
    SET status = 'closed', closed_at = now(), updated_at = now()
    WHERE id = r.id AND status = 'open';
    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    PERFORM recompute_statement_status(r.id);
    v_count := v_count + 1;

    SELECT statement_amount INTO v_amount FROM card_statements WHERE id = r.id;
    SELECT workspace_owner_user_id INTO v_owner FROM workspaces WHERE workspace_id = r.workspace_id;
    SELECT credit_card_name INTO v_card FROM credit_cards WHERE credit_card_id = r.credit_card_id;

    IF v_owner IS NOT NULL AND is_notification_enabled(v_owner, r.workspace_id, 'invoice_closing') THEN
      INSERT INTO notifications (user_id, workspace_id, type, title, message, entity_type, entity_id, data)
      VALUES (
        v_owner, r.workspace_id, 'invoice_closing', 'Fatura fechada',
        'A fatura do cartão "' || COALESCE(v_card, 'Cartão') || '" foi fechada com total de R$ '
          || trim(to_char(COALESCE(v_amount, 0), 'FM999999999990.00')) || '.',
        'credit_card', r.credit_card_id,
        jsonb_build_object('card_name', v_card, 'statement_id', r.id, 'due_date', r.due_date, 'amount', COALESCE(v_amount, 0))
      );
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;


-- ============================================================================
-- G06: marcação de faturas vencidas
-- ============================================================================
CREATE OR REPLACE FUNCTION mark_overdue_statements()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  UPDATE card_statements
  SET is_overdue = true, updated_at = now()
  WHERE status IN ('closed', 'paid_partial')
    AND due_date < current_date
    AND total_paid < statement_amount
    AND is_overdue = false;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- volta a false quando quitada
  UPDATE card_statements
  SET is_overdue = false, updated_at = now()
  WHERE is_overdue = true
    AND (total_paid >= statement_amount OR status = 'paid_full');

  RETURN v_count;
END;
$$;


-- ============================================================================
-- Job único de manutenção + agendamento diário (pg_cron)
-- ============================================================================
CREATE OR REPLACE FUNCTION run_statement_maintenance()
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM close_due_statements();
  PERFORM mark_overdue_statements();
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'close-and-flag-statements') THEN
    PERFORM cron.unschedule('close-and-flag-statements');
  END IF;
END $$;

-- Diariamente às 06:00 UTC (03:00 America/Sao_Paulo), mesmo horário do job de recorrência.
SELECT cron.schedule(
  'close-and-flag-statements',
  '0 6 * * *',
  $cron$ SELECT public.run_statement_maintenance(); $cron$
);


-- ============================================================================
-- Reconciliação única: fecha o backlog de faturas já vencidas que ficaram
-- 'open' (SEM notificar — evita spam de "fatura fechada" histórica). O cron
-- passa a cuidar dos fechamentos futuros, esses sim com notificação.
-- ============================================================================
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM card_statements WHERE status = 'open' AND period_end < current_date LOOP
    PERFORM recalc_statement_amount(r.id);
    UPDATE card_statements SET status = 'closed', closed_at = now(), updated_at = now()
    WHERE id = r.id AND status = 'open';
    PERFORM recompute_statement_status(r.id);
  END LOOP;
END $$;

SELECT mark_overdue_statements();
