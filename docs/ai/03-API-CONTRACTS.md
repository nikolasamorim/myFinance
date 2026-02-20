# myFinance — Contratos de API (Front ↔ Supabase)

> Este projeto **não tem uma API REST tradicional**. O front-end comunica-se diretamente
> com o Supabase via `supabase-js`. Os "contratos" aqui são os schemas de entrada/saída
> de cada domínio, baseados nos types TypeScript e nas colunas do banco.

---

## Estrutura Geral de um Contrato

```typescript
// Input do service (o que o front envia ao Supabase)
type CreateInput<T> = Omit<T, 'id' | 'created_at' | 'updated_at'>

// Output do service (o que o Supabase retorna)
type ServiceResult<T> = T | T[] | { data: T[]; total: number }
```

---

## Autenticação

### Login
```typescript
// Input
{ email: string; password: string }

// Output (Supabase Session)
{
  access_token: string;
  refresh_token: string;
  user: { id: string; email: string; user_metadata: { name: string } }
}
```

### Registro
```typescript
// Input
{ email: string; password: string; options: { data: { name: string } } }
// Output: void (email de confirmação enviado)
```

---

## Workspace

### Criar Workspace
```typescript
// Input
{
  workspace_name: string;
  workspace_type: 'personal' | 'family' | 'business';
  workspace_owner_user_id: string; // auth.uid()
}

// Output
interface Workspace {
  workspace_id: string;
  workspace_name: string;
  workspace_type: 'personal' | 'family' | 'business';
  workspace_icon?: string;
  workspace_owner_user_id: string;
  workspace_created_at: string;
}
```

---

## Transaction (Transação Simples)

### Criar Transação
```typescript
// Input
{
  transaction_workspace_id: string;
  transaction_type: 'expense' | 'income' | 'debt' | 'investment';
  transaction_description: string;
  transaction_amount: number;          // float em reais. Ex: 1500.50
  transaction_date: string;            // YYYY-MM-DD
  transaction_issue_date: string;      // YYYY-MM-DD (emissão)
  transaction_competence_date: string; // YYYY-MM-DD (competência)
  transaction_payment_method: string;
  transaction_is_paid: boolean;
  transaction_category_id?: string;
  transaction_cost_center_id?: string;
  transaction_bank_id?: string;
  transaction_card_id?: string;
}

// Output
interface Transaction {
  transaction_id: string;
  // ... todos os campos acima
  transaction_created_at: string;
  transaction_updated_at?: string;
  transaction_status?: 'pending' | 'paid' | 'received';
}
```

### Listar Transações (com paginação)
```typescript
// Entrada
{
  workspaceId: string;
  page?: number;    // default: 1
  limit?: number;   // default: 10
  search?: string;  // busca por description (ilike)
}

// Saída
{
  data: Transaction[];
  total: number;
}
```

---

## Account (Conta Bancária/Caixa)

### Criar Conta
```typescript
// Input
interface AccountData {
  title: string;
  type: 'cash' | 'bank';
  initial_balance: number;  // float em reais
  opened_at: string;        // YYYY-MM-DD
  cost_center_id?: string;
  color?: string;           // ex: '#4F46E5'
  icon?: string;            // nome do ícone Lucide
  description?: string;
}

// Output: AccountData + { id, workspace_id, created_at, updated_at }
```

---

## Category (Categoria)

```typescript
interface Category {
  category_id: string;
  category_name: string;
  category_type: 'expense' | 'income' | 'debt' | 'investment';
  category_workspace_id: string;
}

// Input para criação
type CreateCategoryInput = Omit<Category, 'category_id'>
```

---

## Advanced Transaction (Parcelado / Recorrente)

### Criar Transação Avançada
```typescript
// Input
interface AdvancedTransactionData {
  transaction_type: 'income' | 'expense' | 'debt' | 'investment';
  description: string;
  emission_date: string;     // YYYY-MM-DD
  due_date: string;          // YYYY-MM-DD
  competence_date: string;   // YYYY-MM-DD
  amount: number;            // float em reais
  account_id: string;
  credit_card_id?: string;
  cost_center_id?: string;
  category_id?: string;
  payment_method: string;
  is_installment: boolean;
  is_recurring: boolean;
  installments?: InstallmentData[];
  recurrence?: RecurrenceData;
}

// Se is_installment = true → cria InstallmentGroup + N transactions
// Se is_recurring = true → cria RecurrenceRule + transações futuras
```

---

## Recurrence Rule (Regra de Recorrência)

```typescript
interface RecurrenceRule {
  id: string;
  workspace_id: string;
  transaction_type: 'income' | 'expense' | 'debt' | 'investment';
  description: string;
  start_date: string;          // YYYY-MM-DD
  recurrence_type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  repeat_count?: number;       // null = infinito
  end_date?: string;
  due_adjustment: 'none' | 'previous_business_day' | 'next_business_day';
  recurrence_day?: number;     // 1-31, para monthly
  status: 'active' | 'paused' | 'canceled' | 'completed' | 'error';
  amount?: number;
  account_id?: string;
  category_id?: string;
  timezone: string;            // ex: 'America/Sao_Paulo'
  generation_count: number;
  error_count: number;
}
```

---

## Erros Comuns do Supabase (mapeamento sugerido)

| Código Supabase | Significado | Mensagem PT-BR sugerida |
|-----------------|-------------|------------------------|
| `PGRST116` | Row not found | "Registro não encontrado." |
| `23505` | Unique violation | "Este registro já existe." |
| `23503` | Foreign key violation | "Dependência inválida — verifique os campos relacionados." |
| `42501` | RLS violation | "Você não tem permissão para esta operação." |
| `PGRST301` | JWT expired | "Sessão expirada. Faça login novamente." |

---

## WIP — Endpoints ainda não mapeados

> Estes domínios existem no código mas não foram completamente auditados:

- `statements.service.ts` — Extratos de conta
- `visualization.service.ts` — Configurações de visualização salvas pelo usuário
- `activityLog.service.ts` — Log de ações do usuário
- `workspaceMigration.service.ts` — Migração de dados entre workspaces
- `invoice.service.ts` — Faturas completas de cartão de crédito

> Para cada um acima: leia o arquivo `.service.ts` correspondente antes de gerar código.
