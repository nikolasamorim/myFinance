# Variáveis de Ambiente — Netlify Dashboard

Configure todas as variáveis abaixo em:
**https://app.netlify.com/projects/azami-app/configuration/environment-variables**

---

## Variáveis obrigatórias

| Variável | Descrição | Onde obter |
|---|---|---|
| `SUPABASE_URL` | URL do projeto Supabase | [Supabase Dashboard](https://supabase.com/dashboard/project/vsaamypohfkmsgvxiwze/settings/api) → Project URL |
| `SUPABASE_ANON_KEY` | Chave pública anon do Supabase | Mesmo painel → `anon` `public` |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service_role (admin, bypassa RLS) | Mesmo painel → `service_role` `secret` |
| `VITE_SUPABASE_URL` | Mesmo valor de `SUPABASE_URL` | Mesmo painel → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Mesmo valor de `SUPABASE_ANON_KEY` | Mesmo painel → `anon` `public` |

> **Por que duas vezes?**
> - `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` → usadas pelas **Netlify Functions** (Node.js, servidor)
> - `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` → usadas pelo **frontend Vite** (browser, expostas ao cliente)

---

## Variáveis opcionais

| Variável | Descrição | Valor padrão |
|---|---|---|
| `CORS_ORIGINS` | Origens permitidas para a API Express | `http://localhost:5173` |
| `VITE_API_URL` | URL base da API para o frontend | vazio (usa `/api` relativo) |
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
