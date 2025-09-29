create extension if not exists pgcrypto;

create table if not exists public.card_statements (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  credit_card_id uuid not null,
  period_start date not null,
  period_end date not null,
  due_date date not null,
  opening_balance numeric(14,2) not null default 0,
  purchases_total numeric(14,2) not null default 0,
  installments_total numeric(14,2) not null default 0,
  refunds_total numeric(14,2) not null default 0,
  payments_total numeric(14,2) not null default 0,
  statement_amount numeric(14,2) not null default 0,
  min_payment_amount numeric(14,2) not null default 0,
  status text not null default 'open',
  is_overdue boolean not null default false,
  closed_at timestamptz null,
  paid_at timestamptz null,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from information_schema.columns where table_name='card_statements' and column_name='workspace_id') then
    alter table public.card_statements add column workspace_id uuid not null;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='card_statements' and column_name='credit_card_id') then
    alter table public.card_statements add column credit_card_id uuid not null;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='card_statements' and column_name='period_start') then
    alter table public.card_statements add column period_start date not null;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='card_statements' and column_name='period_end') then
    alter table public.card_statements add column period_end date not null;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='card_statements' and column_name='due_date') then
    alter table public.card_statements add column due_date date not null;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='card_statements' and column_name='opening_balance') then
    alter table public.card_statements add column opening_balance numeric(14,2) not null default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='card_statements' and column_name='purchases_total') then
    alter table public.card_statements add column purchases_total numeric(14,2) not null default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='card_statements' and column_name='installments_total') then
    alter table public.card_statements add column installments_total numeric(14,2) not null default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='card_statements' and column_name='refunds_total') then
    alter table public.card_statements add column refunds_total numeric(14,2) not null default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='card_statements' and column_name='payments_total') then
    alter table public.card_statements add column payments_total numeric(14,2) not null default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='card_statements' and column_name='statement_amount') then
    alter table public.card_statements add column statement_amount numeric(14,2) not null default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='card_statements' and column_name='min_payment_amount') then
    alter table public.card_statements add column min_payment_amount numeric(14,2) not null default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='card_statements' and column_name='status') then
    alter table public.card_statements add column status text not null default 'open';
  end if;
  if not exists (select 1 from information_schema.columns where table_name='card_statements' and column_name='is_overdue') then
    alter table public.card_statements add column is_overdue boolean not null default false;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='card_statements' and column_name='closed_at') then
    alter table public.card_statements add column closed_at timestamptz null;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='card_statements' and column_name='paid_at') then
    alter table public.card_statements add column paid_at timestamptz null;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='card_statements' and column_name='created_at') then
    alter table public.card_statements add column created_at timestamptz not null default now();
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='card_statements_status_check') then
    alter table public.card_statements add constraint card_statements_status_check check (status in ('open','closed','paid_partial','paid_full'));
  end if;
  if not exists (select 1 from pg_class where relname='card_statements_credit_card_id_period_start_period_end_key') then
    create unique index card_statements_credit_card_id_period_start_period_end_key on public.card_statements (credit_card_id, period_start, period_end);
  end if;
  if not exists (select 1 from pg_class where relname='idx_card_statements_ws_card_status') then
    create index idx_card_statements_ws_card_status on public.card_statements (workspace_id, credit_card_id, status);
  end if;
  if not exists (select 1 from pg_class where relname='idx_card_statements_due') then
    create index idx_card_statements_due on public.card_statements (due_date);
  end if;
end $$;

