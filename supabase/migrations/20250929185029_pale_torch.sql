/*
  # Create Statement Tables

  1. New Tables
    - `card_statements`
      - `id` (uuid, primary key)
      - `workspace_id` (uuid, not null)
      - `credit_card_id` (uuid, not null)
      - `period_start` (date, not null)
      - `period_end` (date, not null)
      - `due_date` (date, not null)
      - `opening_balance` (numeric(14,2), default 0)
      - `purchases_total` (numeric(14,2), default 0)
      - `installments_total` (numeric(14,2), default 0)
      - `refunds_total` (numeric(14,2), default 0)
      - `payments_total` (numeric(14,2), default 0)
      - `statement_amount` (numeric(14,2), default 0)
      - `min_payment_amount` (numeric(14,2), default 0)
      - `status` (text, check constraint)
      - `is_overdue` (boolean, default false)
      - `closed_at` (timestamptz, nullable)
      - `paid_at` (timestamptz, nullable)
      - `created_at` (timestamptz, default now())

    - `statement_items`
      - `id` (uuid, primary key)
      - `workspace_id` (uuid, not null)
      - `card_statement_id` (uuid, not null)
      - `credit_card_id` (uuid, not null)
      - `transaction_id` (uuid, nullable)
      - `type` (text, check constraint)
      - `occurred_at` (date, not null)
      - `description` (text, not null)
      - `amount` (numeric(14,2), not null)
      - `category_id` (uuid, nullable)
      - `cost_center_id` (uuid, nullable)
      - `created_at` (timestamptz, default now())

    - `statement_payments`
      - `id` (uuid, primary key)
      - `workspace_id` (uuid, not null)
      - `card_statement_id` (uuid, not null)
      - `amount` (numeric(14,2), not null)
      - `paid_at` (date, not null)
      - `method` (text, check constraint)
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on all tables
    - Add workspace access policies for all tables

  3. Indexes
    - Unique constraint on card_statements (credit_card_id, period_start, period_end)
    - Performance indexes on frequently queried columns
    - Partial unique index on statement_items to prevent transaction duplicates
*/

-- Create card_statements table
CREATE TABLE IF NOT EXISTS card_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  credit_card_id uuid NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  due_date date NOT NULL,
  opening_balance numeric(14,2) NOT NULL DEFAULT 0,
  purchases_total numeric(14,2) NOT NULL DEFAULT 0,
  installments_total numeric(14,2) NOT NULL DEFAULT 0,
  refunds_total numeric(14,2) NOT NULL DEFAULT 0,
  payments_total numeric(14,2) NOT NULL DEFAULT 0,
  statement_amount numeric(14,2) NOT NULL DEFAULT 0,
  min_payment_amount numeric(14,2) NOT NULL DEFAULT 0,
  status text NOT NULL CHECK (status IN ('open', 'closed', 'paid_partial', 'paid_full')),
  is_overdue boolean NOT NULL DEFAULT false,
  closed_at timestamptz NULL,
  paid_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create statement_items table
CREATE TABLE IF NOT EXISTS statement_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  card_statement_id uuid NOT NULL,
  credit_card_id uuid NOT NULL,
  transaction_id uuid NULL,
  type text NOT NULL CHECK (type IN ('purchase', 'installment', 'refund', 'payment', 'adjustment')),
  occurred_at date NOT NULL,
  description text NOT NULL,
  amount numeric(14,2) NOT NULL,
  category_id uuid NULL,
  cost_center_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create statement_payments table
CREATE TABLE IF NOT EXISTS statement_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  card_statement_id uuid NOT NULL,
  amount numeric(14,2) NOT NULL,
  paid_at date NOT NULL,
  method text NOT NULL CHECK (method IN ('pix', 'boleto', 'ted', 'dda')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add foreign key constraints
ALTER TABLE card_statements 
ADD CONSTRAINT IF NOT EXISTS card_statements_workspace_id_fkey 
FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id) ON DELETE CASCADE;

