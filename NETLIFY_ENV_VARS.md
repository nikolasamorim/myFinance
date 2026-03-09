# Variáveis de Ambiente — Netlify Dashboard

Configure todas as variáveis abaixo em:
**https://app.netlify.com/projects/azami-app/configuration/environment-variables**

---

## Variáveis obrigatórias

| Variável | Descrição | Valor em produção | Onde obter |
|---|---|---|---|
| `SUPABASE_URL` | URL do projeto Supabase | `https://vsaamypohfkmsgvxiwze.supabase.co` | [Supabase Dashboard](https://supabase.com/dashboard/project/vsaamypohfkmsgvxiwze/settings/api) → Project URL |
| `SUPABASE_ANON_KEY` | Chave pública anon do Supabase | *(valor do painel)* | Mesmo painel → `anon` `public` |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service_role (admin, bypassa RLS) | *(valor do painel)* | Mesmo painel → `service_role` `secret` |
| `VITE_SUPABASE_URL` | Mesmo valor de `SUPABASE_URL` | `https://vsaamypohfkmsgvxiwze.supabase.co` | Mesmo painel → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Mesmo valor de `SUPABASE_ANON_KEY` | *(valor do painel)* | Mesmo painel → `anon` `public` |
| `VITE_API_URL` | URL base da API para o frontend | `/api/v1` | Valor fixo — digite exatamente `/api/v1` |

> **⚠️ `VITE_API_URL` é obrigatória!** Sem ela, `apiClient` fica `null` e todas as chamadas da API falham silenciosamente com TypeError.
>
> **Por que duas vezes para Supabase?**
> - `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` → usadas pelas **Netlify Functions** (Node.js, servidor)
> - `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` → usadas pelo **frontend Vite** (browser, expostas ao cliente)

---

## Variáveis opcionais

| Variável | Descrição | Valor padrão |
|---|---|---|
| `CORS_ORIGINS` | Origens permitidas para a API Express | `http://localhost:5173` |
| `NODE_ENV` | Ambiente de execução | `production` (configurado automaticamente pelo Netlify) |

---

## Como configurar no Netlify

1. Acesse https://app.netlify.com/projects/azami-app/configuration/environment-variables
2. Clique em **"Add a variable"**
3. Insira cada variável da tabela acima
4. Selecione o escopo **"All scopes"** (ou pelo menos `Functions` + `Builds`)
5. Salve

---

## Forçar novo deploy após configurar

```bash
netlify deploy --prod
```

Ou faça um push para o branch `master` — o Netlify detecta automaticamente e inicia o build.

---

## Verificação pós-deploy

Após o deploy, acesse os logs da function para confirmar:
https://app.netlify.com/projects/azami-app/logs/functions/api

Você deve ver as linhas:
```
[api] function loaded — env check: { hasSupabaseUrl: true, hasAnonKey: true, hasServiceKey: true, ... }
[api] called: GET /api/v1/workspaces
```

Se `hasSupabaseUrl: false`, as variáveis não foram salvas corretamente — repita o passo 2.