create table if not exists public.statement_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  card_statement_id uuid not null,
  credit_card_id uuid not null,
  transaction_id uuid null,
  type text not null,
  occurred_at date not null,
  description text not null,
  amount numeric(14,2) not null,
  category_id uuid null,
  cost_center_id uuid null,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from information_schema.columns where table_name='statement_items' and column_name='workspace_id') then
    alter table public.statement_items add column workspace_id uuid not null;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='statement_items' and column_name='card_statement_id') then
    alter table public.statement_items add column card_statement_id uuid not null;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='statement_items' and column_name='credit_card_id') then
    alter table public.statement_items add column credit_card_id uuid not null;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='statement_items' and column_name='transaction_id') then
    alter table public.statement_items add column transaction_id uuid null;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='statement_items' and column_name='type') then
    alter table public.statement_items add column type text not null;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='statement_items' and column_name='occurred_at') then
    alter table public.statement_items add column occurred_at date not null;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='statement_items' and column_name='description') then
    alter table public.statement_items add column description text not null;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='statement_items' and column_name='amount') then
    alter table public.statement_items add column amount numeric(14,2) not null;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='statement_items' and column_name='category_id') then
    alter table public.statement_items add column category_id uuid null;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='statement_items' and column_name='cost_center_id') then
    alter table public.statement_items add column cost_center_id uuid null;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='statement_items' and column_name='created_at') then
    alter table public.statement_items add column created_at timestamptz not null default now();
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='statement_items_type_check') then
    alter table public.statement_items add constraint statement_items_type_check check (type in ('purchase','installment','refund','payment','adjustment'));
  end if;
  if not exists (select 1 from pg_class where relname='idx_statement_items_stmt') then
    create index idx_statement_items_stmt on public.statement_items (card_statement_id);
  end if;
  if not exists (select 1 from pg_class where relname='idx_statement_items_card_date') then
    create index idx_statement_items_card_date on public.statement_items (credit_card_id, occurred_at);
  end if;
  if not exists (select 1 from pg_class where relname='uq_statement_items_stmt_tx') then
    create unique index uq_statement_items_stmt_tx on public.statement_items (card_statement_id, transaction_id) where transaction_id is not null;
  end if;
end $$;

create table if not exists public.statement_payments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  card_statement_id uuid not null,
  amount numeric(14,2) not null,
  paid_at date not null,
  method text not null,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from information_schema.columns where table_name='statement_payments' and column_name='workspace_id') then
    alter table public.statement_payments add column workspace_id uuid not null;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='statement_payments' and column_name='card_statement_id') then
    alter table public.statement_payments add column card_statement_id uuid not null;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='statement_payments' and column_name='amount') then
    alter table public.statement_payments add column amount numeric(14,2) not null;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='statement_payments' and column_name='paid_at') then
    alter table public.statement_payments add column paid_at date not null;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='statement_payments' and column_name='method') then
    alter table public.statement_payments add column method text not null;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='statement_payments' and column_name='created_at') then
    alter table public.statement_payments add column created_at timestamptz not null default now();
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='statement_payments_method_check') then
    alter table public.statement_payments add constraint statement_payments_method_check check (method in ('pix','boleto','ted','dda'));
  end if;
  if not exists (select 1 from pg_class where relname='idx_statement_payments_stmt_paid') then
    create index idx_statement_payments_stmt_paid on public.statement_payments (card_statement_id, paid_at);
  end if;
end $$;

alter table public.card_statements enable row level security;
alter table public.statement_items enable row level security;
alter table public.statement_payments enable row level security;

do $$
declare
  mtable text := null;
  ucol   text := 'user_id';
  wscol  text := 'workspace_id';
  has_active boolean := false;
