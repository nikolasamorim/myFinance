# myFinance

Sistema completo de gestao financeira pessoal e empresarial, construido como monorepo com frontend web, backend API serverless e app mobile.

---

## Plataformas e Servicos

| Plataforma | Uso |
|---|---|
| **Supabase** | Banco de dados PostgreSQL, autenticacao (Auth), Row-Level Security (RLS), Storage |
| **Netlify** | Hospedagem do frontend (SPA), deploy da API como Netlify Functions (serverless) |
| **Pluggy** | Integracao Open Finance — conexao direta com bancos brasileiros para importacao automatica de transacoes |

---

## Arquitetura

```
                         +-----------+
                         |  Netlify  |
                         |  (host)   |
                         +-----+-----+
                               |
              +----------------+----------------+
              |                                 |
     apps/web (SPA)               netlify/functions/api.ts
     React + Vite                 (serverless-http wrapper)
     Tailwind CSS                        |
              |                   apps/api (Express)
              |                          |
              +----------+----------+----+
                         |
                   +-----+-----+
                   |  Supabase |
                   | PostgreSQL|
                   |  Auth/RLS |
                   +-----------+
                         |
              +----------+----------+
              |                     |
     netlify/functions/       Pluggy API
     banking-*.ts             (Open Finance)
     (serverless avulsas)
```

**Fluxo de dados:** O frontend web se comunica exclusivamente com o backend Express via `apiClient`. O Express roda como uma unica Netlify Function (`serverless-http`) em producao e como servidor standalone em desenvolvimento. Todas as queries ao Supabase passam pelo backend com o JWT do usuario autenticado, garantindo que as politicas de RLS sejam aplicadas.

As funcoes de banking (Pluggy) rodam como Netlify Functions independentes, separadas do Express.

---

## Estrutura do Monorepo

```
myfinance-monorepo/
|
+-- apps/
|   +-- web/                    # Frontend React (SPA)
|   +-- api/                    # Backend Express
|   +-- mobile/                 # App mobile React Native + Expo (em desenvolvimento)
|
+-- packages/
|   +-- shared/                 # Tipos TypeScript compartilhados entre apps
|
+-- netlify/
|   +-- functions/
|       +-- api.ts              # Wrapper serverless do Express
|       +-- banking-*.ts        # Functions avulsas de Open Finance (Pluggy)
|       +-- _lib/               # Utilitarios compartilhados entre functions
|
+-- supabase/
|   +-- migrations/             # 41 migrations SQL (schema completo)
|
+-- netlify.toml                # Config de deploy, redirects, functions
+-- package.json                # Workspaces (npm workspaces)
```

---

## Apps

### `apps/web` — Frontend

| Tecnologia | Versao | Finalidade |
|---|---|---|
| React | 18.3 | UI library |
| Vite | 5.4 | Bundler e dev server |
| TypeScript | 5.5 | Tipagem estatica |
| Tailwind CSS | 3.4 | Estilizacao (dark/light mode via CSS variables) |
| React Router | 7 | Roteamento SPA |
| TanStack React Query | 5.84 | Cache, fetching e mutacoes |
| React Hook Form + Zod | 7 / 4 | Formularios e validacao |
| Lucide React | — | Icones |
| @dnd-kit | — | Drag-and-drop (kanban, ordenacao) |
| date-fns | 4 | Manipulacao de datas |

**Estrutura interna:**

```
src/
+-- pages/              # 20+ paginas (Dashboard, Receitas, Despesas, Cartoes, etc.)
+-- components/         # 50+ componentes organizados por dominio
|   +-- ui/             # 15 componentes reutilizaveis (Button, Modal, Card, Input...)
|   +-- dashboard/      # KPI cards, graficos, distribuicao
|   +-- transactions/   # Modais de transacao, tabela, parcelamento
|   +-- reconciliation/ # Interface de conciliacao bancaria
|   +-- kanban/         # Board, Column, Card
|   +-- workspace/      # Modais de workspace, importacao OFX
|   +-- onboarding/     # Fluxo guiado de 6 etapas
+-- hooks/              # 25 hooks (useTransactions, useDashboard, useReconciliation...)
+-- services/           # 23 services de acesso a API
+-- context/            # 5 context providers (Auth, Workspace, Theme, Sidebar, Onboarding)
+-- lib/                # apiClient, supabase client, OFX parser, utilitarios
+-- types/              # Tipos de dominio e filtros
```

