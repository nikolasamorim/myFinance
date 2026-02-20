# myFinance — Template de Tarefa para IA

> Cole este template preenchido ao pedir qualquer feature ou bugfix.
> Quanto mais completo, menos idas e vindas.

---

```markdown
## Tarefa: [NOME CURTO]

### Tipo
- [ ] Feature nova
- [ ] Bugfix
- [ ] Refactor
- [ ] DB / Migration

### Escopo
[Descrição em 2-3 linhas do que precisa ser feito e o porquê]

### Arquivos afetados (estimativa)
- `src/services/[nome].service.ts` — [criar/alterar]
- `src/hooks/use[nome].ts` — [criar/alterar]
- `src/pages/[nome].tsx` — [criar/alterar]
- `src/types/index.ts` — [adicionar interface se necessário]
- `supabase/migrations/YYYYMMDDHHMMSS_[nome].sql` — [se houver mudança de DB]

### Dados / Contrato
[Descreva os campos novos ou alterados. Ex:]
- Campo `goal_amount: number` (float em reais)
- Campo `deadline: string` (YYYY-MM-DD, opcional)

### Mudanças no DB (migrations)
- [ ] Não há mudança de DB
- [ ] Nova tabela: `[nome_tabela]`
- [ ] Nova coluna: `[tabela].[coluna]` tipo `[TYPE]`
- [ ] Novo índice / policy

### Impacto no Front
[Ex: novo formulário em /settings, novo card no dashboard]

### Casos de Borda
- E se o campo X vier vazio?
- E se o usuário não tiver workspace ativo?
- E se a operação falhar no meio (ex: parcelas)?

### Contexto extra
[Cole aqui trechos de código, erros, prints ou links relevantes]

### Definition of Done
- [ ] Service criado/atualizado com tipos corretos
- [ ] Hook criado/atualizado com invalidação de cache
- [ ] Formulário validado com Zod
- [ ] Erros tratados e exibidos ao usuário em PT-BR
- [ ] Migration SQL criada (se houver mudança de DB)
- [ ] RLS adicionada na nova tabela (se houver)
- [ ] `updated_at` trigger configurado (se aplicável)
- [ ] Código passa em `npm run lint` e `npm run typecheck`
```

---

## Exemplo Preenchido

```markdown
## Tarefa: Criar tela de Metas Financeiras

### Tipo
- [x] Feature nova

### Escopo
Adicionar uma tela onde o usuário pode criar e acompanhar metas financeiras
(ex: "Juntar R$5.000 para viagem até dezembro"). Cada meta pertence a um workspace.

### Arquivos afetados
- `src/services/goal.service.ts` — criar
- `src/hooks/useGoals.ts` — criar
- `src/pages/managers/Goals.tsx` — criar
- `src/types/index.ts` — adicionar interface Goal
- `supabase/migrations/20260220_add_goals_table.sql` — criar

### Dados / Contrato
- `name: string` obrigatório, max 100 chars
- `target_amount: number` float em reais, > 0
- `current_amount: number` float em reais, >= 0, default 0
- `deadline: string | null` YYYY-MM-DD opcional

### Mudanças no DB
- [x] Nova tabela: `goals`

### Impacto no Front
- Nova rota `/managers/goals`
- Link no menu lateral

### Casos de Borda
- current_amount não pode superar target_amount (ou pode? definir regra)
- Usuário sem workspace → não deve ver a tela
- Meta com deadline passado → exibir badge "Vencida"

### Definition of Done
- [x] Todos os itens da checklist padrão
- [x] Exibir progresso como barra (current/target)
```
