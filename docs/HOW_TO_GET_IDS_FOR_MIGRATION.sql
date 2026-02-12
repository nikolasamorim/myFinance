-- ============================================================================
-- COMO OBTER OS IDs NECESSÁRIOS PARA MIGRAÇÃO
-- ============================================================================
-- Este arquivo mostra como encontrar os IDs que você precisa para executar
-- as funções de migração de workspace.
--
-- ORDEM DE EXECUÇÃO:
-- 1. Encontre seu USER_ID
-- 2. Encontre seus WORKSPACE_IDs
-- 3. Verifique os dados de cada workspace
-- 4. Execute a migração
-- ============================================================================

-- ============================================================================
-- PASSO 1: ENCONTRAR SEU USER_ID
-- ============================================================================

-- Opção A: Se você está logado via Supabase Auth
-- Execute no Supabase Dashboard > SQL Editor
SELECT auth.uid() as my_user_id;

-- Opção B: Buscar por email
SELECT user_id, user_email, user_name
FROM users
WHERE user_email = 'seu-email@exemplo.com';

-- Opção C: Buscar pelo auth.users (tabela de autenticação)
SELECT id as user_id, email, raw_user_meta_data->>'name' as name
FROM auth.users
WHERE email = 'seu-email@exemplo.com';

-- ============================================================================
-- PASSO 2: ENCONTRAR SEUS WORKSPACE_IDs
-- ============================================================================

-- Substitua 'SEU_USER_ID' pelo ID encontrado no Passo 1
-- Esta query mostra TODOS os workspaces que você tem acesso

SELECT
  w.workspace_id,
  w.workspace_name,
  w.workspace_type,
  CASE
    WHEN w.workspace_owner_user_id = 'SEU_USER_ID' THEN '✅ OWNER'
    ELSE '👤 MEMBER'
  END as seu_papel,
  w.workspace_created_at,
  -- Contadores de dados
  (SELECT COUNT(*) FROM accounts WHERE workspace_id = w.workspace_id) as total_accounts,
  (SELECT COUNT(*) FROM transactions WHERE transaction_workspace_id = w.workspace_id) as total_transactions,
  (SELECT COUNT(*) FROM categories WHERE category_workspace_id = w.workspace_id) as total_categories,
  (SELECT COUNT(*) FROM cost_centers WHERE cost_center_workspace_id = w.workspace_id) as total_cost_centers,
  (SELECT COUNT(*) FROM credit_cards WHERE credit_card_workspace_id = w.workspace_id) as total_credit_cards
FROM workspaces w
WHERE w.workspace_owner_user_id = 'SEU_USER_ID'
   OR EXISTS (
     SELECT 1 FROM workspace_users wu
     WHERE wu.workspace_user_workspace_id = w.workspace_id
       AND wu.workspace_user_user_id = 'SEU_USER_ID'
   )
ORDER BY w.workspace_created_at DESC;

-- RESULTADO EXEMPLO:
-- workspace_id                          | workspace_name | workspace_type | seu_papel | total_accounts | total_transactions
-- ---------------------------------------|----------------|----------------|-----------|----------------|-------------------
-- 123e4567-e89b-12d3-a456-426614174000 | Pessoal        | personal       | ✅ OWNER  | 5              | 120
-- 123e4567-e89b-12d3-a456-426614174001 | Empresa XYZ    | business       | ✅ OWNER  | 0              | 0

-- ============================================================================
-- PASSO 3: VISUALIZAR ACCOUNTS DE UM WORKSPACE ESPECÍFICO
-- ============================================================================

-- Substitua 'WORKSPACE_ID' pelo workspace_id do workspace de ORIGEM
-- (aquele que TEM os accounts que você quer migrar)

SELECT
  a.id as account_id,
  a.title as account_title,
  a.type as account_type,
  a.initial_balance,
  a.opened_at,
  a.created_at,
  -- Conta quantas transactions estão vinculadas a este account
  (SELECT COUNT(*)
   FROM transactions t
   WHERE t.transaction_bank_id = a.id) as total_transactions,
  -- Soma o valor total de transactions
  (SELECT COALESCE(SUM(t.transaction_amount), 0)
   FROM transactions t
   WHERE t.transaction_bank_id = a.id) as total_amount