### `apps/api` — Backend

| Tecnologia | Versao | Finalidade |
|---|---|---|
| Express | 4.19 | Framework HTTP |
| Supabase JS | 2.53 | Client para PostgreSQL e Auth |
| serverless-http | 4.0 | Adaptador para Netlify Functions |
| Helmet | 7 | Headers de seguranca |
| TypeScript | 5.5 | Tipagem estatica |

**Rotas da API** — todas sob `/api/v1`:

| Rota | Descricao |
|---|---|
| `/health` | Health check |
| `/auth` | Login, registro, logout, refresh |
| `/users` | Perfil do usuario |
| `/workspaces` | CRUD de workspaces |
| `/workspaces/:wid/transactions` | Transacoes (CRUD, batch, filtros avancados) |
| `/workspaces/:wid/accounts` | Contas bancarias |
| `/workspaces/:wid/categories` | Categorias hierarquicas |
| `/workspaces/:wid/cost-centers` | Centros de custo |
| `/workspaces/:wid/credit-cards` | Cartoes de credito |
| `/workspaces/:wid/credit-cards/:cardId/statements` | Faturas do cartao |
| `/workspaces/:wid/recurrence-rules` | Regras de recorrencia |
| `/workspaces/:wid/installment-groups` | Grupos de parcelamento |
| `/workspaces/:wid/reconciliations` | Conciliacao bancaria |
| `/workspaces/:wid/dashboard` | Dados agregados do dashboard |
| `/workspaces/:wid/visualizations` | Configuracoes de graficos |
| `/workspaces/:wid/notifications` | Notificacoes |
| `/workspaces/:wid/notification-preferences` | Preferencias de notificacao |
| `/workspaces/:wid/activity-logs` | Logs de auditoria |
| `/workspaces/:wid/migrations` | Migracao entre workspaces |
| `/banking` | Integracao Open Finance (Pluggy) |

**Middleware:**
- `auth.ts` — Verificacao de JWT via Supabase Auth, injeta `req.user` e `req.supabase` (client autenticado)
- `errorHandler.ts` — Tratamento global de erros

### `apps/mobile` — Mobile (em desenvolvimento)

| Tecnologia | Versao | Finalidade |
|---|---|---|
| React Native | 0.83 | Framework mobile |
| Expo | 55 | Toolchain e build |
| React Navigation | 6 | Navegacao (bottom tabs) |
| TanStack React Query | 5.84 | Cache e fetching |

Atualmente possui a estrutura base com `apiClient`, autenticacao e services de dashboard/transacoes/workspace. Telas ainda nao foram implementadas.

### `packages/shared` — Tipos Compartilhados

Pacote interno que exporta todas as interfaces e tipos TypeScript usados por web, API e mobile: `User`, `Workspace`, `Transaction`, `Account`, `Category`, `CreditCard`, `RecurrenceRule`, `InstallmentGroup`, `Notification`, entre outros.

---

## Banco de Dados

**Supabase (PostgreSQL)** com 41 migrations versionadas e Row-Level Security em todas as tabelas.

**Principais tabelas:**