ALTER TABLE card_statements 
ADD CONSTRAINT IF NOT EXISTS card_statements_credit_card_id_fkey 
FOREIGN KEY (credit_card_id) REFERENCES credit_cards(credit_card_id) ON DELETE CASCADE;

ALTER TABLE statement_items 
ADD CONSTRAINT IF NOT EXISTS statement_items_workspace_id_fkey 
FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id) ON DELETE CASCADE;

ALTER TABLE statement_items 
ADD CONSTRAINT IF NOT EXISTS statement_items_card_statement_id_fkey 
FOREIGN KEY (card_statement_id) REFERENCES card_statements(id) ON DELETE CASCADE;

ALTER TABLE statement_items 
ADD CONSTRAINT IF NOT EXISTS statement_items_credit_card_id_fkey 
FOREIGN KEY (credit_card_id) REFERENCES credit_cards(credit_card_id) ON DELETE CASCADE;

ALTER TABLE statement_items 
ADD CONSTRAINT IF NOT EXISTS statement_items_transaction_id_fkey 
FOREIGN KEY (transaction_id) REFERENCES transactions(transaction_id) ON DELETE SET NULL;

ALTER TABLE statement_items 
ADD CONSTRAINT IF NOT EXISTS statement_items_category_id_fkey 
FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE SET NULL;

ALTER TABLE statement_items 
ADD CONSTRAINT IF NOT EXISTS statement_items_cost_center_id_fkey 
FOREIGN KEY (cost_center_id) REFERENCES cost_centers(cost_center_id) ON DELETE SET NULL;

ALTER TABLE statement_payments 
ADD CONSTRAINT IF NOT EXISTS statement_payments_workspace_id_fkey 
FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id) ON DELETE CASCADE;

ALTER TABLE statement_payments 
ADD CONSTRAINT IF NOT EXISTS statement_payments_card_statement_id_fkey 
FOREIGN KEY (card_statement_id) REFERENCES card_statements(id) ON DELETE CASCADE;

-- Create unique constraints
ALTER TABLE card_statements 
ADD CONSTRAINT IF NOT EXISTS card_statements_unique_period 
UNIQUE (credit_card_id, period_start, period_end);

-- Create partial unique index for statement_items
CREATE UNIQUE INDEX IF NOT EXISTS statement_items_unique_transaction 
ON statement_items (card_statement_id, transaction_id) 
WHERE transaction_id IS NOT NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_card_statements_workspace_card_status 
ON card_statements (workspace_id, credit_card_id, status);

CREATE INDEX IF NOT EXISTS idx_card_statements_due_date 
ON card_statements (due_date);

CREATE INDEX IF NOT EXISTS idx_statement_items_statement 
ON statement_items (card_statement_id);

CREATE INDEX IF NOT EXISTS idx_statement_items_card_occurred 
ON statement_items (credit_card_id, occurred_at);

CREATE INDEX IF NOT EXISTS idx_statement_payments_statement_date 
ON statement_payments (card_statement_id, paid_at);

-- Enable RLS
ALTER TABLE card_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE statement_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE statement_payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for card_statements
CREATE POLICY "Users can access statements in their workspaces"
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

-- Create RLS policies for statement_items
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

-- Create RLS policies for statement_payments
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

-- Create RPC function: compute_statement_window
CREATE OR REPLACE FUNCTION compute_statement_window(
  anchor_date date,
  card_id uuid
)
RETURNS TABLE(
  period_start date,
  period_end date,
  due_date date
)
LANGUAGE plpgsql
AS $$
DECLARE
  closing_day integer;
  due_day integer;
  anchor_year integer;
  anchor_month integer;
  period_start_calc date;
  period_end_calc date;
  due_date_calc date;