FROM accounts a
WHERE a.workspace_id = 'WORKSPACE_ID_ORIGEM'
ORDER BY a.created_at DESC;

-- RESULTADO EXEMPLO:
-- account_id                            | account_title         | account_type | initial_balance | total_transactions | total_amount
-- --------------------------------------|-----------------------|--------------|-----------------|--------------------|--------------
-- 789e4567-e89b-12d3-a456-426614174000 | Conta Corrente BB     | bank         | 5000.00         | 80                 | 25000.00
-- 789e4567-e89b-12d3-a456-426614174001 | Carteira              | cash         | 500.00          | 40                 | 1500.00

-- ============================================================================
-- PASSO 4: PREVIEW DA MIGRAÇÃO (DRY RUN - NÃO MIGRA NADA)
-- ============================================================================

-- IMPORTANTE: Execute SEMPRE o preview antes da migração real!

SELECT preview_workspace_migration(
  'WORKSPACE_ID_ORIGEM',    -- Workspace que TEM os dados
  'WORKSPACE_ID_DESTINO',   -- Workspace para onde quer MOVER os dados
  'SEU_USER_ID'             -- Seu user ID
);

-- RESULTADO EXEMPLO:
-- {
--   "source_workspace_id": "123e4567-e89b-12d3-a456-426614174000",
--   "target_workspace_id": "123e4567-e89b-12d3-a456-426614174001",
--   "accounts_to_migrate": 5,
--   "transactions_to_migrate": 120,
--   "installments_to_migrate": 3,
--   "categories_to_migrate": 10,
--   "cost_centers_to_migrate": 4,
--   "credit_cards_to_migrate": 2,
--   "warning": "This is a preview only. No data has been migrated.",
--   "recommendation": "Migration will affect 120 transactions. Review carefully before proceeding."
-- }

-- ============================================================================
-- PASSO 5A: MIGRAR ACCOUNTS ESPECÍFICOS (OPCIONAL)
-- ============================================================================

-- Se você quer migrar APENAS alguns accounts (não todos), use esta função:

SELECT migrate_accounts_to_workspace(
  ARRAY[
    '789e4567-e89b-12d3-a456-426614174000',  -- Account ID 1
    '789e4567-e89b-12d3-a456-426614174001'   -- Account ID 2
  ],
  'WORKSPACE_ID_ORIGEM',
  'WORKSPACE_ID_DESTINO',
  'SEU_USER_ID',
  true,  -- migrate_transactions: true = migra transactions junto
  true   -- migrate_installments: true = migra installments junto
);

-- RESULTADO EXEMPLO:
-- {
--   "success": true,
--   "migrated_accounts": 2,
--   "migrated_transactions": 45,
--   "migrated_installments": 1,
--   "errors": [],
--   "timestamp": "2025-02-12T15:30:00Z"
-- }

-- ============================================================================
-- PASSO 5B: MIGRAR TODOS OS ACCOUNTS (RECOMENDADO)
-- ============================================================================

-- Se você quer migrar TUDO de um workspace para outro, use esta função:

SELECT migrate_all_accounts_to_workspace(
  'WORKSPACE_ID_ORIGEM',
  'WORKSPACE_ID_DESTINO',
  'SEU_USER_ID',
  true,  -- migrate_transactions: true = migra transactions
  true,  -- migrate_installments: true = migra installments
  true,  -- migrate_categories: true = migra categories
  true   -- migrate_cost_centers: true = migra cost_centers
);

-- RESULTADO EXEMPLO:
-- {
--   "success": true,
--   "migrated_accounts": 5,
--   "migrated_transactions": 120,
--   "migrated_installments": 3,
--   "migrated_categories": 10,
--   "migrated_cost_centers": 4,
--   "timestamp": "2025-02-12T15:30:00Z"
-- }

-- ============================================================================
-- PASSO 6: VERIFICAR SE A MIGRAÇÃO FOI BEM-SUCEDIDA
-- ============================================================================

-- Verifique se os accounts agora aparecem no workspace de DESTINO:

SELECT
  a.id as account_id,
  a.title as account_title,
  a.workspace_id,
  w.workspace_name,
  (SELECT COUNT(*) FROM transactions t WHERE t.transaction_bank_id = a.id) as total_transactions
