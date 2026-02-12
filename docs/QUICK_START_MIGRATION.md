# 🚀 Quick Start: Migrar Accounts entre Workspaces em 5 Minutos

## TL;DR - Comando Rápido

Se você já sabe os IDs, execute diretamente:

```sql
-- 1. Preview (dry run - não migra nada)
SELECT preview_workspace_migration(
  'workspace-origem-id',
  'workspace-destino-id',
  'seu-user-id'
);

-- 2. Migrar TUDO
SELECT migrate_all_accounts_to_workspace(
  'workspace-origem-id',
  'workspace-destino-id',
  'seu-user-id',
  true, true, true, true  -- migrate: transactions, installments, categories, cost_centers
);

-- 3. Recarregar o frontend (Ctrl+R ou F5)
```

---

## Passo a Passo Completo

### **1️⃣ Encontrar seu User ID**

**Opção A**: Supabase SQL Editor
```sql
SELECT auth.uid() as my_user_id;
```

**Opção B**: Por email
```sql
SELECT user_id FROM users WHERE user_email = 'seu-email@exemplo.com';
```

📝 **Anote o resultado**: `user_id` = `abc-123-def-456`

---

### **2️⃣ Encontrar seus Workspace IDs**

```sql
-- Substitua 'abc-123-def-456' pelo seu user_id do passo 1
SELECT
  workspace_id,
  workspace_name,
  workspace_type,
  (SELECT COUNT(*) FROM accounts WHERE workspace_id = w.workspace_id) as total_accounts
FROM workspaces w
WHERE workspace_owner_user_id = 'abc-123-def-456'
ORDER BY workspace_created_at DESC;
```

**Resultado exemplo**:
```
workspace_id        | workspace_name | total_accounts
--------------------|----------------|---------------
ws-111-aaa-bbb      | Pessoal        | 5
ws-222-ccc-ddd      | Empresa        | 0
```

📝 **Anote**:
- **Origem** (tem dados): `ws-111-aaa-bbb`
- **Destino** (vazio): `ws-222-ccc-ddd`

---

### **3️⃣ Preview da Migração (Recomendado)**

```sql
SELECT preview_workspace_migration(
  'ws-111-aaa-bbb',  -- origem
  'ws-222-ccc-ddd',  -- destino
  'abc-123-def-456'  -- seu user_id
);
```

**Resultado exemplo**:
```json
{
  "accounts_to_migrate": 5,
  "transactions_to_migrate": 120,
  "categories_to_migrate": 10,
  "recommendation": "Migration will affect 120 transactions. Review carefully."
}
```

✅ Se o resultado estiver OK, prossiga para o próximo passo.
❌ Se houver erro, veja seção Troubleshooting abaixo.

---

### **4️⃣ Executar Migração**

```sql
SELECT migrate_all_accounts_to_workspace(
  'ws-111-aaa-bbb',      -- origem
  'ws-222-ccc-ddd',      -- destino
  'abc-123-def-456',     -- seu user_id
  true,  -- migrate_transactions
  true,  -- migrate_installments
  true,  -- migrate_categories
  true   -- migrate_cost_centers
);
```

**Resultado esperado**:
```json
{
  "success": true,
  "migrated_accounts": 5,
  "migrated_transactions": 120,
  "migrated_installments": 3,
  "timestamp": "2025-02-12T15:30:00Z"
}
```

✅ **Sucesso!** Seus dados foram migrados.

---

### **5️⃣ Verificar no Frontend**

1. Recarregue a página: `Ctrl+R` ou `F5`
2. Troque para o workspace de destino (dropdown no topo)
3. Vá em **Organizadores > Caixa / Conta**
4. ✅ Os accounts devem aparecer agora!

---

## ⚠️ Troubleshooting Rápido

### Erro: "User does not have access to source workspace"

**Causa**: Você não é owner nem member do workspace de origem.

**Solução**: Adicione-se como member:
```sql
INSERT INTO workspace_users (
  workspace_user_workspace_id,
  workspace_user_user_id,
  workspace_user_role
) VALUES (
  'ws-111-aaa-bbb',    -- workspace_id
  'abc-123-def-456',   -- seu user_id
  'member'
);
```

### Accounts não aparecem no frontend

**Causa**: Cache do React Query.

**Solução**: Recarregue a página (`Ctrl+R` ou `F5`)

### Erro: "Constraint violation"

**Causa**: Categories/cost_centers não foram migrados junto.

