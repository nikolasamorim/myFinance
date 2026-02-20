# myFinance — Arquitetura

## Visão Geral

O myFinance é uma **SPA (Single Page Application)** sem backend próprio.
Todo acesso a dados é feito via **Supabase JS Client** diretamente no navegador.
A segurança entre usuários é garantida por **RLS (Row Level Security)** no PostgreSQL.

```
┌─────────────────────────────────────────────┐
│               Browser (SPA)                  │
│                                              │
│  React Pages → Components → Hooks           │
│                    ↓                         │
│             Services (supabase-js)           │
│                    ↓                         │
│  ┌─────────────────────────────────────┐    │
│  │       Supabase (BaaS)               │    │
│  │  Auth  │  PostgreSQL  │  Storage   │    │
│  │        │  (RLS ativo) │            │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

---

## Estrutura de Pastas (src/)

```
src/
├── App.tsx                    # Roteamento raiz + providers
├── main.tsx                   # Entry point
├── pages/                     # Telas completas (rotas)
│   ├── Dashboard.tsx
│   ├── History.tsx
│   ├── Invoice.tsx
│   ├── Login.tsx / Register.tsx / Onboarding.tsx
│   ├── Settings.tsx
│   ├── managers/              # Gerenciadores (contas, cartões, etc.)
│   └── organizadores/         # Organizadores (categorias, CCs, etc.)
├── components/                # Componentes reutilizáveis
│   ├── ui/                    # Primitivos (Button, Modal, Badge, etc.)
│   ├── layout/                # Header, Sidebar, Layout
│   ├── dashboard/             # Cards e gráficos do Dashboard
│   ├── transactions/          # Formulários e listas de transações
│   ├── creditCards/           # Componentes de cartão
│   ├── kanban/                # Quadro kanban
│   ├── hierarchy/             # Hierarquia de CCs/categorias
│   └── onboarding/            # Passos de onboarding
├── services/                  # Acesso a dados via Supabase JS
│   ├── auth.service.ts        # Login, registro, logout
│   ├── workspace.service.ts   # CRUD de workspaces
│   ├── transaction.service.ts # CRUD básico de transações
│   ├── advancedTransaction.service.ts  # Parcelado + recorrente
│   ├── account.service.ts     # Contas bancárias/caixa
│   ├── category.service.ts    # Categorias
│   ├── costCenter.service.ts  # Centros de custo
│   ├── creditCard.service.ts  # Cartões de crédito
│   ├── invoice.service.ts     # Faturas de cartão
│   ├── dashboard.service.ts   # Agregados do Dashboard
│   ├── recurrence.service.ts  # Regras de recorrência
│   ├── recurrenceEngine.service.ts  # Motor de geração
│   ├── installment.service.ts # Grupos de parcelas
│   ├── statements.service.ts  # Extratos
│   ├── user.service.ts        # Perfil do usuário
│   ├── visualization.service.ts # Configurações de visualização
│   └── activityLog.service.ts # Log de atividades
├── hooks/                     # React Query hooks (um por domínio)
│   ├── useTransactions.ts
│   ├── useDespesas.ts / useReceitas.ts
│   ├── useAccounts.ts
│   ├── useCategories.ts
│   ├── useCostCenters.ts
│   ├── useCreditCards.ts
│   ├── useInvoiceData.ts
│   ├── useDashboard.ts / useDashboardData.ts
│   └── ...
├── context/                   # React Contexts globais
│   ├── AuthContext.tsx         # Estado de autenticação
│   └── WorkspaceContext.tsx    # Workspace ativo
├── types/
│   └── index.ts               # Todos os tipos TypeScript do projeto
├── lib/
│   ├── supabase.ts            # Instância do supabase client
│   └── utils.ts               # Helpers gerais
└── utils/                     # Utilitários de UI (formatação, etc.)
```

---

## Supabase / Banco de Dados

```
supabase/
├── migrations/       # 32 migrations SQL (aplicar via Supabase CLI ou dashboard)
└── functions/        # Edge Functions (ainda não utilizadas ativamente)
```

### Tabelas principais (inferidas das migrations e types)

| Tabela | PK | Tenant |
|--------|----|--------|
| `users` | `user_id` | próprio user |
| `workspaces` | `workspace_id` | `workspace_owner_user_id` |
| `workspace_users` | — | `workspace_user_workspace_id` |
| `transactions` | `transaction_id` | `transaction_workspace_id` |
| `accounts` | `id` | `workspace_id` |
| `categories` | `category_id` | `category_workspace_id` |
| `cost_centers` | `id` | `workspace_id` |
| `credit_cards` | — | `credit_card_workspace_id` |
| `recurrence_rules` | `id` | `workspace_id` |
| `installment_groups` | `id` | `workspace_id` |

---

## Padrão de Camadas (front-end)

```
Page / Component
      │
      │  chama
      ▼
  Hook (React Query)          ← src/hooks/use*.ts
      │
      │  chama
      ▼
  Service                     ← src/services/*.service.ts
      │
      │  chama
      ▼
  supabase client             ← src/lib/supabase.ts
      │
      │  HTTP / WebSocket
      ▼
  Supabase (PostgreSQL + Auth)
```

### Responsabilidades

| Camada | Responsabilidade |
|--------|-----------------|
| **Page** | Layout de tela, composição de componentes, state de UI local |
| **Component** | UI pura, recebe props, emite eventos |
| **Hook** | Cache (React Query), loading/error state, invalidação |
| **Service** | Query ao Supabase, tratamento de erro, mapeamento de dados |
| **Context** | Estado global de Auth e Workspace atual |

---

## Fluxo de Autenticação

```
Login → supabase.auth.signInWithPassword()
         → session JWT armazenada no localStorage (Supabase automático)
         → AuthContext.user atualizado via onAuthStateChange
         → ProtectedRoute valida antes de renderizar páginas protegidas
         → WorkspaceContext carrega workspaces do usuário
```

---

## Documentação Existente

Os arquivos em `/docs/` (raíz) são documentos técnicos de bugs, migrations e features específicas.
Leia-os quando for trabalhar nos temas correspondentes:

| Arquivo | Sobre |
|---------|-------|
| `ACCOUNTS_RLS_BUG_FIX.md` | Correção de bug nas políticas RLS de contas |
| `RECURRENCE_*.md` | Motor de recorrência, exemplos e implementação do job |
| `WORKSPACE_MIGRATION_*.md` | Migração de dados entre workspaces |
