# myFinance — AI Kit

> **Leia este arquivo antes de gerar qualquer código para este projeto.**

Esta pasta `/docs/ai/` é o **kit de contexto obrigatório** para qualquer IA (Bolt, Claude, ChatGPT etc.)
que trabalhe neste repositório. Siga os documentos na ordem numérica antes de responder a qualquer tarefa.

---

## Stack Resumido

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Frontend framework | React | 18.x |
| Bundler | Vite | 5.x |
| Linguagem | TypeScript | 5.x |
| CSS | TailwindCSS | 3.x |
| Roteamento | React Router DOM | 7.x |
| Gerenciamento de estado/cache | TanStack React Query | 5.x |
| Formulários | React Hook Form + Zod | 7.x / 4.x |
| Backend/BaaS | Supabase | 2.x |
| Banco de dados | PostgreSQL (via Supabase) | gerenciado |
| Auth | Supabase Auth | — |
| Componentes drag-and-drop | @dnd-kit | 6.x |

> **Não há backend separado.** Todo acesso a dados é feito via `supabase-js` diretamente no front-end.
> RLS (Row Level Security) do Supabase é a única barreira de segurança de dados.

---

## Estrutura da Pasta AI Kit

| Arquivo | Conteúdo |
|---------|---------|
| `00-README.md` | Este arquivo — visão geral e regras de uso |
| `01-ARCHITECTURE.md` | Diagrama de arquitetura, pastas e responsabilidades |
| `02-CONVENTIONS.md` | Convenções de código, nomes, respostas, erros, datas, dinheiro |
| `03-API-CONTRACTS.md` | Contratos de dados entre front e Supabase |
| `04-DATABASE.md` | Tabelas, colunas principais, RLS e migrations |
| `05-SECURITY.md` | RLS, autenticação, variáveis de ambiente |
| `06-EXAMPLES.md` | Exemplos práticos de código alinhados ao padrão |
| `07-TASK-TEMPLATE.md` | Template de tarefa para qualquer feature/bugfix |

---

## Regras para a IA

1. **Detecte antes de inventar.** Sempre verifique se um `service`, `hook` ou `type` já existe antes de criar um novo.
2. **Siga os padrões de `02-CONVENTIONS.md`.** Toda resposta deve seguir o formato padronizado.
3. **Não altere lógica de negócio existente** sem necessidade explícita.
4. **Toda mudança de DB** deve vir com uma migration SQL nova em `/supabase/migrations/`.
5. **Não adicione dependências** sem justificativa e sem aprovação do dev.
6. **Use o template** de `07-TASK-TEMPLATE.md` para qualquer tarefa estruturada.

---

## Prompt Padrão (cole antes de toda tarefa)

```
Repositório: myFinance — SPA React + TypeScript + Supabase (sem backend separado)
Leia /docs/ai/ antes de responder.

Contexto obrigatório:
- Stack: React 18, Vite 5, TypeScript 5, TailwindCSS 3, React Query v5, Zod 4, Supabase JS v2
- Padrão de serviços: src/services/*.service.ts → chamada direta ao supabase JS client
- Padrão de hooks: src/hooks/use*.ts → useQuery / useMutation do React Query
- Padrão de tipos: src/types/index.ts (snake_case para campos do DB)
- Banco: PostgreSQL via Supabase. Toda tabela tem RLS habilitada. Migrations em /supabase/migrations/
- Dinheiro: números float no DB (ex: 1500.50). Exibição: toLocaleString('pt-BR', currency BRL)
- Datas: ISO 8601 (YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ssZ). Biblioteca: date-fns
- Workspace é o tenant raiz. Todo dado pertence a um workspace_id.

Tarefa: [DESCREVA AQUI]
Arquivos a criar/alterar: [LISTE AQUI]
```
