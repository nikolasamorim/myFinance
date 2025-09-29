/*
  # Create Invoice Tables

  1. New Tables
    - `card_statements`
      - `id` (uuid, primary key)
      - `workspace_id` (uuid, foreign key)
      - `credit_card_id` (uuid, foreign key)
      - `period_start` (date)
      - `period_end` (date)
      - `due_date` (date)
      - `opening_balance` (numeric, default 0)
      - `purchases_total` (numeric, default 0)
      - `installments_total` (numeric, default 0)
      - `refunds_total` (numeric, default 0)
      - `payments_total` (numeric, default 0)
      - `statement_amount` (numeric, default 0)
      - `min_payment_amount` (numeric, default 0)
      - `status` (enum: open|closed|paid_partial|paid_full)
      - `is_overdue` (boolean, default false)
      - `closed_at` (timestamp)
      - `paid_at` (timestamp)
      - `created_at` (timestamp, default now)

    - `statement_items`
      - `id` (uuid, primary key)
      - `workspace_id` (uuid, foreign key)
      - `card_statement_id` (uuid, foreign key)
      - `credit_card_id` (uuid, foreign key)
      - `transaction_id` (uuid, nullable, foreign key)
      - `type` (enum: purchase|installment|refund|payment|adjustment)
      - `occurred_at` (date)
      - `description` (text)
      - `amount` (numeric)
      - `category_id` (uuid, nullable, foreign key)
      - `cost_center_id` (uuid, nullable, foreign key)
      - `created_at` (timestamp, default now)

    - `statement_payments`
      - `id` (uuid, primary key)
      - `workspace_id` (uuid, foreign key)
      - `card_statement_id` (uuid, foreign key)
      - `amount` (numeric)
      - `paid_at` (date)
      - `method` (enum: pix|boleto|ted|dda)
      - `created_at` (timestamp, default now)

  2. Security
    - Enable RLS on all tables
    - Add workspace-based policies
*/

-- Card Statements
CREATE TABLE IF NOT EXISTS card_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
  credit_card_id uuid NOT NULL REFERENCES credit_cards(credit_card_id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  due_date date NOT NULL,
  opening_balance numeric(14,2) DEFAULT 0,
  purchases_total numeric(14,2) DEFAULT 0,
  installments_total numeric(14,2) DEFAULT 0,
  refunds_total numeric(14,2) DEFAULT 0,
  payments_total numeric(14,2) DEFAULT 0,
  statement_amount numeric(14,2) DEFAULT 0,
  min_payment_amount numeric(14,2) DEFAULT 0,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'paid_partial', 'paid_full')),
  is_overdue boolean DEFAULT false,
  closed_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE card_statements ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS card_statements_card_period_unique 
