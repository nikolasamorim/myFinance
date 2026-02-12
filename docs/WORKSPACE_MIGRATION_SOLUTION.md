# Solução: Migração de Accounts entre Workspaces

## 📋 DIAGNÓSTICO DO PROBLEMA

### **Causa Raiz Identificada**
As accounts não migram automaticamente porque **accounts pertencem a workspaces, não a usuários diretamente**. Quando você "troca de workspace" no sistema, apenas o contexto do frontend muda (`currentWorkspace`), mas os dados continuam associados aos workspaces originais no banco de dados.

### **Arquitetura Atual**
```
User ─┬─> Workspace A ──> Accounts [A1, A2, A3]
      │                  └─> Transactions
      │
      └─> Workspace B ──> Accounts [] (vazio)
                        └─> Transactions
```

Quando você troca de Workspace A para Workspace B:
- ❌ As accounts **NÃO migram** automaticamente
- ✅ As RLS policies funcionam corretamente (filtram por workspace_id)
- ✅ O frontend reage corretamente à mudança (React Query atualiza)

### **Por que isso acontece?**
1. **Tabela `accounts`**: Possui `workspace_id` (NOT NULL, FK)
2. **Sem relação direta com usuário**: Accounts não têm `user_id`, apenas `workspace_id`
3. **RLS baseado em workspace**: Políticas verificam acesso via `workspace_users` table
4. **Sem funcionalidade de migração**: Sistema não possui código para mover dados entre workspaces

---

## ✅ SOLUÇÕES IMPLEMENTADAS

### **1. Função SQL: Preview de Migração (Dry Run)**
```sql
SELECT preview_workspace_migration(
  'source-workspace-id',
  'target-workspace-id',
  'user-id'
);
```

**Retorna**:
```json
{
  "accounts_to_migrate": 5,
  "transactions_to_migrate": 120,
  "installments_to_migrate": 3,
  "categories_to_migrate": 10,
  "cost_centers_to_migrate": 4,
  "credit_cards_to_migrate": 2,
  "warning": "This is a preview only. No data has been migrated.",
  "recommendation": "Migration will affect 120 transactions. Review carefully before proceeding."
}
```

### **2. Função SQL: Migrar Accounts Específicos**
```sql
SELECT migrate_accounts_to_workspace(
  ARRAY['account-id-1', 'account-id-2'],  -- IDs das accounts
  'source-workspace-id',
  'target-workspace-id',
  'user-id',
  true,  -- migrate_transactions
  true   -- migrate_installments
);
```

**Retorna**:
```json
{
  "success": true,
  "migrated_accounts": 2,
  "migrated_transactions": 45,
  "migrated_installments": 1,
  "errors": [],
  "timestamp": "2025-02-12T15:30:00Z"
}
```

### **3. Função SQL: Migrar TUDO de um Workspace**
```sql
SELECT migrate_all_accounts_to_workspace(
  'source-workspace-id',
  'target-workspace-id',
  'user-id',
  true,  -- migrate_transactions
  true,  -- migrate_installments
  false, -- migrate_categories (opcional)
  false  -- migrate_cost_centers (opcional)
);
```

**Retorna**:
```json
{
  "success": true,
  "migrated_accounts": 5,
  "migrated_transactions": 120,
  "migrated_installments": 3,
  "migrated_categories": 0,
  "migrated_cost_centers": 0,
  "timestamp": "2025-02-12T15:30:00Z"
}
```

---

## 🔧 COMO USAR (TypeScript/JavaScript)

### **Importar o serviço**
```typescript
import { workspaceMigrationService } from '../services/workspaceMigration.service';
```

### **1. Preview da Migração (Recomendado)**
```typescript
const preview = await workspaceMigrationService.previewMigration(
  sourceWorkspaceId,
  targetWorkspaceId
);

console.log(`Accounts a migrar: ${preview.accounts_to_migrate}`);
console.log(`Transações a migrar: ${preview.transactions_to_migrate}`);
console.log(`Recomendação: ${preview.recommendation}`);
```

### **2. Migrar Accounts Específicos**
```typescript
const result = await workspaceMigrationService.migrateSpecificAccounts(
  ['account-id-1', 'account-id-2'],
  sourceWorkspaceId,
  targetWorkspaceId,
  {
    migrateTransactions: true,
    migrateInstallments: true
  }
);

console.log(`Migrados: ${result.migrated_accounts} accounts`);
console.log(`Migrados: ${result.migrated_transactions} transactions`);
```

