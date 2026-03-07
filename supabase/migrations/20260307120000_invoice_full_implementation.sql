/*
  # Full Invoice/Statement Implementation

  Phase 1: Alter existing tables to match new schema
  Phase 2: RPC functions (compute_statement_window, ensure_open_statement, etc.)
  Phase 3: Triggers (auto-sync transactions to statements)
  Phase 6: Backfill function
*/

-- ============================================================================
-- PHASE 1 — Schema Updates
-- ============================================================================

-- 1.1 Add missing columns to card_statements
ALTER TABLE card_statements
  ADD COLUMN IF NOT EXISTS total_paid NUMERIC(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS carry_forward_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 1.2 Add missing columns and constraints to statement_items
ALTER TABLE statement_items
  ADD COLUMN IF NOT EXISTS installment_number INTEGER,
  ADD COLUMN IF NOT EXISTS installment_total INTEGER;

-- Add foreign key constraints for categories and cost_centers if they dont exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'statement_items_category_id_fkey') THEN
    ALTER TABLE statement_items ADD CONSTRAINT statement_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'statement_items_cost_center_id_fkey') THEN
    ALTER TABLE statement_items ADD CONSTRAINT statement_items_cost_center_id_fkey FOREIGN KEY (cost_center_id) REFERENCES cost_centers(cost_center_id) ON DELETE SET NULL;
  END IF;
END $$;

-- Update type check constraint to include 'carry_forward'
ALTER TABLE statement_items DROP CONSTRAINT IF EXISTS statement_items_type_check;
ALTER TABLE statement_items
  ADD CONSTRAINT statement_items_type_check CHECK (type IN ('purchase','installment','refund','payment','adjustment','carry_forward'));

-- 1.3 Add missing columns to credit_cards
ALTER TABLE credit_cards
  ADD COLUMN IF NOT EXISTS min_payment_pct NUMERIC(5,2) DEFAULT 15.00,
  ADD COLUMN IF NOT EXISTS min_payment_floor NUMERIC(15,2) DEFAULT 50.00;

-- Add unique constraint on (credit_card_id, period_start) if not exists
DO $$
BEGIN
  IF to_regclass('public.uq_card_statements_card_period') IS NULL THEN
    CREATE UNIQUE INDEX uq_card_statements_card_period ON public.card_statements (credit_card_id, period_start);
  END IF;
END $$;


-- ============================================================================
-- PHASE 2 — RPC Functions
-- ============================================================================

-- Helper: clamp a day number to the last day of a given month
CREATE OR REPLACE FUNCTION _clamp_day(p_year INT, p_month INT, p_day INT)
RETURNS DATE
LANGUAGE sql IMMUTABLE AS $$
  SELECT make_date(p_year, p_month,
    LEAST(p_day, EXTRACT(DAY FROM (make_date(p_year, p_month, 1) + INTERVAL '1 month' - INTERVAL '1 day'))::INT)
  );
$$;

-- Drop all variations of the functions first to prevent PGRST203 ambiguous overloading
-- Some might have different parameter orders (UUID, DATE vs DATE, UUID)
DROP FUNCTION IF EXISTS compute_statement_window(UUID, DATE);
DROP FUNCTION IF EXISTS compute_statement_window(DATE, UUID);
DROP FUNCTION IF EXISTS ensure_open_statement(UUID, DATE);
DROP FUNCTION IF EXISTS ensure_open_statement(DATE, UUID);
DROP FUNCTION IF EXISTS sync_item_from_transaction(UUID);
DROP FUNCTION IF EXISTS recalc_statement_amount(UUID);
DROP FUNCTION IF EXISTS close_statement(UUID);
DROP FUNCTION IF EXISTS register_statement_payment(UUID, NUMERIC, DATE, TEXT);
DROP FUNCTION IF EXISTS move_item_to_next_cycle(UUID);
DROP FUNCTION IF EXISTS backfill_statements_for_card(UUID);