**Solução**: Execute novamente com flags `true`:
```sql
SELECT migrate_all_accounts_to_workspace(
  'origem', 'destino', 'user-id',
  true, true, true, true  -- ✅ Todas as flags em true
);
```

---

## 🎯 Casos de Uso Comuns

### **Caso 1: Consolidar 2 workspaces em 1**

```sql
-- Mover tudo de "Pessoal" para "Empresa"
SELECT migrate_all_accounts_to_workspace(
  'workspace-pessoal-id',
  'workspace-empresa-id',
  'seu-user-id',
  true, true, true, true
);

-- Opcional: Deletar workspace "Pessoal" (agora vazio)
DELETE FROM workspaces WHERE workspace_id = 'workspace-pessoal-id';
```

### **Caso 2: Migrar apenas 1 account específico**

```sql
-- Primeiro, encontre o account_id
SELECT id, title FROM accounts WHERE workspace_id = 'origem-id';

-- Depois, migre apenas ele
SELECT migrate_accounts_to_workspace(
  ARRAY['account-id-aqui'],  -- Array com IDs
  'origem-id',
  'destino-id',
  'seu-user-id',
  true,  -- transactions
  true   -- installments
);
```

### **Caso 3: Criar novo workspace e mover dados**

```sql
-- 1. Criar novo workspace (via interface ou SQL)
INSERT INTO workspaces (workspace_name, workspace_type, workspace_owner_user_id)
VALUES ('Novo Workspace', 'business', 'seu-user-id')
RETURNING workspace_id;

-- 2. Anotar o workspace_id retornado: 'ws-novo-333'

-- 3. Migrar dados do workspace antigo
SELECT migrate_all_accounts_to_workspace(
  'workspace-antigo-id',
  'ws-novo-333',
  'seu-user-id',
  true, true, true, true
);
```

---

## 📋 Checklist Final

Antes de executar a migração, confirme:

- [ ] Você tem o **user_id** correto
- [ ] Você tem os **workspace_id** de origem e destino corretos
- [ ] Você executou o **preview** e revisou o resultado
- [ ] Você tem **acesso** a ambos os workspaces (owner ou member)
- [ ] Você entende que o **workspace de origem ficará vazio**
- [ ] Você tem **backup** dos dados (opcional, mas recomendado)

---

## 🚀 Comandos Úteis para Copiar e Colar

### Encontrar meu user_id
```sql
SELECT auth.uid() as my_user_id;
```

### Listar meus workspaces
```sql
SELECT
  workspace_id,
  workspace_name,
  (SELECT COUNT(*) FROM accounts WHERE workspace_id = w.workspace_id) as accounts
FROM workspaces w
WHERE workspace_owner_user_id = auth.uid();
```

### Preview completo
```sql
SELECT preview_workspace_migration(
  'ORIGEM_ID_AQUI',
  'DESTINO_ID_AQUI',
  auth.uid()
);
```

### Migrar tudo
```sql
SELECT migrate_all_accounts_to_workspace(
  'ORIGEM_ID_AQUI',
  'DESTINO_ID_AQUI',
  auth.uid(),
  true, true, true, true
);
```

### Verificar resultado
```sql
SELECT
  w.workspace_name,
  COUNT(a.id) as total_accounts
FROM workspaces w
LEFT JOIN accounts a ON a.workspace_id = w.workspace_id
WHERE w.workspace_owner_user_id = auth.uid()
GROUP BY w.workspace_id, w.workspace_name;
```

---

## 📚 Documentação Completa

Para mais detalhes, consulte:

- **Guia Completo**: `docs/WORKSPACE_MIGRATION_SOLUTION.md`
- **Resumo Executivo**: `docs/WORKSPACE_MIGRATION_EXECUTIVE_SUMMARY.md`
- **Queries de Diagnóstico**: `docs/WORKSPACE_MIGRATION_DIAGNOSIS.sql`
- **Como Obter IDs**: `docs/HOW_TO_GET_IDS_FOR_MIGRATION.sql`

---

## ✅ Conclusão

Agora você tem:
- ✅ Funções SQL para migração segura
- ✅ Preview antes de executar
- ✅ Validação automática de permissões
- ✅ Logs de auditoria
- ✅ Documentação completa

**Tempo estimado**: 5-10 minutos
**Dificuldade**: Fácil (copiar e colar queries)
**Reversível**: Sim (executando migração inversa)

**Bom trabalho! 🎉**
