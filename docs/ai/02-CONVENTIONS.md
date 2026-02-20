# myFinance — Convenções Obrigatórias

> Qualquer IA ou dev deve seguir estas convenções em 100% do código gerado.

---

## 1. Nomenclatura

### TypeScript / JavaScript

| Elemento | Convenção | Exemplo |
|---------|-----------|---------|
| Variáveis e funções | `camelCase` | `transactionAmount`, `getAccounts()` |
| Componentes React | `PascalCase` | `TransactionCard`, `AccountList` |
| Types e Interfaces | `PascalCase` | `Transaction`, `ApiError` |
| Constantes globais | `UPPER_SNAKE_CASE` | `MAX_INSTALLMENTS` |
| Arquivos de serviço | `kebab-case.service.ts` | `account.service.ts` |
| Arquivos de hook | `camelCase` | `useAccounts.ts` |
| Arquivos de componente | `PascalCase.tsx` | `TransactionCard.tsx` |

### Banco de Dados (PostgreSQL)

| Elemento | Convenção | Exemplo |
|---------|-----------|---------|
| Tabelas | `snake_case` plural | `transactions`, `cost_centers` |
| Colunas | `snake_case` com prefixo da tabela | `transaction_id`, `workspace_name` |
| PKs | `<tabela_singular>_id` | `transaction_id`, `workspace_id` |
| FKs | mesmo nome da PK referenciada | `transaction_workspace_id` |
| Timestamps | `created_at`, `updated_at` | `transaction_created_at` |

> **Exceção:** a tabela `accounts` usa `id` (sem prefixo) como PK. Migrations antigas. Não altere sem migration.

---

## 2. Formato de Resposta dos Services

Os services retornam **dados diretos** (não encapsulados), pois o Supabase JS lida com sucesso/erro nativamente.

### Sucesso — lista

```typescript
// service retorna diretamente:
return { data: Transaction[], total: number }

// hook encapsula com React Query:
const { data, isLoading, error } = useQuery({
  queryKey: ['transactions', workspaceId],
  queryFn: () => transactionService.getTransactions(workspaceId)
})
```

### Sucesso — item único

```typescript
// service retorna o objeto diretamente:
return data as Transaction
```

### Erro

Os services lançam (`throw`) erros, que são capturados pelo React Query e expostos via `error`:

```typescript
// Padrão interno de erro nos services:
if (error) throw new Error('Failed to fetch transactions: ' + error.message)
```

### Formato de erro padronizado para uso em UI

```typescript
// Em componentes/hooks — mensagens para o usuário:
interface AppError {
  code: string;        // ex: 'NOT_FOUND', 'UNAUTHORIZED', 'VALIDATION_ERROR'
  message: string;     // mensagem legível para o usuário em PT-BR
  details?: unknown;   // dados extras opcionais (campo inválido etc.)
}
```

> **Supabase error codes** retornados diretamente (ex: `PGRST116`, `23505`) devem ser mapeados
> pelo service ou hook para um `AppError` antes de exibir ao usuário.

---

## 3. Dinheiro (Valores Monetários)

**Decisão:** valores são armazenados como **`numeric` / `float` no PostgreSQL** em reais (ex: `1500.50`).

**Justificativa:** o sistema já usa esse padrão em todas as 32 migrations. Mudar para centavos
quebraria todo o código existente. A abordagem com float requer cuidado em somas — veja abaixo.

### Regras obrigatórias

```typescript
// ✅ ARMAZENAR: float em reais
const amount = 1500.50; // R$ 1.500,50

// ✅ SOMAR: sempre use Number() para evitar string concat
const total = items.reduce((acc, t) => acc + Number(t.transaction_amount), 0);

// ✅ EXIBIR: sempre com toLocaleString
const display = amount.toLocaleString('pt-BR', {
  style: 'currency',
  currency: 'BRL',
}); // "R$ 1.500,50"

// ❌ NUNCA faça:
const wrong = item1.amount + item2.amount; // pode ser string concat
```

---

## 4. Datas

**Padrão:** ISO 8601.

```typescript
// ✅ Armazenar no DB
'2025-08-05'              // DATE (sem hora)
'2025-08-05T18:30:00Z'   // TIMESTAMPTZ

// ✅ Formatar para o usuário — use date-fns
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

format(parseISO('2025-08-05'), 'dd/MM/yyyy', { locale: ptBR })  // "05/08/2025"
format(parseISO('2025-08-05'), "MMMM 'de' yyyy", { locale: ptBR }) // "agosto de 2025"

// ❌ NUNCA use new Date() sem parseISO para strings do banco (timezone bugs)
```

---

## 5. Paginação

```typescript
// Parâmetros de entrada
interface PaginationParams {
  page: number;    // começa em 1
  limit: number;   // padrão: 10, máximo recomendado: 100
}

// Retorno do service
interface PaginatedResult<T> {
  data: T[];
  total: number;    // total de registros sem paginação
  page: number;
  limit: number;
}

// Implementação Supabase
const from = (page - 1) * limit;
const to = from + limit - 1;

const { data, count } = await supabase
  .from('transactions')
  .select('*', { count: 'exact' })
  .range(from, to);
```

---

## 6. Filtros e Ordenação

```typescript
// Busca textual
const { data } = await supabase
  .from('transactions')
  .ilike('transaction_description', `%${search}%`);

// Ordenação — padrão: decrescente por data de criação
.order('created_at', { ascending: false })

// Múltiplos filtros
.eq('transaction_type', 'expense')
.gte('transaction_date', startDate)
.lte('transaction_date', endDate)
```

---

## 7. Patterns de Hook (React Query v5)

```typescript
// useQuery — leitura
export function useAccounts(workspaceId: string) {
  return useQuery({
    queryKey: ['accounts', workspaceId],
    queryFn: () => accountService.getAccounts(workspaceId, { type: 'all', search: '' }),
    enabled: !!workspaceId,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

// useMutation — escrita
export function useCreateAccount(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AccountData) => accountService.createAccount(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts', workspaceId] });
    },
  });
}
```

---

## 8. Validação com Zod

```typescript
// Sempre defina schemas Zod para formulários
const transactionSchema = z.object({
  description: z.string().min(1, 'Descrição obrigatória'),
  amount: z.number().positive('Valor deve ser positivo'),
  transaction_type: z.enum(['expense', 'income', 'debt', 'investment']),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato inválido'),
});

type TransactionFormData = z.infer<typeof transactionSchema>;
```

---

## 9. Tenant (Workspace)

**Toda operação de dados deve incluir `workspace_id`.**

```typescript
// ✅ Correto
supabase.from('transactions').select().eq('transaction_workspace_id', workspaceId)

// ❌ Nunca busque sem filtrar pelo workspace
supabase.from('transactions').select() // retornará apenas os dados do user (RLS), mas é má prática
```

O `workspaceId` deve ser obtido do `WorkspaceContext`:

```typescript
const { currentWorkspace } = useWorkspace();
const workspaceId = currentWorkspace?.workspace_id;
```