-- 2.1 compute_statement_window
CREATE OR REPLACE FUNCTION compute_statement_window(card_id UUID, anchor_date DATE)
RETURNS TABLE(period_start DATE, period_end DATE, due_date DATE)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_closing_day INT;
  v_due_day INT;
  v_close_month DATE; -- first day of the month where period_end falls
  v_prev_month DATE;  -- first day of the month where period_start's closing_day falls
  v_due_month DATE;   -- first day of the month where due_date falls
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

  IF EXTRACT(DAY FROM anchor_date) <= v_closing_day THEN
    -- anchor is before or on closing day: period closes this month
    v_close_month := DATE_TRUNC('month', anchor_date)::DATE;
  ELSE
    -- anchor is after closing day: period closes next month
    v_close_month := (DATE_TRUNC('month', anchor_date) + INTERVAL '1 month')::DATE;
  END IF;

  v_prev_month := (v_close_month - INTERVAL '1 month')::DATE;
  v_due_month := (v_close_month + INTERVAL '1 month')::DATE;

  -- period_end = closing_day of v_close_month (clamped)
  v_period_end := _clamp_day(EXTRACT(YEAR FROM v_close_month)::INT, EXTRACT(MONTH FROM v_close_month)::INT, v_closing_day);

  -- period_start = closing_day of previous month + 1 day
  v_period_start := _clamp_day(EXTRACT(YEAR FROM v_prev_month)::INT, EXTRACT(MONTH FROM v_prev_month)::INT, v_closing_day) + 1;

  -- due_date = due_day of the month after period_end
  v_due_date := _clamp_day(EXTRACT(YEAR FROM v_due_month)::INT, EXTRACT(MONTH FROM v_due_month)::INT, v_due_day);

  RETURN QUERY SELECT v_period_start, v_period_end, v_due_date;
END;
$$;


