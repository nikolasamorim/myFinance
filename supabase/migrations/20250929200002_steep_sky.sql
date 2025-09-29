create extension if not exists pgcrypto;

alter table if exists public.card_statements
  add column if not exists id uuid primary key default gen_random_uuid(),
  add column if not exists workspace_id uuid not null,
  add column if not exists credit_card_id uuid not null,
  add column if not exists period_start date not null,
  add column if not exists period_end date not null,
  add column if not exists due_date date not null,
  add column if not exists opening_balance numeric(14,2) not null default 0,
  add column if not exists purchases_total numeric(14,2) not null default 0,
  add column if not exists installments_total numeric(14,2) not null default 0,
  add column if not exists refunds_total numeric(14,2) not null default 0,
  add column if not exists payments_total numeric(14,2) not null default 0,
  add column if not exists statement_amount numeric(14,2) not null default 0,
  add column if not exists min_payment_amount numeric(14,2) not null default 0,
  add column if not exists status text not null default 'open',
  add column if not exists is_overdue boolean not null default false,
  add column if not exists closed_at timestamptz null,
  add column if not exists paid_at timestamptz null,
  add column if not exists created_at timestamptz not null default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname='card_statements_status_check') then
    alter table public.card_statements
      add constraint card_statements_status_check check (status in ('open','closed','paid_partial','paid_full'));
  end if;
  if to_regclass('public.uq_card_statements_period') is null then
    create unique index uq_card_statements_period on public.card_statements (credit_card_id, period_start, period_end);
  end if;
  if to_regclass('public.idx_card_statements_ws_card_status') is null then
    create index idx_card_statements_ws_card_status on public.card_statements (workspace_id, credit_card_id, status);
  end if;
  if to_regclass('public.idx_card_statements_due') is null then
    create index idx_card_statements_due on public.card_statements (due_date);
  end if;
end $$;

alter table if exists public.statement_items
  add column if not exists id uuid primary key default gen_random_uuid(),
  add column if not exists workspace_id uuid not null,
  add column if not exists card_statement_id uuid not null,
  add column if not exists credit_card_id uuid not null,
  add column if not exists transaction_id uuid null,
  add column if not exists type text not null,
  add column if not exists occurred_at date not null,
  add column if not exists description text not null,
  add column if not exists amount numeric(14,2) not null,
  add column if not exists category_id uuid null,
  add column if not exists cost_center_id uuid null,
  add column if not exists created_at timestamptz not null default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname='statement_items_type_check') then
    alter table public.statement_items
      add constraint statement_items_type_check check (type in ('purchase','installment','refund','payment','adjustment'));
  end if;
  if to_regclass('public.idx_statement_items_stmt') is null then
    create index idx_statement_items_stmt on public.statement_items (card_statement_id);
  end if;
  if to_regclass('public.idx_statement_items_card_date') is null then
    create index idx_statement_items_card_date on public.statement_items (credit_card_id, occurred_at);
  end if;
  if to_regclass('public.uq_statement_items_stmt_tx') is null then
    create unique index uq_statement_items_stmt_tx on public.statement_items (card_statement_id, transaction_id) where transaction_id is not null;
  end if;
end $$;

alter table if exists public.statement_payments
  add column if not exists id uuid primary key default gen_random_uuid(),
  add column if not exists workspace_id uuid not null,
  add column if not exists card_statement_id uuid not null,
  add column if not exists amount numeric(14,2) not null,
  add column if not exists paid_at date not null,
  add column if not exists method text not null,
  add column if not exists created_at timestamptz not null default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname='statement_payments_method_check') then
    alter table public.statement_payments
      add constraint statement_payments_method_check check (method in ('pix','boleto','ted','dda'));
  end if;
  if to_regclass('public.idx_statement_payments_stmt_paid') is null then
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
  elsif exists (select 1 from pg_tables where schemaname='public' and tablename='workspace_members') then
    mtable := 'public.workspace_members';
  elsif exists (select 1 from pg_tables where schemaname='public' and tablename='memberships') then
    mtable := 'public.memberships';
  end if;

  if mtable is not null then
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name=split_part(mtable,'.',2) and column_name='member_user_id') then
      ucol := 'member_user_id';
    end if;
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
        mtable, wscol, wscol, ucol, case when has_active then 'and m.is_active' else '' end,
        mtable, wscol, wscol, ucol, case when has_active then 'and m.is_active' else '' end
      );
    end if;

    if not exists (select 1 from pg_policies where schemaname='public' and tablename='statement_items' and policyname='workspace_si') then
      execute format(
        'create policy workspace_si on public.statement_items for all
           using (exists (select 1 from %s m where m.%I = statement_items.%I and m.%I = auth.uid() %s))
           with check (exists (select 1 from %s m where m.%I = statement_items.%I and m.%I = auth.uid() %s))',
        mtable, wscol, wscol, ucol, case when has_active then 'and m.is_active' else '' end,
        mtable, wscol, wscol, ucol, case when has_active then 'and m.is_active' else '' end
      );
    end if;

    if not exists (select 1 from pg_policies where schemaname='public' and tablename='statement_payments' and policyname='workspace_sp') then
      execute format(
        'create policy workspace_sp on public.statement_payments for all
           using (exists (select 1 from %s m where m.%I = statement_payments.%I and m.%I = auth.uid() %s))
           with check (exists (select 1 from %s m where m.%I = statement_payments.%I and m.%I = auth.uid() %s))',
        mtable, wscol, wscol, ucol, case when has_active then 'and m.is_active' else '' end,
        mtable, wscol, wscol, ucol, case when has_active then 'and m.is_active' else '' end
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