| Tabela | Descricao |
|---|---|
| `users` | Perfis de usuario |
| `workspaces` | Workspaces (pessoal, familiar, empresarial) |
| `workspace_members` | Membros e papeis (owner, admin, member) |
| `accounts` | Contas bancarias e financeiras |
| `transactions` | Todas as transacoes financeiras |
| `categories` | Categorias hierarquicas |
| `cost_centers` | Centros de custo hierarquicos |
| `credit_cards` | Cartoes de credito |
| `banks` | Instituicoes financeiras |
| `recurrence_rules` | Configuracoes de recorrencia |
| `installment_groups` | Agrupamento de parcelas |
| `notifications` | Notificacoes do sistema |
| `notification_preferences` | Preferencias por tipo de notificacao |
| `bank_reconciliations` | Conciliacoes bancarias |
| `pluggy_connections` | Conexoes Open Finance ativas |
| `visualizations` | Graficos customizados salvos |
| `activity_logs` | Trilha de auditoria |

---

## Funcionalidades

### Gestao Financeira
- Transacoes de receita, despesa, divida e investimento
- Parcelamento com acompanhamento por parcela
- Recorrencias automaticas (diaria, semanal, mensal, anual)
- Multiplas contas bancarias com hierarquia
- Cartoes de credito com controle de fatura e vencimento
- Categorias e centros de custo hierarquicos

### Open Finance e Importacao
- Conexao direta com bancos via Pluggy (Open Finance Brasil)
- Importacao de extratos OFX
- Conciliacao bancaria inteligente com scoring de matching automatico

### Dashboard e Visualizacoes
- KPIs financeiros (saldo, receita, despesa, economia)
- Graficos de fluxo mensal e distribuicao por categoria
- Kanban board para gestao visual
- Visualizacoes customizaveis e salvaveis
- Filtros avancados multi-criterio

### Colaboracao
- Workspaces multi-tenant (pessoal, familiar, empresarial)
- Controle de acesso por papeis (owner, admin, member)
- Times dentro de workspaces
- Migracao de dados entre workspaces
- Logs de atividade (auditoria)

### Notificacoes
- Centro de notificacoes in-app
- Alertas de vencimento de fatura
- Preferencias configuracoes por tipo

---

## Setup Local

### Pre-requisitos

- Node.js 20+
- npm 9+
- Projeto no [Supabase](https://supabase.com) com as migrations aplicadas

### 1. Clonar e instalar

```bash
git clone <repo-url>
cd myFinance
npm install
```

### 2. Configurar variaveis de ambiente

```bash
# Raiz (para Netlify Functions)
cp .env.example .env

# Frontend
cp apps/web/.env.example apps/web/.env

# Backend
cp apps/api/.env.example apps/api/.env
```

Preencha com as credenciais do Supabase (URL, anon key, service role key) e, opcionalmente, as credenciais da Pluggy para Open Finance.

### 3. Rodar em desenvolvimento

```bash
# Web + API simultaneamente
npm run dev

# Ou individualmente
npm run dev:web    # http://localhost:5173
npm run dev:api    # http://localhost:3001

# Mobile (Expo)
npm run dev:mobile
```

### 4. Build

```bash
npm run build         # Web + API
npm run typecheck     # Verificacao de tipos
npm run test          # Testes
```

---

## Deploy

O projeto esta configurado para deploy na **Netlify**:

- **Frontend** — Build do Vite, servido como SPA com fallback para `index.html`
- **API** — Express empacotado via `serverless-http` como uma unica Netlify Function
- **Banking** — Functions avulsas para integracao Pluggy
- **Roteamento** — `/api/*` redirecionado para a function `api`, SPA fallback para todas as outras rotas

Variaveis de ambiente devem ser configuradas no painel da Netlify.

---

## Scripts

| Script | Descricao |
|---|---|
| `npm run dev` | Inicia web + API em paralelo |
| `npm run dev:web` | Inicia apenas o frontend (Vite) |
| `npm run dev:api` | Inicia apenas a API (tsx watch) |
| `npm run dev:mobile` | Inicia o app mobile (Expo) |
| `npm run build` | Build de producao (web + API) |
| `npm run build:web` | Build apenas do frontend |
| `npm run build:api` | Build apenas da API |
| `npm run typecheck` | Verificacao de tipos (web + API) |
| `npm run lint` | Linting do frontend |
| `npm run test` | Testes (web + API) |