-- 2.4 recalc_statement_amount
CREATE OR REPLACE FUNCTION recalc_statement_amount(p_statement_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE card_statements SET
    statement_amount = COALESCE((
      SELECT SUM(amount) FROM statement_items WHERE card_statement_id = p_statement_id
    ), 0),
    min_payment_amount = GREATEST(
      (SELECT min_payment_floor FROM credit_cards WHERE credit_card_id = card_statements.credit_card_id),
      COALESCE((
        SELECT SUM(amount) FROM statement_items WHERE card_statement_id = p_statement_id
      ), 0) * (SELECT min_payment_pct / 100.0 FROM credit_cards WHERE credit_card_id = card_statements.credit_card_id)
    ),
    updated_at = now()
  WHERE id = p_statement_id;
END;
$$;


-- 2.2 ensure_open_statement
CREATE OR REPLACE FUNCTION ensure_open_statement(card_id UUID, p_period_start DATE)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_statement_id UUID;
  v_workspace_id UUID;
  v_period_end DATE;
  v_due_date DATE;
  v_prev_start DATE;
  v_prev_statement RECORD;
  v_carry NUMERIC(15,2);
BEGIN
  -- Check if statement already exists
  SELECT id INTO v_statement_id
  FROM card_statements
  WHERE credit_card_id = card_id AND period_start = p_period_start;

  IF v_statement_id IS NOT NULL THEN
    RETURN v_statement_id;
  END IF;

  -- Get workspace_id from credit card
  SELECT credit_card_workspace_id INTO v_workspace_id
  FROM credit_cards WHERE credit_card_id = card_id;

  -- Compute period_end and due_date using compute_statement_window
  -- We use period_start as anchor, but we need the actual window
  SELECT csw.period_end, csw.due_date INTO v_period_end, v_due_date
  FROM compute_statement_window(card_id, p_period_start) csw;

  -- Create the statement
  INSERT INTO card_statements (workspace_id, credit_card_id, period_start, period_end, due_date, status)
  VALUES (v_workspace_id, card_id, p_period_start, v_period_end, v_due_date, 'open')
  RETURNING id INTO v_statement_id;

  -- Check for carry_forward from previous statement
  SELECT cs.id, cs.statement_amount, cs.total_paid, cs.status
  INTO v_prev_statement
  FROM card_statements cs
  WHERE cs.credit_card_id = card_id
    AND cs.period_start < p_period_start
    AND cs.status IN ('closed', 'paid_partial')
  ORDER BY cs.period_start DESC
  LIMIT 1;

  IF v_prev_statement IS NOT NULL THEN
    v_carry := GREATEST(0, v_prev_statement.statement_amount - v_prev_statement.total_paid);
    IF v_carry > 0 THEN
      INSERT INTO statement_items (card_statement_id, type, description, amount, occurred_at, workspace_id, credit_card_id)
      VALUES (v_statement_id, 'carry_forward', 'Saldo anterior', v_carry, p_period_start, v_workspace_id, card_id);

      PERFORM recalc_statement_amount(v_statement_id);
    END IF;
  END IF;

  RETURN v_statement_id;
END;
$$;


-- 2.3 sync_item_from_transaction
CREATE OR REPLACE FUNCTION sync_item_from_transaction(p_transaction_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_txn RECORD;
  v_window RECORD;
  v_statement_id UUID;
  v_item_type TEXT;
BEGIN
  -- Read the transaction
  SELECT * INTO v_txn FROM transactions WHERE transaction_id = p_transaction_id;

  IF NOT FOUND OR v_txn.transaction_card_id IS NULL THEN
    RETURN;
  END IF;

  -- Compute the statement window for this transaction's date
  SELECT * INTO v_window
  FROM compute_statement_window(v_txn.transaction_card_id, v_txn.transaction_date::DATE);

  -- Ensure the statement exists
  v_statement_id := ensure_open_statement(v_txn.transaction_card_id, v_window.period_start);

  -- Determine item type
  IF v_txn.transaction_amount < 0 THEN
    v_item_type := 'refund';
  ELSIF v_txn.installment_number IS NOT NULL THEN
    v_item_type := 'installment';
  ELSE
    v_item_type := 'purchase';
  END IF;

  -- Upsert statement item
  INSERT INTO statement_items (
    card_statement_id, transaction_id, type, description, amount, occurred_at,
    category_id, cost_center_id, installment_number, installment_total,
    workspace_id, credit_card_id
  )
  VALUES (
    v_statement_id, p_transaction_id, v_item_type,
    v_txn.transaction_description,
    v_txn.transaction_amount, -- Negative amounts (refunds) will decrease total
    v_txn.transaction_date::DATE,
    v_txn.transaction_category_id,
    v_txn.transaction_cost_center_id,
    v_txn.installment_number,
    v_txn.installment_total,
    v_txn.transaction_workspace_id,
    v_txn.transaction_card_id
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

  -- Recalculate statement
  PERFORM recalc_statement_amount(v_statement_id);
END;
$$;


-- 2.5 close_statement
CREATE OR REPLACE FUNCTION close_statement(p_statement_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Validate status is open
  IF NOT EXISTS (SELECT 1 FROM card_statements WHERE id = p_statement_id AND status = 'open') THEN
    RAISE EXCEPTION 'Statement is not open or does not exist';
  END IF;

  -- Recalculate one last time
  PERFORM recalc_statement_amount(p_statement_id);

  -- Close
  UPDATE card_statements SET
    status = 'closed',
    closed_at = now(),
    updated_at = now()
  WHERE id = p_statement_id;
END;
$$;


-- 2.6 register_statement_payment
CREATE OR REPLACE FUNCTION register_statement_payment(
  p_statement_id UUID,
  amount_param NUMERIC,
  paid_at_param DATE,
  method_param TEXT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_statement RECORD;
  v_new_total_paid NUMERIC(15,2);
  v_workspace_id UUID;
BEGIN
  SELECT * INTO v_statement FROM card_statements WHERE id = p_statement_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Statement not found';
  END IF;

  -- Get workspace_id for the payment record
  v_workspace_id := v_statement.workspace_id;

  -- Insert payment
  INSERT INTO statement_payments (card_statement_id, amount, paid_at, method, workspace_id)
  VALUES (p_statement_id, amount_param, paid_at_param, method_param, v_workspace_id);

  -- Update total paid
  v_new_total_paid := v_statement.total_paid + amount_param;

  -- Update statement
  UPDATE card_statements SET
    total_paid = v_new_total_paid,
    status = CASE
      WHEN v_new_total_paid >= statement_amount THEN 'paid_full'
      WHEN v_new_total_paid > 0 THEN 'paid_partial'
      ELSE status
    END,
    carry_forward_amount = GREATEST(0, statement_amount - v_new_total_paid),
    paid_at = CASE WHEN v_new_total_paid >= statement_amount THEN now() ELSE paid_at END,
    updated_at = now()
  WHERE id = p_statement_id;
END;
$$;


-- 2.7 move_item_to_next_cycle
CREATE OR REPLACE FUNCTION move_item_to_next_cycle(p_item_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_item RECORD;
  v_current_statement RECORD;
  v_next_window RECORD;
  v_next_statement_id UUID;
BEGIN
  -- Read the item
  SELECT * INTO v_item FROM statement_items WHERE id = p_item_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Statement item not found';
  END IF;

  -- Read current statement
  SELECT * INTO v_current_statement FROM card_statements WHERE id = v_item.card_statement_id;

  -- Compute next period: use period_end + 1 day as anchor
  SELECT * INTO v_next_window
  FROM compute_statement_window(v_current_statement.credit_card_id, v_current_statement.period_end + INTERVAL '1 day');

  -- Ensure next statement exists
  v_next_statement_id := ensure_open_statement(v_current_statement.credit_card_id, v_next_window.period_start);

  -- Move item
  UPDATE statement_items SET card_statement_id = v_next_statement_id WHERE id = p_item_id;

  -- Recalculate both statements
  PERFORM recalc_statement_amount(v_current_statement.id);
  PERFORM recalc_statement_amount(v_next_statement_id);
END;
$$;


-- ============================================================================
-- PHASE 3 — Triggers
-- ============================================================================

-- 3.1 Trigger on transactions INSERT/UPDATE
CREATE OR REPLACE FUNCTION trg_sync_transaction_to_statement()
RETURNS TRIGGER AS $$
BEGIN
  -- Process if card is linked
  IF NEW.transaction_card_id IS NOT NULL THEN
    PERFORM sync_item_from_transaction(NEW.transaction_id);
  END IF;

  -- If card was removed (update), remove item from statement
  IF TG_OP = 'UPDATE' AND OLD.transaction_card_id IS NOT NULL AND NEW.transaction_card_id IS NULL THEN
    DECLARE
      v_stmt_id UUID;
    BEGIN
      SELECT card_statement_id INTO v_stmt_id
      FROM statement_items WHERE transaction_id = OLD.transaction_id;

      IF v_stmt_id IS NOT NULL THEN
        DELETE FROM statement_items WHERE transaction_id = OLD.transaction_id;
        PERFORM recalc_statement_amount(v_stmt_id);
      END IF;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_transaction_statement_sync ON transactions;
CREATE TRIGGER trg_transaction_statement_sync
  AFTER INSERT OR UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION trg_sync_transaction_to_statement();


-- 3.2 Trigger on transactions DELETE
CREATE OR REPLACE FUNCTION trg_remove_transaction_from_statement()
RETURNS TRIGGER AS $$
DECLARE
  v_statement_id UUID;
BEGIN
  SELECT card_statement_id INTO v_statement_id
  FROM statement_items WHERE transaction_id = OLD.transaction_id;

  IF v_statement_id IS NOT NULL THEN
    DELETE FROM statement_items WHERE transaction_id = OLD.transaction_id;
    PERFORM recalc_statement_amount(v_statement_id);
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_transaction_statement_remove ON transactions;
CREATE TRIGGER trg_transaction_statement_remove
  BEFORE DELETE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION trg_remove_transaction_from_statement();


-- 3.3 Trigger to update card balance
CREATE OR REPLACE FUNCTION trg_update_card_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_card_id UUID;
  v_stmt_id UUID;
BEGIN
  -- Get the relevant statement_id
  v_stmt_id := COALESCE(NEW.card_statement_id, OLD.card_statement_id);

  SELECT credit_card_id INTO v_card_id
  FROM card_statements WHERE id = v_stmt_id;

  IF v_card_id IS NOT NULL THEN
    UPDATE credit_cards SET
      current_balance = COALESCE((
        SELECT SUM(si.amount)
        FROM statement_items si
        JOIN card_statements cs ON cs.id = si.card_statement_id
        WHERE cs.credit_card_id = v_card_id
          AND cs.status IN ('open', 'closed', 'paid_partial')
      ), 0) - COALESCE((
        SELECT SUM(sp.amount)
        FROM statement_payments sp
        JOIN card_statements cs ON cs.id = sp.card_statement_id
        WHERE cs.credit_card_id = v_card_id
          AND cs.status IN ('open', 'closed', 'paid_partial')
      ), 0)
    WHERE credit_card_id = v_card_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_statement_item_balance ON statement_items;
CREATE TRIGGER trg_statement_item_balance
  AFTER INSERT OR UPDATE OR DELETE ON statement_items
  FOR EACH ROW
  EXECUTE FUNCTION trg_update_card_balance();


-- ============================================================================
-- PHASE 4 — Security (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE card_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE statement_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE statement_payments ENABLE ROW LEVEL SECURITY;

-- 4.1 card_statements policies
DROP POLICY IF EXISTS "Users can view card_statements in their workspaces" ON card_statements;
CREATE POLICY "Users can view card_statements in their workspaces"
ON card_statements FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspaces WHERE workspaces.workspace_id = card_statements.workspace_id
    AND workspaces.workspace_owner_user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM workspace_users WHERE workspace_users.workspace_user_workspace_id = card_statements.workspace_id
    AND workspace_users.workspace_user_user_id = auth.uid()
  )
);

-- 4.2 statement_items policies
DROP POLICY IF EXISTS "Users can view statement_items in their workspaces" ON statement_items;
CREATE POLICY "Users can view statement_items in their workspaces"
ON statement_items FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspaces WHERE workspaces.workspace_id = statement_items.workspace_id
    AND workspaces.workspace_owner_user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM workspace_users WHERE workspace_users.workspace_user_workspace_id = statement_items.workspace_id
    AND workspace_users.workspace_user_user_id = auth.uid()
  )
);

-- 4.3 statement_payments policies
DROP POLICY IF EXISTS "Users can view statement_payments in their workspaces" ON statement_payments;
CREATE POLICY "Users can view statement_payments in their workspaces"
ON statement_payments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspaces WHERE workspaces.workspace_id = statement_payments.workspace_id
    AND workspaces.workspace_owner_user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM workspace_users WHERE workspace_users.workspace_user_workspace_id = statement_payments.workspace_id
    AND workspace_users.workspace_user_user_id = auth.uid()
  )
);

-- ============================================================================
-- PHASE 6 — Backfill Function
-- ============================================================================

CREATE OR REPLACE FUNCTION backfill_statements_for_card(p_card_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_txn RECORD;
BEGIN
  FOR v_txn IN
    SELECT transaction_id FROM transactions
    WHERE transaction_card_id = p_card_id
    ORDER BY transaction_date ASC
  LOOP
    PERFORM sync_item_from_transaction(v_txn.transaction_id);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PHASE 7 — Automatic Backfill for Existing Cards
-- ============================================================================

DO $$
DECLARE
    v_card_id UUID;
BEGIN
    FOR v_card_id IN SELECT credit_card_id FROM credit_cards LOOP
        PERFORM backfill_statements_for_card(v_card_id);
    END LOOP;
END $$;