ON card_statements (credit_card_id, period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_card_statements_workspace_card_status 
ON card_statements (workspace_id, credit_card_id, status);

CREATE INDEX IF NOT EXISTS idx_card_statements_due_date 
ON card_statements (due_date);

-- Statement Items
CREATE TABLE IF NOT EXISTS statement_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
  card_statement_id uuid NOT NULL REFERENCES card_statements(id) ON DELETE CASCADE,
  credit_card_id uuid NOT NULL REFERENCES credit_cards(credit_card_id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES transactions(transaction_id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('purchase', 'installment', 'refund', 'payment', 'adjustment')),
  occurred_at date NOT NULL,
  description text NOT NULL,
  amount numeric(14,2) NOT NULL,
  category_id uuid REFERENCES categories(category_id) ON DELETE SET NULL,
  cost_center_id uuid REFERENCES cost_centers(cost_center_id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE statement_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_statement_items_statement 
ON statement_items (card_statement_id);

CREATE INDEX IF NOT EXISTS idx_statement_items_card_date 
ON statement_items (credit_card_id, occurred_at);

CREATE UNIQUE INDEX IF NOT EXISTS statement_items_statement_transaction_unique 
ON statement_items (card_statement_id, transaction_id) 
WHERE transaction_id IS NOT NULL;

-- Statement Payments
CREATE TABLE IF NOT EXISTS statement_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
  card_statement_id uuid NOT NULL REFERENCES card_statements(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL,
  paid_at date NOT NULL,
  method text NOT NULL CHECK (method IN ('pix', 'boleto', 'ted', 'dda')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE statement_payments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_statement_payments_statement_date 
ON statement_payments (card_statement_id, paid_at);

-- RLS Policies
CREATE POLICY "Users can access card statements in their workspaces"
  ON card_statements
  FOR ALL
  TO authenticated
  USING (workspace_id IN (
    SELECT workspace_user_workspace_id 
    FROM workspace_users 
    WHERE workspace_user_user_id = uid()
  ))
  WITH CHECK (workspace_id IN (
    SELECT workspace_user_workspace_id 
    FROM workspace_users 
    WHERE workspace_user_user_id = uid()
  ));

CREATE POLICY "Users can access statement items in their workspaces"
  ON statement_items
  FOR ALL
  TO authenticated
  USING (workspace_id IN (
    SELECT workspace_user_workspace_id 
    FROM workspace_users 
    WHERE workspace_user_user_id = uid()
  ))
  WITH CHECK (workspace_id IN (
    SELECT workspace_user_workspace_id 
    FROM workspace_users 
    WHERE workspace_user_user_id = uid()
  ));

CREATE POLICY "Users can access statement payments in their workspaces"
  ON statement_payments
  FOR ALL
  TO authenticated
  USING (workspace_id IN (
    SELECT workspace_user_workspace_id 
    FROM workspace_users 
    WHERE workspace_user_user_id = uid()
  ))
  WITH CHECK (workspace_id IN (
    SELECT workspace_user_workspace_id 
    FROM workspace_users 
    WHERE workspace_user_user_id = uid()
  ));

-- SQL RPC Functions
CREATE OR REPLACE FUNCTION compute_statement_window(card_id uuid, anchor_date date)
RETURNS TABLE(period_start date, period_end date, due_date date)
LANGUAGE plpgsql
AS $$
DECLARE
  closing_day int;
  due_day int;
  start_date date;
  end_date date;
  due_date_calc date;
BEGIN
  SELECT credit_card_closing_day, credit_card_due_day 
  INTO closing_day, due_day
  FROM credit_cards 
  WHERE credit_card_id = card_id;

  IF closing_day IS NULL OR due_day IS NULL THEN
    RAISE EXCEPTION 'Credit card not found or missing closing/due days';
  END IF;

  -- Calculate period start (previous month's closing day + 1)
  start_date := date_trunc('month', anchor_date) + interval '1 month' * (-1) + interval '1 day' * (closing_day);
  IF start_date > anchor_date THEN
    start_date := start_date - interval '1 month';
  END IF;

  -- Calculate period end (current month's closing day)
  end_date := start_date + interval '1 month' - interval '1 day';

  -- Calculate due date (next month's due day)
  due_date_calc := date_trunc('month', end_date) + interval '1 month' + interval '1 day' * (due_day - 1);

  RETURN QUERY SELECT start_date, end_date, due_date_calc;
END;
$$;

CREATE OR REPLACE FUNCTION ensure_open_statement(card_id uuid, period_start_param date)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  statement_id uuid;
  workspace_id_val uuid;
  window_result record;
  prev_balance numeric(14,2) := 0;
BEGIN
  -- Get workspace_id from credit card
  SELECT credit_card_workspace_id INTO workspace_id_val
  FROM credit_cards 
  WHERE credit_card_id = card_id;

  -- Compute window
  SELECT * INTO window_result 
  FROM compute_statement_window(card_id, period_start_param);

  -- Check if statement already exists
  SELECT id INTO statement_id
  FROM card_statements
  WHERE credit_card_id = card_id 
    AND period_start = window_result.period_start
    AND period_end = window_result.period_end;

  IF statement_id IS NOT NULL THEN
    RETURN statement_id;
  END IF;

  -- Calculate opening balance from previous statement
  SELECT COALESCE(statement_amount - payments_total, 0) INTO prev_balance
  FROM card_statements
  WHERE credit_card_id = card_id 
    AND period_end < window_result.period_start
  ORDER BY period_end DESC
  LIMIT 1;

  -- Create new statement
  INSERT INTO card_statements (
    workspace_id, credit_card_id, period_start, period_end, due_date, opening_balance
  ) VALUES (
    workspace_id_val, card_id, window_result.period_start, window_result.period_end, window_result.due_date, prev_balance
  ) RETURNING id INTO statement_id;

  RETURN statement_id;
END;
$$;

CREATE OR REPLACE FUNCTION sync_item_from_transaction(transaction_id_param uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  tx record;
  statement_id uuid;
  existing_item_id uuid;
  window_result record;
  item_type text;
BEGIN
  -- Get transaction details
  SELECT * INTO tx
  FROM transactions
  WHERE transaction_id = transaction_id_param;

  IF tx IS NULL OR tx.payment_method != 'cartao_de_credito' OR tx.transaction_card_id IS NULL THEN
    RETURN;
  END IF;

  -- Compute window for transaction date
  SELECT * INTO window_result 
  FROM compute_statement_window(tx.transaction_card_id, tx.transaction_date);

  -- Ensure open statement exists
  statement_id := ensure_open_statement(tx.transaction_card_id, window_result.period_start);

  -- Determine item type
  item_type := CASE 
    WHEN tx.installment_number IS NOT NULL THEN 'installment'
    ELSE 'purchase'
  END;

  -- Check for existing item
  SELECT id INTO existing_item_id
  FROM statement_items
  WHERE transaction_id = transaction_id_param;

  IF existing_item_id IS NULL THEN
    -- Create new item
    INSERT INTO statement_items (
      workspace_id, card_statement_id, credit_card_id, transaction_id,
      type, occurred_at, description, amount, category_id, cost_center_id
    ) VALUES (
      tx.transaction_workspace_id, statement_id, tx.transaction_card_id, transaction_id_param,
      item_type, tx.transaction_date, tx.transaction_description, tx.transaction_amount,
      tx.transaction_category_id, tx.transaction_cost_center_id
    );
  ELSE
    -- Update existing item if statement is still open
    UPDATE statement_items 
    SET 
      occurred_at = tx.transaction_date,
      description = tx.transaction_description,
      amount = tx.transaction_amount,
      category_id = tx.transaction_category_id,
      cost_center_id = tx.transaction_cost_center_id
    WHERE id = existing_item_id
      AND card_statement_id IN (SELECT id FROM card_statements WHERE status = 'open');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION close_statement(statement_id_param uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  purchases_sum numeric(14,2) := 0;
  installments_sum numeric(14,2) := 0;
  refunds_sum numeric(14,2) := 0;
  payments_sum numeric(14,2) := 0;
  opening_bal numeric(14,2) := 0;
  statement_amt numeric(14,2);
  min_payment numeric(14,2);
BEGIN
  -- Get opening balance
  SELECT opening_balance INTO opening_bal
  FROM card_statements
  WHERE id = statement_id_param;

  -- Aggregate totals
  SELECT 
    COALESCE(SUM(CASE WHEN type = 'purchase' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'installment' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'refund' THEN -amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'payment' THEN -amount ELSE 0 END), 0)
  INTO purchases_sum, installments_sum, refunds_sum, payments_sum
  FROM statement_items
  WHERE card_statement_id = statement_id_param;

  -- Calculate statement amount
  statement_amt := opening_bal + purchases_sum + installments_sum + refunds_sum + payments_sum;

  -- Calculate minimum payment (15% of purchases+installments, minimum 20)
  min_payment := LEAST(statement_amt, GREATEST(0.15 * (purchases_sum + installments_sum), 20));

  -- Update statement
  UPDATE card_statements
  SET 
    purchases_total = purchases_sum,
    installments_total = installments_sum,
    refunds_total = refunds_sum,
    payments_total = payments_sum,
    statement_amount = statement_amt,
    min_payment_amount = min_payment,
    status = 'closed',
    closed_at = now()
  WHERE id = statement_id_param;
END;
$$;

CREATE OR REPLACE FUNCTION register_statement_payment(
  statement_id_param uuid, 
  amount_param numeric, 
  paid_at_param date, 
  method_param text
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  workspace_id_val uuid;
  card_id_val uuid;
  new_payments_total numeric(14,2);
  current_statement_amount numeric(14,2);
  new_status text;
BEGIN
  -- Get statement details
  SELECT workspace_id, credit_card_id, statement_amount, payments_total
  INTO workspace_id_val, card_id_val, current_statement_amount, new_payments_total
  FROM card_statements
  WHERE id = statement_id_param;

  -- Insert payment record
  INSERT INTO statement_payments (workspace_id, card_statement_id, amount, paid_at, method)
  VALUES (workspace_id_val, statement_id_param, amount_param, paid_at_param, method_param);

  -- Insert payment item (negative amount)
  INSERT INTO statement_items (
    workspace_id, card_statement_id, credit_card_id, type, 
    occurred_at, description, amount
  ) VALUES (
    workspace_id_val, statement_id_param, card_id_val, 'payment',
    paid_at_param, 'Pagamento registrado', -amount_param
  );

  -- Update payments total
  new_payments_total := new_payments_total + amount_param;

  -- Determine new status
  IF new_payments_total >= current_statement_amount THEN
    new_status := 'paid_full';
  ELSE
    new_status := 'paid_partial';
  END IF;

  -- Update statement
  UPDATE card_statements
  SET 
    payments_total = new_payments_total,
    status = new_status,
    paid_at = CASE WHEN new_status = 'paid_full' THEN paid_at_param ELSE paid_at END,
    is_overdue = CASE 
      WHEN new_status = 'paid_full' THEN false
      WHEN CURRENT_DATE > due_date AND (current_statement_amount - new_payments_total) > 0 THEN true
      ELSE is_overdue
    END
  WHERE id = statement_id_param;
END;
$$;

CREATE OR REPLACE FUNCTION move_item_to_next_cycle(statement_item_id_param uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  item_record record;
  next_statement_id uuid;
  next_window record;
BEGIN
  -- Get item details
  SELECT * INTO item_record
  FROM statement_items si
  JOIN card_statements cs ON si.card_statement_id = cs.id
  WHERE si.id = statement_item_id_param AND cs.status = 'open';

  IF item_record IS NULL THEN
    RAISE EXCEPTION 'Item not found or statement is not open';
  END IF;

  -- Compute next window
  SELECT * INTO next_window 
  FROM compute_statement_window(item_record.credit_card_id, item_record.period_end + interval '1 day');

  -- Ensure next statement exists
  next_statement_id := ensure_open_statement(item_record.credit_card_id, next_window.period_start);

  -- Move item to next statement
  UPDATE statement_items
  SET card_statement_id = next_statement_id
  WHERE id = statement_item_id_param;
END;
$$;