/*
  # RPC dashboard_summary — agregação do dashboard no banco

  Contexto (Item 3 do plano de escala): a rota /dashboard puxava TODAS as
  transações do workspace (com 4 joins) e agregava em JS, sem limite. Esta RPC
  move a agregação (summary + monthlyBreakdown) para SQL, retornando apenas os
  números. A rota passa a buscar só as 50 transações recentes (com joins) à parte.

  Contrato preservado (ver apps/web/src/services/dashboard.service.ts):
  - summary: { balancePaid, income{paid,unpaid}, expenses{paid,unpaid}, invested{paid,unpaid} }
  - paidSummary: { currentBalance, totalIncome, totalExpenses, totalDebts }
  - monthlyBreakdown: { 'YYYY-MM': { income, expense, debtIn, debtOut } }
    (debtIn/debtOut mantidos em 0 para reproduzir o comportamento atual)

  SECURITY INVOKER (padrão): roda com o RLS do usuário chamador — a agregação
  só enxerga as transações que o usuário pode ver. NÃO usar SECURITY DEFINER.

  Definições de negócio (idênticas à rota atual):
  - pago = transaction_status IN ('paid','received')
  - investido = transaction_type IN ('investment','debt')
*/

CREATE OR REPLACE FUNCTION public.dashboard_summary(
  p_workspace_id uuid,
  p_start        date    DEFAULT NULL,
  p_end          date    DEFAULT NULL,
  p_search       text    DEFAULT NULL,
  p_status       text[]  DEFAULT NULL,
  p_type         text[]  DEFAULT NULL,
  p_account      uuid    DEFAULT NULL,
  p_category     uuid    DEFAULT NULL,
  p_cost_center  uuid    DEFAULT NULL,
  p_credit_card  uuid    DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
WITH filtered AS (
  SELECT
    t.transaction_amount::numeric                          AS amt,
    t.transaction_type                                     AS type,
    (t.transaction_status IN ('paid','received'))          AS is_paid,
    to_char(t.transaction_date, 'YYYY-MM')                 AS ym
  FROM transactions t
  WHERE t.transaction_workspace_id = p_workspace_id
    AND (p_start       IS NULL OR t.transaction_date >= p_start)
    AND (p_end         IS NULL OR t.transaction_date <= p_end)
    AND (p_search      IS NULL OR t.transaction_description ILIKE '%' || p_search || '%')
    AND (p_status      IS NULL OR t.transaction_status = ANY(p_status))
    AND (p_type        IS NULL OR t.transaction_type = ANY(p_type))
    AND (p_account     IS NULL OR t.transaction_bank_id = p_account)
    AND (p_category    IS NULL OR t.transaction_category_id = p_category)
    AND (p_cost_center IS NULL OR t.transaction_cost_center_id = p_cost_center)
    AND (p_credit_card IS NULL OR t.transaction_card_id = p_credit_card)
),
agg AS (
  SELECT
    COALESCE(SUM(amt) FILTER (WHERE is_paid     AND type = 'income'),                  0) AS paid_income,
    COALESCE(SUM(amt) FILTER (WHERE is_paid     AND type = 'expense'),                 0) AS paid_expense,
    COALESCE(SUM(amt) FILTER (WHERE is_paid     AND type IN ('investment','debt')),    0) AS paid_invested,
    COALESCE(SUM(amt) FILTER (WHERE NOT is_paid AND type = 'income'),                  0) AS unpaid_income,
    COALESCE(SUM(amt) FILTER (WHERE NOT is_paid AND type = 'expense'),                 0) AS unpaid_expense,
    COALESCE(SUM(amt) FILTER (WHERE NOT is_paid AND type IN ('investment','debt')),    0) AS unpaid_invested
  FROM filtered
),
monthly AS (
  SELECT ym,
    COALESCE(SUM(amt) FILTER (WHERE type = 'income'),  0) AS income,
    COALESCE(SUM(amt) FILTER (WHERE type = 'expense'), 0) AS expense
  FROM filtered
  GROUP BY ym
)
SELECT jsonb_build_object(
  'summary', jsonb_build_object(
    'balancePaid', a.paid_income - a.paid_expense,
    'income',   jsonb_build_object('paid', a.paid_income,   'unpaid', a.unpaid_income),
    'expenses', jsonb_build_object('paid', a.paid_expense,  'unpaid', a.unpaid_expense),
    'invested', jsonb_build_object('paid', a.paid_invested, 'unpaid', a.unpaid_invested)
  ),
  'paidSummary', jsonb_build_object(
    'currentBalance', a.paid_income - a.paid_expense,
    'totalIncome',    a.paid_income,
    'totalExpenses',  a.paid_expense,
    'totalDebts',     a.paid_invested
  ),
  'monthlyBreakdown', COALESCE((
    SELECT jsonb_object_agg(ym, jsonb_build_object('income', income, 'expense', expense, 'debtIn', 0, 'debtOut', 0))
    FROM monthly
  ), '{}'::jsonb)
)
FROM agg a;
$$;