### **3. Migrar TODOS os Accounts**
```typescript
const result = await workspaceMigrationService.migrateAllAccounts(
  sourceWorkspaceId,
  targetWorkspaceId,
  {
    migrateTransactions: true,
    migrateInstallments: true,
    migrateCategories: false,  // Apenas se quiser migrar categorias também
    migrateCostCenters: false  // Apenas se quiser migrar centros de custo também
  }
);

console.log(`Total migrado: ${result.migrated_accounts} accounts`);
```

---

## 🎯 EXEMPLO PRÁTICO: Interface de Migração

```typescript
import React, { useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { workspaceMigrationService } from '../services/workspaceMigration.service';
import { Button } from '../components/ui/Button';

export function WorkspaceMigrationPanel() {
  const { workspaces, currentWorkspace } = useWorkspace();
  const [sourceWorkspace, setSourceWorkspace] = useState('');
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const handlePreview = async () => {
    setLoading(true);
    try {
      const result = await workspaceMigrationService.previewMigration(
        sourceWorkspace,
        currentWorkspace.workspace_id
      );
      setPreview(result);
    } catch (error) {
      console.error('Error previewing migration:', error);
      alert('Erro ao visualizar migração: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMigrate = async () => {
    if (!confirm('Tem certeza que deseja migrar todos os dados?')) return;

    setLoading(true);
    try {
      const result = await workspaceMigrationService.migrateAllAccounts(
        sourceWorkspace,
        currentWorkspace.workspace_id,
        {
          migrateTransactions: true,
          migrateInstallments: true,
          migrateCategories: true,
          migrateCostCenters: true,
        }
      );

      alert(`Migração concluída!
        - Accounts: ${result.migrated_accounts}
        - Transações: ${result.migrated_transactions}
        - Parcelamentos: ${result.migrated_installments}
        - Categorias: ${result.migrated_categories}
        - Centros de Custo: ${result.migrated_cost_centers}
      `);

      // Recarregar página para atualizar os dados
      window.location.reload();
    } catch (error) {
      console.error('Error migrating:', error);
      alert('Erro ao migrar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Migrar Dados entre Workspaces</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Workspace de Origem
          </label>
          <select
            value={sourceWorkspace}
            onChange={(e) => setSourceWorkspace(e.target.value)}
            className="w-full border rounded px-3 py-2"
          >
            <option value="">Selecione...</option>
            {workspaces
              .filter((w) => w.workspace_id !== currentWorkspace.workspace_id)
              .map((w) => (
                <option key={w.workspace_id} value={w.workspace_id}>
                  {w.workspace_name}
                </option>
              ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Workspace de Destino (atual)
          </label>
          <input
            type="text"
            value={currentWorkspace?.workspace_name || ''}
            disabled
            className="w-full border rounded px-3 py-2 bg-gray-100"
          />
        </div>

        <Button
          onClick={handlePreview}
          disabled={!sourceWorkspace || loading}
          variant="outline"
        >
          Visualizar Migração
        </Button>

        {preview && (
          <div className="p-4 bg-blue-50 rounded border border-blue-200">
            <h3 className="font-semibold mb-2">Preview da Migração:</h3>
            <ul className="space-y-1 text-sm">
              <li>✅ Accounts: {preview.accounts_to_migrate}</li>
              <li>✅ Transações: {preview.transactions_to_migrate}</li>
              <li>✅ Parcelamentos: {preview.installments_to_migrate}</li>
              <li>✅ Categorias: {preview.categories_to_migrate}</li>
              <li>✅ Centros de Custo: {preview.cost_centers_to_migrate}</li>
            </ul>
            <p className="mt-3 text-sm text-yellow-700">
              ⚠️ {preview.recommendation}
            </p>

            <Button
              onClick={handleMigrate}
              disabled={loading}
              className="mt-4"
            >
              Executar Migração
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 🛡️ SEGURANÇA E VALIDAÇÕES

### **Validações Automáticas**
✅ Usuário tem acesso ao workspace de origem (owner ou member)
✅ Usuário tem acesso ao workspace de destino (owner ou member)
✅ Accounts pertencem ao workspace de origem
✅ Todas as operações são logadas em `activity_logs`

### **SECURITY DEFINER**
As funções usam `SECURITY DEFINER` para **temporariamente bypassar RLS**, permitindo a migração. Isso é seguro porque:
1. Validações de permissão são feitas **antes** de qualquer operação
2. Apenas usuários autenticados podem executar
3. Todas as ações são auditadas

### **Transações SQL**
Cada migração roda dentro de uma transação implícita. Se qualquer operação falhar:
- ❌ Rollback automático
- ✅ Dados permanecem consistentes
- ✅ Erros são reportados no resultado

---

## 📊 CONSULTAS ÚTEIS PARA DIAGNÓSTICO

### **Ver todos os workspaces do usuário**
```typescript
const { data: workspaces } = await supabase
  .from('workspaces')
  .select('*')
  .eq('workspace_owner_user_id', userId);
