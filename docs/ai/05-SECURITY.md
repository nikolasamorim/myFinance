# myFinance — Segurança

---

## 1. Autenticação

O sistema usa **Supabase Auth** (JWT).

- O token JWT é armazenado automaticamente no `localStorage` pelo Supabase JS.
- O AuthContext monitora mudanças via `supabase.auth.onAuthStateChange()`.
- Rotas protegidas são guardadas pelo componente `ProtectedRoute`.

```typescript
// Validar autenticação em services
const { data: { user } } = await supabase.auth.getUser();
if (!user) throw new Error('User not authenticated');
```

---

## 2. Autorização (RLS)

**Row Level Security** é a única barreira de acesso aos dados.
Toda tabela tem RLS habilitado. O Supabase JS usa automaticamente o JWT do usuário.

### Regras vigentes

| Tabela | Política | Acesso |
|--------|----------|--------|
| `users` | `users_own_profile` | Usuário acessa apenas seu perfil |
| `workspaces` | `workspaces_owner_access` | Dono acessa seu workspace |
| `transactions` | `transactions_workspace_access` | Membro do workspace |
| `accounts` | `accounts_workspace_access` | Membro do workspace |
| `categories` | `categories_workspace_access` | Membro do workspace |
| `cost_centers` | `cost_centers_workspace_access` | Membro do workspace |
| `credit_cards` | `credit_cards_workspace_access` | Membro do workspace |
| `recurrence_rules` | ver migration específica | Membro do workspace |

> Se criar **nova tabela**, é **obrigatório** adicionar RLS. Sem policy = dados expostos a todos os usuários autenticados.

---

## 3. Variáveis de Ambiente

```bash
# .env (nunca commitar no git — já no .gitignore)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...

# .env.example (commitar com valores vazios)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

> **ATENÇÃO:** A `ANON_KEY` é pública por design (usada no browser). A segurança real é feita pelo RLS.
> A `SERVICE_ROLE_KEY` (admin, bypass RLS) **NUNCA deve ser usada no frontend**.

---

## 4. Regras para IA — Segurança

- **Nunca use `service_role` no frontend.**
- **Toda nova tabela precisa de RLS.** Copie o padrão do `04-DATABASE.md`.
- **Nunca exponha dados de outros workspaces.** Sempre filtre por `workspace_id`.
- **Não armazene senhas.** Use apenas Supabase Auth.
- **Não crie endpoints ou funções que recebam `user_id` como input do cliente** — sempre derive de `auth.uid()`.

---

## 5. Headers de Segurança Supabase

O client Supabase JS envia automaticamente:

```http
Authorization: Bearer <access_token>
apikey: <anon_key>
```

Não é necessário configurar manualmente em nenhuma chamada.

---

## 6. Onboarding e Acesso Inicial

```
Novo usuário → Register → Supabase Auth cria user
             → Trigger (ou service) cria perfil em `users`
             → Redirect para /onboarding
             → Usuário cria Workspace
             → Redirect para /dashboard
```

Rotas públicas: `/login`, `/register`
Rotas protegidas: todas as demais (via `ProtectedRoute`)
Rota de onboarding: `/onboarding` (via `OnboardingRoute`)