FROM accounts a
JOIN workspaces w ON w.workspace_id = a.workspace_id
WHERE a.workspace_id = 'WORKSPACE_ID_DESTINO'
ORDER BY a.created_at DESC;

-- Se aparecer dados aqui, a migração foi bem-sucedida! ✅

-- ============================================================================
-- PASSO 7: VERIFICAR LOGS DE AUDITORIA
-- ============================================================================

-- Todas as migrações são registradas em activity_logs:

SELECT
  id,
  user_id,
  workspace_id,
  activity_type,
  description,
  metadata,
  created_at
FROM activity_logs
WHERE activity_type IN ('migrate', 'migrate_all')
  AND user_id = 'SEU_USER_ID'
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- EXEMPLO COMPLETO PASSO A PASSO
-- ============================================================================

-- 1. Encontrar meu user_id
SELECT auth.uid() as my_user_id;
-- Resultado: 'abc123-def456-ghi789'

-- 2. Listar meus workspaces
SELECT workspace_id, workspace_name, workspace_type
FROM workspaces
WHERE workspace_owner_user_id = 'abc123-def456-ghi789';
-- Resultado:
-- workspace_id: 'ws-111' | workspace_name: 'Pessoal'  | workspace_type: 'personal'
-- workspace_id: 'ws-222' | workspace_name: 'Empresa'  | workspace_type: 'business'

-- 3. Ver quantos accounts existem em 'Pessoal'
SELECT COUNT(*) FROM accounts WHERE workspace_id = 'ws-111';
-- Resultado: 5 accounts

-- 4. Preview da migração de 'Pessoal' para 'Empresa'
SELECT preview_workspace_migration('ws-111', 'ws-222', 'abc123-def456-ghi789');
-- Resultado: { accounts_to_migrate: 5, transactions_to_migrate: 120, ... }

-- 5. Executar migração completa
SELECT migrate_all_accounts_to_workspace(
  'ws-111',  -- Pessoal (origem)
  'ws-222',  -- Empresa (destino)
  'abc123-def456-ghi789',
  true, true, true, true
);
-- Resultado: { success: true, migrated_accounts: 5, ... }

-- 6. Verificar no workspace destino
SELECT COUNT(*) FROM accounts WHERE workspace_id = 'ws-222';
-- Resultado: 5 accounts (migrados com sucesso!)

-- ============================================================================
-- DICAS E OBSERVAÇÕES IMPORTANTES
-- ============================================================================

-- ✅ SEMPRE execute o preview ANTES da migração real
-- ✅ VERIFIQUE se você tem acesso a ambos os workspaces
-- ✅ CONSIDERE fazer backup dos dados antes de migrar (opcional)
-- ⚠️ O workspace de ORIGEM ficará VAZIO após a migração
-- ⚠️ NÃO HÁ "desfazer" automático (migração é permanente)
-- 💡 Recarregue a página no frontend após migração (cache React Query)

-- ============================================================================
-- TROUBLESHOOTING
-- ============================================================================

-- ERRO: "User does not have access to source workspace"
-- SOLUÇÃO: Verifique se você é owner ou member do workspace:
SELECT *
FROM workspace_users
WHERE workspace_user_workspace_id = 'WORKSPACE_ID'
  AND workspace_user_user_id = 'SEU_USER_ID';

-- Se não retornar nada, adicione você como member:
INSERT INTO workspace_users (
  workspace_user_workspace_id,
  workspace_user_user_id,
  workspace_user_role
) VALUES (
  'WORKSPACE_ID',
  'SEU_USER_ID',
  'member'
);

-- ERRO: "Constraint violation"
-- SOLUÇÃO: Migre categories/cost_centers junto (flags true)

-- PROBLEMA: "Accounts não aparecem no frontend"
-- SOLUÇÃO: Recarregue a página (Ctrl+R ou F5) para limpar cache

-- ============================================================================
-- FIM DO GUIA
-- ============================================================================
-- Para mais informações, consulte:
-- - docs/WORKSPACE_MIGRATION_SOLUTION.md (guia completo)
-- - docs/WORKSPACE_MIGRATION_EXECUTIVE_SUMMARY.md (resumo executivo)
-- ============================================================================
