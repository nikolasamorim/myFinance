# Resumo Executivo: Problema de Accounts não Migrando entre Workspaces

## 🎯 PROBLEMA IDENTIFICADO

**Sintoma**: Quando o usuário troca de workspace, as accounts cadastradas não aparecem no novo workspace.

**Causa Raiz**: Accounts pertencem a **workspaces**, não a usuários. Quando você troca de workspace no sistema:
- ✅ O contexto do frontend muda (`currentWorkspace`)
- ✅ As RLS policies funcionam corretamente (filtram por workspace)
- ❌ Os dados **NÃO migram automaticamente** (cada workspace tem seus próprios dados)

**Conclusão**: Este é o **comportamento esperado** do sistema. Accounts são isolados por workspace para permitir separação de contextos (pessoal vs empresa, etc.).

---

## ✅ SOLUÇÕES IMPLEMENTADAS

### **1. Migração SQL (Backend)**
Criamos 3 funções PostgreSQL:

| Função | Descrição | Uso |
|--------|-----------|-----|
| `preview_workspace_migration` | Preview/dry-run (não migra nada) | Verificar quantos dados serão migrados |
| `migrate_accounts_to_workspace` | Migra accounts específicos | Mover apenas algumas accounts |
| `migrate_all_accounts_to_workspace` | Migra TUDO de um workspace | Consolidar workspaces |

**Características**:
- ✅ Validações de permissão (usuário deve ter acesso a ambos workspaces)
- ✅ Auditoria completa (logs em `activity_logs`)
- ✅ Transações SQL (rollback automático em caso de erro)
- ✅ Migração de dados relacionados (transactions, installments, etc.)

### **2. Serviço TypeScript (Frontend)**
Criamos `workspaceMigration.service.ts` com métodos:
- `previewMigration()`: Visualizar preview
- `migrateSpecificAccounts()`: Migrar accounts selecionados
- `migrateAllAccounts()`: Migrar tudo
- `getAccountsByWorkspace()`: Listar accounts por workspace
- `getWorkspaceDataSummary()`: Resumo de dados

### **3. Documentação Completa**
- ✅ Queries de diagnóstico SQL
- ✅ Guia de uso TypeScript
- ✅ Exemplo de interface React
- ✅ Troubleshooting e medidas preventivas

---

## 🚀 COMO USAR AGORA

### **Opção A: Via SQL (Direto no Supabase Dashboard)**

1. **Preview da migração**:
```sql
SELECT preview_workspace_migration(
  'workspace-antigo-id',
  'workspace-novo-id',
  'seu-user-id'
);
```

2. **Migrar tudo**:
```sql
SELECT migrate_all_accounts_to_workspace(
  'workspace-antigo-id',
  'workspace-novo-id',
  'seu-user-id',
  true,  -- migrar transactions
  true,  -- migrar installments
  true,  -- migrar categories
  true   -- migrar cost_centers
);
```

### **Opção B: Via Código TypeScript**

```typescript
import { workspaceMigrationService } from '../services/workspaceMigration.service';

// 1. Preview
const preview = await workspaceMigrationService.previewMigration(
  sourceWorkspaceId,
  targetWorkspaceId
);
console.log(`Accounts: ${preview.accounts_to_migrate}`);

// 2. Migrar tudo
const result = await workspaceMigrationService.migrateAllAccounts(
  sourceWorkspaceId,
  targetWorkspaceId,
  {
    migrateTransactions: true,
    migrateInstallments: true,
    migrateCategories: true,
    migrateCostCenters: true,
  }
);
console.log(`Migrados: ${result.migrated_accounts} accounts`);
```

---

## 📋 CHECKLIST DE EXECUÇÃO

Para resolver o problema **agora**:

- [ ] **1. Identificar workspaces**
  - Workspace de origem (onde estão os accounts)
  - Workspace de destino (para onde quer mover)
  - Seu user ID

