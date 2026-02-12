-- ============================================================================
-- DIAGNÓSTICO: Problema de Accounts não migrando entre Workspaces
-- ============================================================================

-- 1. VERIFICAR WORKSPACES DO USUÁRIO
-- Substitua 'USER_ID' pelo ID do usuário afetado
SELECT
  w.workspace_id,
  w.workspace_name,
  w.workspace_type,
  w.workspace_owner_user_id,
  w.workspace_created_at,
  -- Verifica se é owner ou membro
  CASE
    WHEN w.workspace_owner_user_id = 'USER_ID' THEN 'OWNER'
    ELSE 'MEMBER'
  END as user_role
FROM workspaces w
WHERE w.workspace_owner_user_id = 'USER_ID'
   OR EXISTS (
     SELECT 1 FROM workspace_users wu
     WHERE wu.workspace_user_workspace_id = w.workspace_id
       AND wu.workspace_user_user_id = 'USER_ID'
   )
ORDER BY w.workspace_created_at DESC;

-- 2. VERIFICAR ACCOUNTS POR WORKSPACE
-- Mostra quantos accounts existem em cada workspace
SELECT
  w.workspace_id,
  w.workspace_name,
  w.workspace_type,
  COUNT(a.id) as total_accounts,
  COALESCE(SUM(CASE WHEN a.type = 'cash' THEN 1 ELSE 0 END), 0) as cash_accounts,
  COALESCE(SUM(CASE WHEN a.type = 'bank' THEN 1 ELSE 0 END), 0) as bank_accounts,
  COALESCE(SUM(a.initial_balance), 0) as total_initial_balance
FROM workspaces w
LEFT JOIN accounts a ON a.workspace_id = w.workspace_id
WHERE w.workspace_owner_user_id = 'USER_ID'
   OR EXISTS (
     SELECT 1 FROM workspace_users wu
     WHERE wu.workspace_user_workspace_id = w.workspace_id
       AND wu.workspace_user_user_id = 'USER_ID'
   )
GROUP BY w.workspace_id, w.workspace_name, w.workspace_type
ORDER BY w.workspace_created_at DESC;

-- 3. LISTAR TODOS OS ACCOUNTS COM DETALHES
-- Mostra cada account e seu workspace associado
SELECT
  a.id as account_id,
  a.workspace_id,
  w.workspace_name,
  w.workspace_type,
  a.title as account_title,
  a.type as account_type,
  a.initial_balance,
  a.opened_at,
  a.created_at
FROM accounts a
JOIN workspaces w ON w.workspace_id = a.workspace_id
WHERE w.workspace_owner_user_id = 'USER_ID'
   OR EXISTS (
     SELECT 1 FROM workspace_users wu
     WHERE wu.workspace_user_workspace_id = w.workspace_id
       AND wu.workspace_user_user_id = 'USER_ID'
   )
ORDER BY a.created_at DESC;

-- 4. VERIFICAR POLÍTICAS RLS ATIVAS EM ACCOUNTS
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_expression,
  with_check
FROM pg_policies
WHERE tablename = 'accounts'
ORDER BY policyname;

-- 5. VERIFICAR SE HÁ TRANSACTIONS VINCULADAS A ACCOUNTS
-- IMPORTANTE: Não migre accounts que têm transactions vinculadas sem migrar as transactions também
SELECT
  a.id as account_id,
  a.title as account_title,
  a.workspace_id as account_workspace_id,
  w.workspace_name as account_workspace_name,
  COUNT(t.transaction_id) as total_transactions,
  MIN(t.transaction_date) as first_transaction_date,
  MAX(t.transaction_date) as last_transaction_date,
  SUM(CASE WHEN t.transaction_type = 'income' THEN t.transaction_amount ELSE 0 END) as total_income,
  SUM(CASE WHEN t.transaction_type = 'expense' THEN t.transaction_amount ELSE 0 END) as total_expenses
FROM accounts a
JOIN workspaces w ON w.workspace_id = a.workspace_id
LEFT JOIN transactions t ON t.transaction_bank_id = a.id
WHERE w.workspace_owner_user_id = 'USER_ID'
   OR EXISTS (
     SELECT 1 FROM workspace_users wu
     WHERE wu.workspace_user_workspace_id = w.workspace_id
       AND wu.workspace_user_user_id = 'USER_ID'
   )
GROUP BY a.id, a.title, a.workspace_id, w.workspace_name
ORDER BY total_transactions DESC;

-- 6. VERIFICAR RELACIONAMENTOS DE ACCOUNTS
-- Mostra todas as dependências que precisam ser consideradas na migração
SELECT
  'transactions' as table_name,
  COUNT(*) as count,
  a.workspace_id,
  w.workspace_name
FROM accounts a
JOIN workspaces w ON w.workspace_id = a.workspace_id
JOIN transactions t ON t.transaction_bank_id = a.id
WHERE w.workspace_owner_user_id = 'USER_ID'
GROUP BY a.workspace_id, w.workspace_name

UNION ALL

SELECT
  'installment_groups' as table_name,
  COUNT(*) as count,
  a.workspace_id,
  w.workspace_name
FROM accounts a
JOIN workspaces w ON w.workspace_id = a.workspace_id
JOIN installment_groups ig ON ig.account_id = a.id
WHERE w.workspace_owner_user_id = 'USER_ID'
GROUP BY a.workspace_id, w.workspace_name

UNION ALL

SELECT
  'cost_center references' as table_name,
  COUNT(*) as count,
  a.workspace_id,
  w.workspace_name
FROM accounts a
JOIN workspaces w ON w.workspace_id = a.workspace_id
WHERE a.cost_center_id IS NOT NULL
  AND w.workspace_owner_user_id = 'USER_ID'
GROUP BY a.workspace_id, w.workspace_name
ORDER BY workspace_id, table_name;

-- 7. TESTE DE RLS: Simular acesso do usuário
-- Esta query verifica se o usuário PODE ver accounts de ambos os workspaces
SET SESSION AUTHORIZATION 'authenticated';
SET request.jwt.claims.sub = 'USER_ID';

SELECT
  w.workspace_id,
  w.workspace_name,
  COUNT(a.id) as accounts_accessible
FROM workspaces w
LEFT JOIN accounts a ON a.workspace_id = w.workspace_id
  AND a.workspace_id IN (
    SELECT workspace_user_workspace_id
    FROM workspace_users
    WHERE workspace_user_user_id = 'USER_ID'
  )
WHERE w.workspace_owner_user_id = 'USER_ID'
   OR EXISTS (
     SELECT 1 FROM workspace_users wu
     WHERE wu.workspace_user_workspace_id = w.workspace_id
       AND wu.workspace_user_user_id = 'USER_ID'
   )
GROUP BY w.workspace_id, w.workspace_name;

RESET SESSION AUTHORIZATION;
RESET request.jwt.claims.sub;
