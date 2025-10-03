/*
  # Fix card statements tables creation (v2)

  1. New Tables
    - `card_statements` - Credit card billing statements
      - `id` (uuid, primary key)
      - `workspace_id` (uuid, not null) - References workspaces
      - `credit_card_id` (uuid, not null) - References credit_cards
      - `period_start` (date, not null) - Statement period start
      - `period_end` (date, not null) - Statement period end
      - `due_date` (date, not null) - Payment due date
      - `opening_balance` (numeric) - Balance at period start
      - `purchases_total` (numeric) - Total purchases amount
      - `installments_total` (numeric) - Total installments amount
      - `refunds_total` (numeric) - Total refunds amount
      - `payments_total` (numeric) - Total payments amount
      - `statement_amount` (numeric) - Final statement amount
      - `min_payment_amount` (numeric) - Minimum payment required
      - `status` (text) - Statement status
      - `is_overdue` (boolean) - Whether statement is overdue
      - `closed_at` (timestamptz) - When statement was closed
      - `paid_at` (timestamptz) - When statement was paid
      - `created_at` (timestamptz) - Record creation timestamp

    - `statement_items` - Individual transactions in a statement
      - `id` (uuid, primary key)
      - `workspace_id` (uuid, not null)
      - `card_statement_id` (uuid, not null) - References card_statements
      - `credit_card_id` (uuid, not null) - References credit_cards
      - `transaction_id` (uuid) - Optional reference to transaction
      - `type` (text) - Item type (purchase, installment, refund, etc.)
      - `occurred_at` (date) - When transaction occurred
      - `description` (text) - Transaction description
      - `amount` (numeric) - Transaction amount
      - `category_id` (uuid) - Optional category reference
      - `cost_center_id` (uuid) - Optional cost center reference
      - `created_at` (timestamptz)

    - `statement_payments` - Payments made towards statements
      - `id` (uuid, primary key)
      - `workspace_id` (uuid, not null)
      - `card_statement_id` (uuid, not null) - References card_statements
      - `amount` (numeric) - Payment amount
      - `paid_at` (date) - Payment date
      - `method` (text) - Payment method (pix, boleto, ted, dda)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all three tables
    - Add workspace-based access policies using correct column names
*/

-- Enable pgcrypto extension for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create card_statements table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.card_statements (
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
  status text NOT NULL DEFAULT 'open',
  is_overdue boolean NOT NULL DEFAULT false,
  closed_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add constraints and indexes for card_statements
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='card_statements_status_check') THEN
    ALTER TABLE public.card_statements
      ADD CONSTRAINT card_statements_status_check CHECK (status IN ('open','closed','paid_partial','paid_full'));
  END IF;
  
  IF to_regclass('public.uq_card_statements_period') IS NULL THEN
    CREATE UNIQUE INDEX uq_card_statements_period ON public.card_statements (credit_card_id, period_start, period_end);
  END IF;
  
  IF to_regclass('public.idx_card_statements_ws_card_status') IS NULL THEN
    CREATE INDEX idx_card_statements_ws_card_status ON public.card_statements (workspace_id, credit_card_id, status);
  END IF;
  
  IF to_regclass('public.idx_card_statements_due') IS NULL THEN
    CREATE INDEX idx_card_statements_due ON public.card_statements (due_date);
  END IF;
END $$;

-- Create statement_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.statement_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  card_statement_id uuid NOT NULL,
  credit_card_id uuid NOT NULL,
  transaction_id uuid,
  type text NOT NULL,
  occurred_at date NOT NULL,
  description text NOT NULL,
  amount numeric(14,2) NOT NULL,
  category_id uuid,
  cost_center_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add constraints and indexes for statement_items
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='statement_items_type_check') THEN
    ALTER TABLE public.statement_items
      ADD CONSTRAINT statement_items_type_check CHECK (type IN ('purchase','installment','refund','payment','adjustment'));
  END IF;
  
  IF to_regclass('public.idx_statement_items_stmt') IS NULL THEN
    CREATE INDEX idx_statement_items_stmt ON public.statement_items (card_statement_id);
  END IF;
  
  IF to_regclass('public.idx_statement_items_card_date') IS NULL THEN
    CREATE INDEX idx_statement_items_card_date ON public.statement_items (credit_card_id, occurred_at);
  END IF;
  
  IF to_regclass('public.uq_statement_items_stmt_tx') IS NULL THEN
    CREATE UNIQUE INDEX uq_statement_items_stmt_tx ON public.statement_items (card_statement_id, transaction_id) WHERE transaction_id IS NOT NULL;
  END IF;