```

### **Ver accounts de um workspace específico**
```typescript
const accounts = await workspaceMigrationService.getAccountsByWorkspace(workspaceId);
```

### **Resumo de dados de um workspace**
```typescript
const summary = await workspaceMigrationService.getWorkspaceDataSummary(workspaceId);
console.log(`Accounts: ${summary.accountsCount}`);
console.log(`Transactions: ${summary.transactionsCount}`);
```

---

## ⚠️ CUIDADOS E RECOMENDAÇÕES

### **1. SEMPRE fazer preview antes**
```typescript
// ✅ BOM
const preview = await previewMigration(...);
if (preview.transactions_to_migrate > 100) {
  // Alertar usuário sobre alto volume
}

// ❌ RUIM
await migrateAllAccounts(...); // Sem preview
```

### **2. Migrar categorias/cost centers junto**
Se suas transactions usam categorias/centros de custo do workspace de origem, migre-os também:
```typescript
await migrateAllAccounts(source, target, {
  migrateTransactions: true,
  migrateCategories: true,     // ✅ Migra categorias junto
  migrateCostCenters: true,    // ✅ Migra centros de custo junto
});
```

### **3. Não migrar parcialmente**
Se uma account tem transactions:
- ✅ Migre a account + transactions juntas
- ❌ Não migre só a account (transactions ficam órfãs no workspace antigo)

### **4. Workspace de origem fica vazio**
Após migrar tudo, o workspace de origem ficará vazio. Se quiser deletar:
```typescript
await workspaceService.deleteWorkspace(sourceWorkspaceId);
```

---

## 🐛 TROUBLESHOOTING

### **Erro: "User does not have access to source workspace"**
**Causa**: Você não é owner nem member do workspace de origem
**Solução**: Peça ao owner para te adicionar como member em `workspace_users`

### **Erro: "Failed to migrate accounts"**
**Causa**: Violação de constraint (ex: cost_center_id inválido)
**Solução**: Execute o preview primeiro para verificar dependências

### **Accounts não aparecem após migração**
**Causa**: Cache do React Query ainda tem dados antigos
**Solução**: Recarregue a página ou invalide queries manualmente:
```typescript
queryClient.invalidateQueries({ queryKey: ['accounts'] });
```

### **Transactions com categorias/cost centers quebrados**
**Causa**: Categorias/cost centers não foram migrados junto
**Solução**: Execute nova migração com flags de categories/cost_centers

---

## 📝 MEDIDAS PREVENTIVAS

### **1. Adicionar aviso no onboarding**
Quando criar um novo workspace, avisar:
> "Cada workspace possui seus próprios dados (accounts, transactions, etc.). Para mover dados entre workspaces, use a funcionalidade de migração nas configurações."

### **2. Permitir compartilhamento via workspace_users**
Em vez de migrar, adicione o usuário como member de ambos workspaces:
```sql
INSERT INTO workspace_users (
  workspace_user_workspace_id,
  workspace_user_user_id,
  workspace_user_role
) VALUES (
  'workspace-id',
  'user-id',
  'member'
);
```

### **3. UI clara de seleção de workspace**
Mostre claramente qual workspace está ativo e quantos accounts/transactions ele possui:
```typescript
<WorkspaceSelector>
  <option value="workspace-1">
    Pessoal (5 accounts, 120 transactions)
  </option>
  <option value="workspace-2">
    Empresa (0 accounts, 0 transactions)
  </option>
</WorkspaceSelector>
```

---

## ✨ CONCLUSÃO

**Problema**: Accounts não migravam entre workspaces porque pertencem a workspaces, não a usuários.

**Solução**: Implementamos 3 funções SQL + serviço TypeScript para:
1. ✅ Preview de migração (dry run)
2. ✅ Migrar accounts específicos
3. ✅ Migrar tudo de um workspace

**Resultado**: Agora você pode mover dados entre workspaces de forma segura, auditada e com validações de permissão.

---

**Documentos Relacionados**:
- `docs/WORKSPACE_MIGRATION_DIAGNOSIS.sql` - Queries de diagnóstico
- `supabase/migrations/workspace_account_migration_utilities_v2.sql` - Funções SQL
- `src/services/workspaceMigration.service.ts` - Serviço TypeScript

**Próximos Passos**:
1. Criar UI de migração no frontend (Settings > Migração)
2. Adicionar botão "Migrar dados" ao trocar de workspace
3. Implementar logs de auditoria mais detalhados
4. Considerar migração automática ao criar workspace (opcional)
