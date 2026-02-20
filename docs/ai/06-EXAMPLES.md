# myFinance — Exemplos Práticos

> Todos os exemplos seguem os padrões de `02-CONVENTIONS.md` e `03-API-CONTRACTS.md`.
> Use como referência ao gerar código novo.

---

## 1. Criar um Service (Account)

```typescript
// src/services/account.service.ts — padrão completo
import { supabase } from '../lib/supabase';

export interface AccountData {
  title: string;
  type: 'cash' | 'bank';
  initial_balance: number; // float em reais
  opened_at: string;       // YYYY-MM-DD
  cost_center_id?: string | null;
  color?: string;
  icon?: string;
  description?: string;
}

export const accountService = {
  async createAccount(workspaceId: string, accountData: AccountData) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('accounts')
      .insert([{
        workspace_id: workspaceId,
        ...accountData,
      }])
      .select()
      .single();

    if (error) throw new Error('Failed to create account: ' + error.message);
    return data;
  },

  async getAccounts(workspaceId: string, page = 1, limit = 10, search?: string) {
    let query = supabase
      .from('accounts')
      .select('*', { count: 'exact' })
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (search) query = query.ilike('title', `%${search}%`);

    const { data, error, count } = await query;
    if (error) throw new Error('Failed to fetch accounts: ' + error.message);

    return { data: data ?? [], total: count ?? 0 };
  },

  async updateAccount(id: string, updates: Partial<AccountData>) {
    const { data, error } = await supabase
      .from('accounts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error('Failed to update account: ' + error.message);
    return data;
  },

  async deleteAccount(id: string) {
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', id);

    if (error) throw new Error('Failed to delete account: ' + error.message);
  },
};
```

---

## 2. Criar um Hook (React Query v5)

```typescript
// src/hooks/useAccounts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountService, type AccountData } from '../services/account.service';

export function useAccounts(workspaceId: string, page = 1, limit = 10, search?: string) {
  return useQuery({
    queryKey: ['accounts', workspaceId, page, limit, search],
    queryFn: () => accountService.getAccounts(workspaceId, page, limit, search),
    enabled: !!workspaceId,
    staleTime: 1000 * 60 * 5, // 5 min
  });
}

export function useCreateAccount(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AccountData) => accountService.createAccount(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts', workspaceId] });
    },
  });
}

export function useUpdateAccount(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<AccountData> }) =>
      accountService.updateAccount(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts', workspaceId] });
    },
  });
}

export function useDeleteAccount(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => accountService.deleteAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts', workspaceId] });
    },
  });
}
```

---

## 3. Listar com Paginação e Filtro (Componente)

```typescript
// Exemplo de uso em componente
function AccountList() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.workspace_id ?? '';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading, error } = useAccounts(workspaceId, page, 10, search);

  if (isLoading) return <p>Carregando...</p>;
  if (error) return <p>Erro: {(error as Error).message}</p>;

  return (
    <div>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." />
      {data?.data.map(account => (
        <div key={account.id}>
          {account.title} — {account.initial_balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </div>
      ))}
      <p>Total: {data?.total}</p>
      <button onClick={() => setPage(p => Math.max(1, p - 1))}>Anterior</button>
      <button onClick={() => setPage(p => p + 1)}>Próxima</button>
    </div>
  );
}
```

---

## 4. Formulário com React Hook Form + Zod

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';

const accountSchema = z.object({
  title: z.string().min(1, 'Nome obrigatório').max(100),
  type: z.enum(['cash', 'bank']),
  initial_balance: z.number().min(0, 'Saldo deve ser >= 0'),
  opened_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato: YYYY-MM-DD'),
  color: z.string().optional(),
  icon: z.string().optional(),
  description: z.string().optional(),
});

type AccountFormData = z.infer<typeof accountSchema>;

function AccountForm() {
  const { currentWorkspace } = useWorkspace();
  const createAccount = useCreateAccount(currentWorkspace?.workspace_id ?? '');

  const { register, handleSubmit, formState: { errors } } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: { type: 'bank', initial_balance: 0 },
  });

  const onSubmit = async (data: AccountFormData) => {
    try {
      await createAccount.mutateAsync(data);
      // sucesso
    } catch (err) {
      console.error('Erro ao criar conta:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('title')} placeholder="Nome da conta" />
      {errors.title && <span>{errors.title.message}</span>}

      <select {...register('type')}>
        <option value="bank">Banco</option>
        <option value="cash">Caixa</option>
      </select>

      <button type="submit" disabled={createAccount.isPending}>
        {createAccount.isPending ? 'Salvando...' : 'Salvar'}
      </button>
    </form>
  );
}
```

---

## 5. Erro de Validação — Tratamento Padrão

```typescript
// Mapear erro do Supabase para mensagem amigável
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message;
    if (msg.includes('23505')) return 'Este registro já existe.';
    if (msg.includes('23503')) return 'Dependência inválida — verifique os campos relacionados.';
    if (msg.includes('42501')) return 'Você não tem permissão para esta operação.';
    if (msg.includes('PGRST116')) return 'Registro não encontrado.';
    return msg;
  }
  return 'Erro desconhecido. Tente novamente.';
}

// Uso no componente
<p className="text-red-500">{getErrorMessage(createAccount.error)}</p>
```

---

## 6. Criar Migration SQL para Nova Tabela

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_nome_da_feature.sql

/*
  # Adicionar tabela de metas financeiras

  1. Novas Tabelas
    - `goals` — metas financeiras por workspace

  2. Segurança
    - Habilitar RLS
    - Adicionar policy de acesso por workspace
*/

CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount NUMERIC NOT NULL,
  current_amount NUMERIC NOT NULL DEFAULT 0,
  deadline DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "goals_workspace_access" ON goals
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT workspace_owner_user_id
      FROM workspaces
      WHERE workspace_id = goals.workspace_id
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT workspace_owner_user_id
      FROM workspaces
      WHERE workspace_id = goals.workspace_id
    )
  );

-- Trigger para atualizar updated_at
CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## 7. Formatar Dinheiro e Datas

```typescript
// Dinheiro
const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

formatCurrency(1500.50)  // "R$ 1.500,50"
formatCurrency(-250)     // "-R$ 250,00"

// Data curta
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatDate = (iso: string) =>
  format(parseISO(iso), 'dd/MM/yyyy', { locale: ptBR });

formatDate('2025-08-05')  // "05/08/2025"

// Mês por extenso
const formatMonth = (iso: string) =>
  format(parseISO(iso), "MMMM 'de' yyyy", { locale: ptBR });

formatMonth('2025-08-01')  // "agosto de 2025"
```