END $$;

-- Create statement_payments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.statement_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  card_statement_id uuid NOT NULL,
  amount numeric(14,2) NOT NULL,
  paid_at date NOT NULL,
  method text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add constraints and indexes for statement_payments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='statement_payments_method_check') THEN
    ALTER TABLE public.statement_payments
      ADD CONSTRAINT statement_payments_method_check CHECK (method IN ('pix','boleto','ted','dda'));
  END IF;
  
  IF to_regclass('public.idx_statement_payments_stmt_paid') IS NULL THEN
    CREATE INDEX idx_statement_payments_stmt_paid ON public.statement_payments (card_statement_id, paid_at);
  END IF;
END $$;

-- Enable RLS on all tables
ALTER TABLE public.card_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statement_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statement_payments ENABLE ROW LEVEL SECURITY;

-- Add foreign key constraints
DO $$
DECLARE
  ws_pk text;
  cc_pk text;
BEGIN
  -- Determine workspace primary key column name
  IF to_regclass('public.workspaces') IS NOT NULL THEN
    SELECT CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='workspaces' AND column_name='workspace_id')
                THEN 'workspace_id' ELSE 'id' END INTO ws_pk;
  END IF;
  
  -- Determine credit_cards primary key column name
  IF to_regclass('public.credit_cards') IS NOT NULL THEN
    SELECT CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='credit_cards' AND column_name='credit_card_id')
                THEN 'credit_card_id' ELSE 'id' END INTO cc_pk;
  END IF;

  -- Add foreign keys for card_statements
  IF ws_pk IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='card_statements_workspace_id_fkey') THEN
    EXECUTE format('ALTER TABLE public.card_statements ADD CONSTRAINT card_statements_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(%I) ON DELETE CASCADE', ws_pk);
  END IF;
  
  IF cc_pk IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='card_statements_credit_card_id_fkey') THEN
    EXECUTE format('ALTER TABLE public.card_statements ADD CONSTRAINT card_statements_credit_card_id_fkey FOREIGN KEY (credit_card_id) REFERENCES public.credit_cards(%I) ON DELETE CASCADE', cc_pk);
  END IF;

  -- Add foreign keys for statement_items
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='statement_items_card_statement_id_fkey') THEN
    ALTER TABLE public.statement_items ADD CONSTRAINT statement_items_card_statement_id_fkey FOREIGN KEY (card_statement_id) REFERENCES public.card_statements(id) ON DELETE CASCADE;
  END IF;
  
  IF cc_pk IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='statement_items_credit_card_id_fkey') THEN
    EXECUTE format('ALTER TABLE public.statement_items ADD CONSTRAINT statement_items_credit_card_id_fkey FOREIGN KEY (credit_card_id) REFERENCES public.credit_cards(%I) ON DELETE CASCADE', cc_pk);
  END IF;

  -- Add foreign keys for statement_payments
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='statement_payments_card_statement_id_fkey') THEN
    ALTER TABLE public.statement_payments ADD CONSTRAINT statement_payments_card_statement_id_fkey FOREIGN KEY (card_statement_id) REFERENCES public.card_statements(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create RLS policies with correct column names
DO $$
DECLARE
  mtable text := NULL;
  ucol   text := 'user_id';
  wscol  text := 'workspace_id';
  has_active boolean := false;
BEGIN
  -- Determine which membership table exists and its column names
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='workspace_users') THEN
    mtable := 'public.workspace_users';
    -- Check for prefixed columns
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='workspace_users' AND column_name='workspace_user_workspace_id') THEN
      wscol := 'workspace_user_workspace_id';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='workspace_users' AND column_name='workspace_user_user_id') THEN
      ucol := 'workspace_user_user_id';
    END IF;
  ELSIF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='workspace_members') THEN
    mtable := 'public.workspace_members';
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='workspace_members' AND column_name='member_user_id') THEN
      ucol := 'member_user_id';
    END IF;
  ELSIF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='memberships') THEN
    mtable := 'public.memberships';
  END IF;

  -- Check for is_active column
  IF mtable IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=split_part(mtable,'.',2) AND column_name='is_active') THEN
      has_active := true;
    END IF;
  END IF;

  -- Drop old development policies if they exist
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='card_statements' AND policyname='dev_all_cs') THEN
    DROP POLICY dev_all_cs ON public.card_statements;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='statement_items' AND policyname='dev_all_si') THEN
    DROP POLICY dev_all_si ON public.statement_items;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='statement_payments' AND policyname='dev_all_sp') THEN
    DROP POLICY dev_all_sp ON public.statement_payments;
  END IF;

  -- Create policies based on whether membership table exists
  IF mtable IS NULL THEN
    -- No membership table - allow all authenticated users
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='card_statements' AND policyname='workspace_any_cs') THEN
      CREATE POLICY workspace_any_cs ON public.card_statements FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='statement_items' AND policyname='workspace_any_si') THEN
      CREATE POLICY workspace_any_si ON public.statement_items FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='statement_payments' AND policyname='workspace_any_sp') THEN
      CREATE POLICY workspace_any_sp ON public.statement_payments FOR ALL USING (true) WITH CHECK (true);
    END IF;
  ELSE
    -- Membership table exists - restrict to workspace members
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='card_statements' AND policyname='workspace_cs') THEN
      EXECUTE format(
        'CREATE POLICY workspace_cs ON public.card_statements FOR ALL
           USING (EXISTS (SELECT 1 FROM %s m WHERE m.%I = card_statements.workspace_id AND m.%I = auth.uid() %s))
           WITH CHECK (EXISTS (SELECT 1 FROM %s m WHERE m.%I = card_statements.workspace_id AND m.%I = auth.uid() %s))',
        mtable, wscol, ucol, CASE WHEN has_active THEN 'AND m.is_active' ELSE '' END,
        mtable, wscol, ucol, CASE WHEN has_active THEN 'AND m.is_active' ELSE '' END
      );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='statement_items' AND policyname='workspace_si') THEN
      EXECUTE format(
        'CREATE POLICY workspace_si ON public.statement_items FOR ALL
           USING (EXISTS (SELECT 1 FROM %s m WHERE m.%I = statement_items.workspace_id AND m.%I = auth.uid() %s))
           WITH CHECK (EXISTS (SELECT 1 FROM %s m WHERE m.%I = statement_items.workspace_id AND m.%I = auth.uid() %s))',
        mtable, wscol, ucol, CASE WHEN has_active THEN 'AND m.is_active' ELSE '' END,
        mtable, wscol, ucol, CASE WHEN has_active THEN 'AND m.is_active' ELSE '' END
      );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='statement_payments' AND policyname='workspace_sp') THEN
      EXECUTE format(
        'CREATE POLICY workspace_sp ON public.statement_payments FOR ALL
           USING (EXISTS (SELECT 1 FROM %s m WHERE m.%I = statement_payments.workspace_id AND m.%I = auth.uid() %s))
           WITH CHECK (EXISTS (SELECT 1 FROM %s m WHERE m.%I = statement_payments.workspace_id AND m.%I = auth.uid() %s))',
        mtable, wscol, ucol, CASE WHEN has_active THEN 'AND m.is_active' ELSE '' END,
        mtable, wscol, ucol, CASE WHEN has_active THEN 'AND m.is_active' ELSE '' END
      );
    END IF;
  END IF;
END $$;