begin
  if exists (select 1 from pg_tables where schemaname='public' and tablename='workspace_users') then
    mtable := 'public.workspace_users';
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='workspace_users' and column_name='workspace_user_user_id') then
      ucol := 'workspace_user_user_id';
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='workspace_users' and column_name='workspace_user_workspace_id') then
      wscol := 'workspace_user_workspace_id';
    end if;
  elsif exists (select 1 from pg_tables where schemaname='public' and tablename='workspace_members') then
    mtable := 'public.workspace_members';
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='workspace_members' and column_name='member_user_id') then
      ucol := 'member_user_id';
    end if;
  elsif exists (select 1 from pg_tables where schemaname='public' and tablename='memberships') then
    mtable := 'public.memberships';
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='memberships' and column_name='member_user_id') then
      ucol := 'member_user_id';
    end if;
  end if;

  if mtable is not null then
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name=split_part(mtable,'.',2) and column_name='is_active') then
      has_active := true;
    end if;
  end if;

  if exists (select 1 from pg_policies where schemaname='public' and tablename='card_statements' and policyname='dev_all_cs') then
    drop policy dev_all_cs on public.card_statements;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='statement_items' and policyname='dev_all_si') then
    drop policy dev_all_si on public.statement_items;
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='statement_payments' and policyname='dev_all_sp') then
    drop policy dev_all_sp on public.statement_payments;
  end if;

  if mtable is null then
    if not exists (select 1 from pg_policies where schemaname='public' and tablename='card_statements' and policyname='workspace_any_cs') then
      create policy workspace_any_cs on public.card_statements for all using (true) with check (true);
    end if;
    if not exists (select 1 from pg_policies where schemaname='public' and tablename='statement_items' and policyname='workspace_any_si') then
      create policy workspace_any_si on public.statement_items for all using (true) with check (true);
    end if;
    if not exists (select 1 from pg_policies where schemaname='public' and tablename='statement_payments' and policyname='workspace_any_sp') then
      create policy workspace_any_sp on public.statement_payments for all using (true) with check (true);
    end if;
  else
    if not exists (select 1 from pg_policies where schemaname='public' and tablename='card_statements' and policyname='workspace_cs') then
      execute format(
        'create policy workspace_cs on public.card_statements for all
           using (exists (select 1 from %s m where m.%I = card_statements.%I and m.%I = auth.uid() %s))
           with check (exists (select 1 from %s m where m.%I = card_statements.%I and m.%I = auth.uid() %s))',
        mtable, wscol, 'workspace_id', ucol, case when has_active then 'and m.is_active' else '' end,
        mtable, wscol, 'workspace_id', ucol, case when has_active then 'and m.is_active' else '' end
      );
    end if;

    if not exists (select 1 from pg_policies where schemaname='public' and tablename='statement_items' and policyname='workspace_si') then
      execute format(
        'create policy workspace_si on public.statement_items for all
           using (exists (select 1 from %s m where m.%I = statement_items.%I and m.%I = auth.uid() %s))
           with check (exists (select 1 from %s m where m.%I = statement_items.%I and m.%I = auth.uid() %s))',
        mtable, wscol, 'workspace_id', ucol, case when has_active then 'and m.is_active' else '' end,
        mtable, wscol, 'workspace_id', ucol, case when has_active then 'and m.is_active' else '' end
      );
    end if;

    if not exists (select 1 from pg_policies where schemaname='public' and tablename='statement_payments' and policyname='workspace_sp') then
      execute format(
        'create policy workspace_sp on public.statement_payments for all
           using (exists (select 1 from %s m where m.%I = statement_payments.%I and m.%I = auth.uid() %s))
           with check (exists (select 1 from %s m where m.%I = statement_payments.%I and m.%I = auth.uid() %s))',
        mtable, wscol, 'workspace_id', ucol, case when has_active then 'and m.is_active' else '' end,
        mtable, wscol, 'workspace_id', ucol, case when has_active then 'and m.is_active' else '' end
      );
    end if;
  end if;
end $$;

do $$
declare
  ws_pk text;
  cc_pk text;
begin
  if to_regclass('public.workspaces') is not null then
    select case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='workspaces' and column_name='workspace_id')
                then 'workspace_id' else 'id' end into ws_pk;
  end if;
  if to_regclass('public.credit_cards') is not null then
    select case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='credit_cards' and column_name='credit_card_id')
                then 'credit_card_id' else 'id' end into cc_pk;
  end if;

  if to_regclass('public.card_statements') is not null then
    if ws_pk is not null and not exists (select 1 from pg_constraint where conname='card_statements_workspace_id_fkey') then
      execute format('alter table public.card_statements add constraint card_statements_workspace_id_fkey foreign key (workspace_id) references public.workspaces(%I) on delete cascade', ws_pk);
    end if;
    if cc_pk is not null and not exists (select 1 from pg_constraint where conname='card_statements_credit_card_id_fkey') then
      execute format('alter table public.card_statements add constraint card_statements_credit_card_id_fkey foreign key (credit_card_id) references public.credit_cards(%I) on delete cascade', cc_pk);
    end if;
  end if;

  if to_regclass('public.statement_items') is not null then
    if not exists (select 1 from pg_constraint where conname='statement_items_card_statement_id_fkey') then
      alter table public.statement_items add constraint statement_items_card_statement_id_fkey foreign key (card_statement_id) references public.card_statements(id) on delete cascade;
    end if;
    if cc_pk is not null and not exists (select 1 from pg_constraint where conname='statement_items_credit_card_id_fkey') then
      execute format('alter table public.statement_items add constraint statement_items_credit_card_id_fkey foreign key (credit_card_id) references public.credit_cards(%I) on delete cascade', cc_pk);
    end if;
  end if;

  if to_regclass('public.statement_payments') is not null then
    if not exists (select 1 from pg_constraint where conname='statement_payments_card_statement_id_fkey') then
      alter table public.statement_payments add constraint statement_payments_card_statement_id_fkey foreign key (card_statement_id) references public.card_statements(id) on delete cascade;
    end if;
  end if;
end $$;