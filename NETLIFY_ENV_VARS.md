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
| `CORS_ORIGINS` | Origens permitidas para a API Express (lista separada por vírgula) | `https://app.azamifinanceiro.com,http://localhost:5173` |
| `API_ORIGIN` | URL pública desta API — monta o `redirect_to` do OAuth Google. **Necessária em produção** (sem ela o fluxo cai em `localhost`) | `https://app.azamifinanceiro.com` |
| `WEB_ORIGIN` | URL do frontend — destino do redirect após o OAuth. **Necessária em produção** | `https://app.azamifinanceiro.com` |
| `NODE_ENV` | Ambiente de execução | `production` (configurado automaticamente pelo Netlify) |
| `SUPABASE_JWT_SECRET` | Segredo HS256 do JWT — habilita verificação local do token na API (sem round-trip ao Auth). Settings → API → JWT Settings → JWT Secret | *(ausente → fallback `getUser` remoto)* |
| `INTERNAL_FUNCTION_TOKEN` | Token compartilhado que protege a background function de import (`banking-import-background`). Quando setado, o webhook envia e a function exige no header `x-internal-token` | *(ausente → sem proteção)* |
| `WEBHOOK_SECRET` | Segredo para validar o webhook da Pluggy. Registre a URL do webhook com `?token=<secret>`. Quando setado, requisições sem o token correto são ignoradas | *(ausente → validação pulada)* |
| `PLUGGY_CLIENT_ID` | Client ID da Pluggy — **obrigatória para Open Finance**. Antes hardcoded no código (removido) | *(painel da Pluggy)* |
| `PLUGGY_CLIENT_SECRET` | Client Secret da Pluggy — **obrigatória para Open Finance**. ⚠️ rotacione o secret antigo (estava versionado) | *(painel da Pluggy)* |
| `PLUGGY_WEBHOOK_URL` | URL do webhook registrada na Pluggy | `https://app.azamifinanceiro.com/.netlify/functions/banking-webhook` |
| `PLUGGY_CONNECTOR_IDS` | IDs de conectores permitidos (trial: `0`) | *(vazio → todos)* |

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