BEGIN
  -- Get card closing and due days
  SELECT credit_card_closing_day, credit_card_due_day
  INTO closing_day, due_day
  FROM credit_cards
  WHERE credit_card_id = card_id;

  IF closing_day IS NULL OR due_day IS NULL THEN
    RAISE EXCEPTION 'Credit card not found or missing closing/due days';
  END IF;

  -- Extract year and month from anchor date
  anchor_year := EXTRACT(YEAR FROM anchor_date);
  anchor_month := EXTRACT(MONTH FROM anchor_date);

  -- Calculate period start (previous month's closing day + 1)
  period_start_calc := make_date(anchor_year, anchor_month, 1) - interval '1 month';
  period_start_calc := make_date(EXTRACT(YEAR FROM period_start_calc)::integer, 
                                 EXTRACT(MONTH FROM period_start_calc)::integer, 
                                 closing_day) + interval '1 day';

  -- Calculate period end (current month's closing day)
  period_end_calc := make_date(anchor_year, anchor_month, closing_day);

  -- Calculate due date (next month's due day)
  due_date_calc := make_date(anchor_year, anchor_month, 1) + interval '1 month';
  due_date_calc := make_date(EXTRACT(YEAR FROM due_date_calc)::integer,
                            EXTRACT(MONTH FROM due_date_calc)::integer,
                            due_day);

  RETURN QUERY SELECT period_start_calc, period_end_calc, due_date_calc;
END;
$$;

-- Create RPC function: ensure_open_statement
CREATE OR REPLACE FUNCTION ensure_open_statement(
  card_id uuid,
  period_start_param date
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  statement_id uuid;
  workspace_id_val uuid;
  window_data record;
BEGIN
  -- Get workspace_id from credit card
  SELECT credit_card_workspace_id INTO workspace_id_val
  FROM credit_cards
  WHERE credit_card_id = card_id;

  IF workspace_id_val IS NULL THEN
    RAISE EXCEPTION 'Credit card not found';
  END IF;

  -- Get statement window
  SELECT * INTO window_data
  FROM compute_statement_window(period_start_param, card_id);

  -- Check if statement already exists
  SELECT id INTO statement_id
  FROM card_statements
  WHERE credit_card_id = card_id
    AND period_start = window_data.period_start
    AND period_end = window_data.period_end;

  -- Create statement if it doesn't exist
  IF statement_id IS NULL THEN
    INSERT INTO card_statements (
      workspace_id,
      credit_card_id,
      period_start,
      period_end,
      due_date,
      status
    ) VALUES (
      workspace_id_val,
      card_id,
      window_data.period_start,
      window_data.period_end,
      window_data.due_date,
      'open'
    )
    RETURNING id INTO statement_id;
  END IF;

  RETURN statement_id;
END;
$$;

-- Create RPC function: close_statement
CREATE OR REPLACE FUNCTION close_statement(
  statement_id uuid
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE card_statements
  SET 
    status = 'closed',
    closed_at = now()
  WHERE id = statement_id
    AND status = 'open';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Statement not found or already closed';
  END IF;
END;
$$;

-- Create RPC function: register_statement_payment
CREATE OR REPLACE FUNCTION register_statement_payment(
  statement_id uuid,
  amount_param numeric(14,2),
  paid_at_param date,
  method_param text
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  workspace_id_val uuid;
  card_id_val uuid;
  current_payments numeric(14,2);
  statement_amount_val numeric(14,2);
  new_status text;
BEGIN
  -- Get statement info
  SELECT workspace_id, credit_card_id, payments_total, statement_amount
  INTO workspace_id_val, card_id_val, current_payments, statement_amount_val
  FROM card_statements
  WHERE id = statement_id;

  IF workspace_id_val IS NULL THEN
    RAISE EXCEPTION 'Statement not found';
  END IF;

  -- Insert payment record
  INSERT INTO statement_payments (
    workspace_id,
    card_statement_id,
    amount,
    paid_at,
    method
  ) VALUES (
    workspace_id_val,
    statement_id,
    amount_param,
    paid_at_param,
    method_param
  );

  -- Insert payment item (negative amount)
  INSERT INTO statement_items (
    workspace_id,
    card_statement_id,
    credit_card_id,
    type,
    occurred_at,
    description,
    amount
  ) VALUES (
    workspace_id_val,
    statement_id,
    card_id_val,
    'payment',
    paid_at_param,
    'Pagamento - ' || method_param,
    -amount_param
  );

  -- Update statement totals
  UPDATE card_statements
  SET 
    payments_total = payments_total + amount_param,
    paid_at = CASE 
      WHEN paid_at IS NULL THEN paid_at_param 
      ELSE paid_at 
    END
  WHERE id = statement_id;

  -- Determine new status
  SELECT payments_total INTO current_payments
  FROM card_statements
  WHERE id = statement_id;

  IF current_payments >= statement_amount_val THEN
    new_status := 'paid_full';
  ELSIF current_payments > 0 THEN
    new_status := 'paid_partial';
  ELSE
    new_status := 'closed';
  END IF;

  -- Update status
  UPDATE card_statements
  SET status = new_status
  WHERE id = statement_id;
END;
$$;

-- Create RPC function: move_item_to_next_cycle
CREATE OR REPLACE FUNCTION move_item_to_next_cycle(
  statement_item_id uuid
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  item_data record;
  next_period_start date;
  next_statement_id uuid;
BEGIN
  -- Get item data
  SELECT * INTO item_data
  FROM statement_items
  WHERE id = statement_item_id;

  IF item_data IS NULL THEN
    RAISE EXCEPTION 'Statement item not found';
  END IF;

  -- Calculate next period start (add 1 month to current period)
  SELECT period_start + interval '1 month' INTO next_period_start
  FROM card_statements
  WHERE id = item_data.card_statement_id;

  -- Ensure next statement exists
  SELECT ensure_open_statement(item_data.credit_card_id, next_period_start) INTO next_statement_id;

  -- Move item to next statement
  UPDATE statement_items
  SET 
    card_statement_id = next_statement_id,
    occurred_at = next_period_start
  WHERE id = statement_item_id;
END;
$$;

-- Create RPC function: sync_item_from_transaction
CREATE OR REPLACE FUNCTION sync_item_from_transaction(
  transaction_id uuid
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  trans_data record;
  statement_id uuid;
  item_type text;
BEGIN
  -- Get transaction data
  SELECT 
    t.*,
    cc.credit_card_workspace_id as workspace_id
  INTO trans_data
  FROM transactions t
  LEFT JOIN credit_cards cc ON cc.credit_card_id = t.transaction_card_id
  WHERE t.transaction_id = sync_item_from_transaction.transaction_id;

  IF trans_data IS NULL OR trans_data.transaction_card_id IS NULL THEN
    RETURN; -- Not a credit card transaction
  END IF;

  -- Determine item type
  IF trans_data.installment_number IS NOT NULL THEN
    item_type := 'installment';
  ELSE
    item_type := 'purchase';
  END IF;

  -- Ensure statement exists for this transaction
  SELECT ensure_open_statement(trans_data.transaction_card_id, trans_data.transaction_date) INTO statement_id;

  -- Insert or update statement item
  INSERT INTO statement_items (
    workspace_id,
    card_statement_id,
    credit_card_id,
    transaction_id,
    type,
    occurred_at,
    description,
    amount,
    category_id,
    cost_center_id
  ) VALUES (
    trans_data.workspace_id,
    statement_id,
    trans_data.transaction_card_id,
    trans_data.transaction_id,
    item_type,
    trans_data.transaction_date,
    trans_data.transaction_description,
    trans_data.transaction_amount,
    trans_data.transaction_category_id,
    trans_data.transaction_cost_center_id
  )
  ON CONFLICT (card_statement_id, transaction_id)
  DO UPDATE SET
    type = EXCLUDED.type,
    occurred_at = EXCLUDED.occurred_at,
    description = EXCLUDED.description,
    amount = EXCLUDED.amount,
    category_id = EXCLUDED.category_id,
    cost_center_id = EXCLUDED.cost_center_id;
END;
$$;