- [ ] **2. Executar preview**
  ```sql
  SELECT preview_workspace_migration('source-id', 'target-id', 'user-id');
  ```

- [ ] **3. Revisar resultado do preview**
  - Quantos accounts?
  - Quantas transactions?
  - Há warnings?

- [ ] **4. Executar migração**
  ```sql
  SELECT migrate_all_accounts_to_workspace(
    'source-id',
    'target-id',
    'user-id',
    true, true, true, true
  );
  ```

- [ ] **5. Verificar resultado**
  - Accounts apareceram no workspace de destino?
  - Transactions foram junto?
  - Recarregar a página no frontend

---

## 🛡️ SEGURANÇA E VALIDAÇÕES

**O que é validado automaticamente**:
- ✅ Usuário tem permissão no workspace de origem
- ✅ Usuário tem permissão no workspace de destino
- ✅ Accounts pertencem ao workspace correto
- ✅ Todas as operações são logadas

**O que NÃO é feito automaticamente**:
- ❌ Backup dos dados (faça manualmente se necessário)
- ❌ Notificação ao usuário (implemente se quiser)
- ❌ Validação de duplicatas (se já existir account com mesmo nome)

---

## ⚠️ CUIDADOS IMPORTANTES

### **1. Workspace de origem ficará vazio**
Após migrar tudo, o workspace de origem não terá mais dados. Se quiser deletá-lo:
```typescript
await workspaceService.deleteWorkspace(sourceWorkspaceId);
```

### **2. Migre dados relacionados junto**
Se transactions usam categories/cost_centers do workspace antigo:
- ✅ Migre categories/cost_centers **JUNTO** (flag `true`)
- ❌ Não migre só accounts (references vão quebrar)

### **3. Cache do React Query**
Após migração, recarregue a página ou invalide queries:
```typescript
queryClient.invalidateQueries({ queryKey: ['accounts'] });
window.location.reload(); // Mais simples
```

### **4. Não há "desfazer"**
A migração **não pode ser revertida automaticamente**. Para reverter:
- Execute outra migração no sentido inverso
- Ou restaure backup do banco de dados

---

## 🎨 PRÓXIMAS MELHORIAS (Opcional)

Se quiser melhorar a UX:

### **1. Interface de Migração no Settings**
Adicione uma página em Settings > Migração com:
- Seletor de workspace origem/destino
- Botão "Preview"
- Exibição dos dados a migrar
- Botão "Migrar" com confirmação

### **2. Aviso ao Trocar de Workspace**
Quando usuário troca de workspace vazio, mostrar:
```
📦 Este workspace está vazio!

Você tem dados em outro workspace. Deseja migrar?
[Não] [Migrar Dados]
```

### **3. Compartilhamento em vez de Migração**
Em vez de migrar, permitir acesso a múltiplos workspaces:
- Adicionar usuário como `member` em `workspace_users`
- Usuário vê dados de ambos workspaces sem migrar

### **4. Migração Automática no Onboarding**
Ao criar novo workspace, perguntar:
```
Copiar dados do workspace "Pessoal"?
[ ] Accounts
[ ] Transactions
[ ] Categories
```

---

## 📞 SUPORTE E TROUBLESHOOTING

### **Erro Comum 1: "User does not have access"**
**Solução**: Adicione o usuário como member do workspace:
```sql
INSERT INTO workspace_users (
  workspace_user_workspace_id,
  workspace_user_user_id,
  workspace_user_role
) VALUES ('workspace-id', 'user-id', 'member');
```

### **Erro Comum 2: "Accounts não aparecem"**
**Solução**: Recarregue a página (`Ctrl+R` ou `F5`)

### **Erro Comum 3: "Constraint violation"**
**Solução**: Migre categories/cost_centers junto (flags `true`)

### **Como consultar logs**
```sql
SELECT * FROM activity_logs
WHERE activity_type IN ('migrate', 'migrate_all')
ORDER BY created_at DESC
LIMIT 10;
```

