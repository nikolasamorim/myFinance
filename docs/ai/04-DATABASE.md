# myFinance — Banco de Dados

> Banco: **PostgreSQL** gerenciado pelo **Supabase**.
> Migrations em: `/supabase/migrations/` (32 arquivos, aplicados em ordem cronológica).

---

## Convenções de Banco

| Regra | Detalhe |
|-------|---------|
| Nomes de tabela | `snake_case` plural |
| Nomes de coluna | `snake_case` com prefixo da tabela (ex: `transaction_id`) |
| PKs | UUID gerado pelo PostgreSQL (`gen_random_uuid()`) |
| FKs | mesmo nome da PK referenciada na outra tabela |
| Timestamps | `created_at TIMESTAMPTZ DEFAULT now()` e `updated_at` |
| Soft delete | **Não implementado** — exclusão é física (`DELETE`) |
| RLS | Habilitado em **todas** as tabelas |

---

## Tabelas Principais

### `users`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `user_id` | UUID (PK) | = `auth.uid()` do Supabase Auth |
| `name` | TEXT | Nome do usuário |
| `email` | TEXT | Email |
| `avatar_url` | TEXT | URL do avatar |
| `created_at` | TIMESTAMPTZ | |

### `workspaces`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `workspace_id` | UUID (PK) | |
| `workspace_name` | TEXT | |
| `workspace_type` | TEXT | `personal`, `family`, `business` |
| `workspace_icon` | TEXT | |
| `workspace_owner_user_id` | UUID (FK → users) | |
| `workspace_created_at` | TIMESTAMPTZ | |

### `workspace_users`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `workspace_user_workspace_id` | UUID (FK → workspaces) | |
| `workspace_user_user_id` | UUID (FK → users) | |
| `role` | TEXT | ex: `owner`, `member` |

### `transactions`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `transaction_id` | UUID (PK) | |
| `transaction_workspace_id` | UUID (FK → workspaces) | **tenant** |
| `transaction_type` | TEXT | `expense`, `income`, `debt`, `investment` |
| `transaction_description` | TEXT | |
| `transaction_amount` | NUMERIC | Float em reais (ex: 1500.50) |
| `transaction_date` | DATE | Data principal |
| `transaction_issue_date` | DATE | Data de emissão |
| `transaction_competence_date` | DATE | Data de competência |
| `transaction_payment_method` | TEXT | |
| `transaction_is_paid` | BOOLEAN | |
| `transaction_status` | TEXT | `pending`, `paid`, `received` |
| `transaction_category_id` | UUID (FK) | |
| `transaction_cost_center_id` | UUID (FK) | |
| `transaction_bank_id` | UUID (FK) | |
| `transaction_card_id` | UUID (FK) | |
| `recurrence_id` | UUID (FK) | |
| `installment_group_id` | UUID (FK) | |
| `installment_number` | INT | número da parcela |
| `installment_total` | INT | total de parcelas |
| `transaction_created_at` | TIMESTAMPTZ | |
| `transaction_updated_at` | TIMESTAMPTZ | atualizado via trigger |

### `accounts`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | ⚠️ sem prefixo (exceção histórica) |
| `workspace_id` | UUID (FK → workspaces) | **tenant** |
| `title` | TEXT | |
| `type` | TEXT | `cash`, `bank` |
| `initial_balance` | NUMERIC | float em reais |
| `opened_at` | DATE | |
| `cost_center_id` | UUID (FK) | |
| `color` | TEXT | hex color |
| `icon` | TEXT | nome do ícone |
| `description` | TEXT | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### `categories`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `category_id` | UUID (PK) | |
| `category_name` | TEXT | |
| `category_type` | TEXT | `expense`, `income`, `debt`, `investment` |
| `category_workspace_id` | UUID (FK → workspaces) | **tenant** |

### `cost_centers`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | |
| `workspace_id` | UUID (FK) | **tenant** |
| `name` | TEXT | |
| `description` | TEXT | |
| `color` | TEXT | |
| `icon` | TEXT | |
| `created_at` | TIMESTAMPTZ | |

### `credit_cards`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| — | — | Colunas prefixadas com `credit_card_*` |
| `credit_card_workspace_id` | UUID (FK) | **tenant** |
| `credit_card_limit` | NUMERIC | |
| `credit_card_closing_day` | INT | dia de fechamento (1-31) |
| `credit_card_due_day` | INT | dia de vencimento (1-31) |

### `recurrence_rules`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | |
| `workspace_id` | UUID (FK) | **tenant** |
| `status` | TEXT | `active`, `paused`, `canceled`, `completed`, `error` |
| `recurrence_type` | TEXT | `daily`, `weekly`, `monthly`, `yearly` |
| `start_date` | DATE | |
| `end_date` | DATE | null = infinito |
| `repeat_count` | INT | null = infinito |
| `due_adjustment` | TEXT | `none`, `previous_business_day`, `next_business_day` |
| `recurrence_day` | INT | para `monthly`: dia do mês |
| `timezone` | TEXT | ex: `America/Sao_Paulo` |
| `generation_count` | INT | total gerado |
| `generated_until` | DATE | última data gerada |
| `next_run_at` | TIMESTAMPTZ | |
| `error_count` | INT | |
| `last_error_message` | TEXT | |

### `installment_groups`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | |
| `workspace_id` | UUID (FK) | **tenant** |
| `total_value` | NUMERIC | |
| `installment_count` | INT | |
| `initial_due_date` | DATE | |
| `description` | TEXT | |

---

## RLS (Row Level Security)

**Todas as tabelas têm RLS habilitado.**

### Padrão de política (`workspaces_owner_access`):
```sql
CREATE POLICY "nome_policy" ON tabela
  FOR ALL
  USING (auth.uid() = campo_owner)
  WITH CHECK (auth.uid() = campo_owner);
```

### Padrão para tabelas com tenant via subquery:
```sql
CREATE POLICY "transactions_workspace_access" ON transactions
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT workspace_owner_user_id
      FROM workspaces
      WHERE workspace_id = transaction_workspace_id
    )
  );
```

> **IMPORTANTE:** Para qualquer nova tabela, sempre adicione RLS com política baseada no
> `workspace_id` ou `user_id`. Nunca crie tabela sem policy.

---

## Como criar uma Migration

```bash
# Gera um novo arquivo de migration
supabase migration new <nome-descritivo>

# Aplica localmente (se usando Supabase local)
supabase db push

# Aplica no Supabase Cloud via dashboard SQL Editor ou CLI
```

### Template de migration:
```sql
/*
  # [Título da Migration]

  1. Novas Tabelas / Alterações
    - [descreva o que está sendo criado/alterado]

  2. Segurança
    - [descreva as RLS policies adicionadas]
*/

-- Sua SQL aqui
```

---

## Triggers Existentes

- `update_updated_at_trigger` — atualiza `updated_at` automaticamente em diversas tabelas.
  Definido na migration `20260212184513_fix_update_updated_at_trigger_function.sql`.