---

## 📊 QUERIES DE DIAGNÓSTICO

### **Ver meus workspaces**
```sql
SELECT
  workspace_id,
  workspace_name,
  workspace_type,
  (SELECT COUNT(*) FROM accounts WHERE workspace_id = w.workspace_id) as accounts_count,
  (SELECT COUNT(*) FROM transactions WHERE transaction_workspace_id = w.workspace_id) as transactions_count
FROM workspaces w
WHERE workspace_owner_user_id = 'SEU_USER_ID'
ORDER BY workspace_created_at DESC;
```

### **Ver accounts de um workspace**
```sql
SELECT id, title, type, initial_balance
FROM accounts
WHERE workspace_id = 'WORKSPACE_ID'
ORDER BY created_at DESC;
```

### **Ver transações de um account**
```sql
SELECT
  transaction_id,
  transaction_description,
  transaction_amount,
  transaction_date,
  transaction_type
FROM transactions
WHERE transaction_bank_id = 'ACCOUNT_ID'
ORDER BY transaction_date DESC
LIMIT 20;
```

---

## ✅ STATUS DA SOLUÇÃO

| Item | Status | Arquivo |
|------|--------|---------|
| Migração SQL | ✅ Implementado | `supabase/migrations/workspace_account_migration_utilities_v2.sql` |
| Serviço TypeScript | ✅ Implementado | `src/services/workspaceMigration.service.ts` |
| Queries Diagnóstico | ✅ Documentado | `docs/WORKSPACE_MIGRATION_DIAGNOSIS.sql` |
| Documentação Completa | ✅ Pronta | `docs/WORKSPACE_MIGRATION_SOLUTION.md` |
| Build Verificado | ✅ Sem erros | `npm run build` passou |
| Testes Manuais | ⏳ Pendente | Execute em produção |
| Interface UI | ⏳ Opcional | Não implementado |

---

## 🎓 LIÇÕES APRENDIDAS

### **Arquitetura do Sistema**
1. **Accounts pertencem a workspaces**, não a usuários
2. **RLS policies** filtram por workspace_id via workspace_users
3. **Troca de workspace** é apenas mudança de contexto no frontend
4. **Sem migração automática** por design (isolamento intencional)

### **Decisões de Design**
- ✅ Isolamento por workspace permite contextos separados (pessoal/empresa)
- ✅ RLS garante que usuário só vê dados dos workspaces que participa
- ✅ Migração manual dá controle ao usuário sobre consolidação

### **Melhorias Futuras**
- Adicionar UI de migração no Settings
- Permitir compartilhamento em vez de migração
- Aviso ao criar workspace vazio
- Migração assistida no onboarding

---

## 📞 CONTATO E PRÓXIMOS PASSOS

**Para executar a migração agora**:
1. Use as queries SQL do documento `WORKSPACE_MIGRATION_DIAGNOSIS.sql`
2. Execute preview primeiro
3. Execute migração completa
4. Recarregue o frontend

**Para implementar UI**:
1. Crie página em Settings > Migração
2. Use o serviço `workspaceMigration.service.ts`
3. Siga o exemplo React no documento `WORKSPACE_MIGRATION_SOLUTION.md`

**Documentos de referência**:
- 📄 `WORKSPACE_MIGRATION_SOLUTION.md` - Guia completo
- 📄 `WORKSPACE_MIGRATION_DIAGNOSIS.sql` - Queries SQL
- 📄 `WORKSPACE_MIGRATION_EXECUTIVE_SUMMARY.md` - Este documento
- 💾 `supabase/migrations/workspace_account_migration_utilities_v2.sql` - Funções SQL
- 💻 `src/services/workspaceMigration.service.ts` - Serviço TypeScript

---

**Última atualização**: 2025-02-12
**Status**: ✅ Solução completa implementada e documentada
**Próximo passo**: Executar migração e/ou implementar UI
