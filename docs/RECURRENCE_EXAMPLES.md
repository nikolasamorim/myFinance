# Sistema de Recorrência - Exemplos Práticos de Uso

## Exemplos de Criação de Regras

### Exemplo 1: Aluguel Mensal (dia 5)

```typescript
import { createRecurrenceRule } from '../services/recurrenceGeneration.service';

const aluguelMensal = await createRecurrenceRule({
  workspace_id: 'workspace-123',
  user_id: 'user-456',
  transaction_type: 'expense',
  description: 'Aluguel - Apartamento',
  amount: 2500.00,
  start_date: '2025-02-05',
  end_date: null, // Infinito
  recurrence_type: 'MONTHLY',
  recurrence_day: 5,
  due_adjustment: 'EXACT_DAY',
  status: 'ACTIVE',
  account_id: 'conta-corrente-id',
  category_id: 'categoria-moradia-id',
  timezone: 'America/Sao_Paulo'
});

// Resultado:
// - Gerará transação todo dia 5 de cada mês
// - Nunca para (até cancelar manualmente)
// - Valor: R$ 2.500,00
```

### Exemplo 2: Salário Quinzenal (últimos 12 meses)

```typescript
const salarioQuinzenal = await createRecurrenceRule({
  workspace_id: 'workspace-123',
  user_id: 'user-456',
  transaction_type: 'income',
  description: 'Salário - Empresa XYZ',
  amount: 5000.00,
  start_date: '2025-01-15',
  end_date: '2025-12-31',
  recurrence_type: 'BIWEEKLY',
  recurrence_day: 5, // Sexta-feira (1=seg, 5=sex, 7=dom)
  due_adjustment: 'EXACT_DAY',
  status: 'ACTIVE',
  account_id: 'conta-corrente-id',
  category_id: 'categoria-salario-id',
  repeat_count: 24, // 2x por mês * 12 meses
  timezone: 'America/Sao_Paulo'
});

// Resultado:
// - Gerará transação a cada 2 sextas-feiras
// - Para após 24 ocorrências OU 31/12/2025 (o que vier primeiro)
// - Valor: R$ 5.000,00
```

### Exemplo 3: Assinatura Netflix (dia 15, ajuste para último dia se necessário)

```typescript
const netflixAssinatura = await createRecurrenceRule({
  workspace_id: 'workspace-123',
  user_id: 'user-456',
  transaction_type: 'expense',
  description: 'Netflix - Assinatura Premium',
  amount: 55.90,
  start_date: '2025-01-15',
  end_date: null,
  recurrence_type: 'MONTHLY',
  recurrence_day: 15,
  due_adjustment: 'LAST_DAY_OF_MONTH', // Se dia 15 não existir, usa último dia
  status: 'ACTIVE',
  account_id: 'cartao-credito-id',
  category_id: 'categoria-streaming-id',
  timezone: 'America/Sao_Paulo'
});

// Resultado:
// - Gerará transação todo dia 15
// - Se mês tiver menos de 15 dias (impossível), usa último dia válido
// - Infinito até cancelar
```

### Exemplo 4: Academia (trimestral, 4 pagamentos)

```typescript
const academiaQuarterly = await createRecurrenceRule({
  workspace_id: 'workspace-123',
  user_id: 'user-456',
  transaction_type: 'expense',
  description: 'Academia - Plano Trimestral',
  amount: 450.00,
  start_date: '2025-01-10',
  end_date: null,
  recurrence_type: 'QUARTERLY',
  recurrence_day: 10,
  due_adjustment: 'EXACT_DAY',
  status: 'ACTIVE',
  account_id: 'conta-corrente-id',
  category_id: 'categoria-saude-id',
  repeat_count: 4, // Somente 4 pagamentos (1 ano)
  timezone: 'America/Sao_Paulo'
});

// Resultado:
// - Gerará transação dia 10 a cada 3 meses
// - Jan/10, Abr/10, Jul/10, Out/10 → PARA após 4ª
// - Valor: R$ 450,00
```

### Exemplo 5: IPTU Anual (sempre em Janeiro)

```typescript
const iptuAnual = await createRecurrenceRule({
  workspace_id: 'workspace-123',
  user_id: 'user-456',
  transaction_type: 'expense',
  description: 'IPTU - Cota Única',
  amount: 3200.00,
  start_date: '2025-01-20',
  end_date: null,
  recurrence_type: 'YEARLY',
  recurrence_day: 20, // Não usado em YEARLY (usa start_date)
  due_adjustment: 'EXACT_DAY',
  status: 'ACTIVE',
  account_id: 'conta-corrente-id',
  category_id: 'categoria-impostos-id',
  timezone: 'America/Sao_Paulo'
});

// Resultado:
// - Gerará transação todo dia 20 de Janeiro de cada ano
// - 2025: 20/01, 2026: 20/01, 2027: 20/01, ...
// - Infinito até cancelar
```

### Exemplo 6: Mesada Semanal (todas as segundas-feiras por 6 meses)

```typescript
const mesadaSemanal = await createRecurrenceRule({
  workspace_id: 'workspace-123',
  user_id: 'user-456',
  transaction_type: 'expense',
  description: 'Mesada - Filho',
  amount: 100.00,
  start_date: '2025-02-03', // Uma segunda-feira
  end_date: '2025-08-03',
  recurrence_type: 'WEEKLY',
  recurrence_day: 1, // Segunda-feira (1=seg, 7=dom)
  due_adjustment: 'EXACT_DAY',
  status: 'ACTIVE',
  account_id: 'conta-corrente-id',
  category_id: 'categoria-familia-id',
  timezone: 'America/Sao_Paulo'
});

// Resultado:
// - Gerará transação toda segunda-feira
// - Para em 03/08/2025 (6 meses depois)
// - Aproximadamente 26 ocorrências
```

---

## Exemplos de Edição de Regras

### Exemplo 7: Aumentar valor do aluguel (daqui pra frente)

```typescript
import { updateRecurrenceRule } from '../services/recurrenceGeneration.service';

// Aluguel aumentou de R$ 2.500 para R$ 2.750
await updateRecurrenceRule(
  'rule-id-aluguel',
  {
    amount: 2750.00,
    description: 'Aluguel - Apartamento (reajuste 2025)'
  },
  true // affectFutureOnly = true
);

// Resultado:
// - Transações passadas permanecem com R$ 2.500
// - Transações futuras são deletadas
// - Próximo job regerará com R$ 2.750
```

### Exemplo 8: Pausar Netflix por 3 meses

```typescript
import { pauseRecurrenceRule, resumeRecurrenceRule } from '../services/recurrenceGeneration.service';

// Pausar agora
await pauseRecurrenceRule('rule-id-netflix');

// Status: 'PAUSED'
// Job ignora esta regra enquanto pausada

// Depois de 3 meses, retomar:
await resumeRecurrenceRule('rule-id-netflix');

// Status: 'ACTIVE'
// next_run_at recalculado
// Job volta a gerar
```

### Exemplo 9: Cancelar assinatura academia

```typescript
import { cancelRecurrenceRule } from '../services/recurrenceGeneration.service';

// Cancelar e remover futuras
await cancelRecurrenceRule(
  'rule-id-academia',
  true // deleteFutureTransactions = true
);

// Resultado:
// - Status: 'INACTIVE'
// - next_run_at: null
// - Transações passadas preservadas
// - Transações futuras (>= hoje) deletadas
// - Job não processará mais esta regra
```

---

## Exemplos de Consultas

### Exemplo 10: Listar todas as regras ativas de um workspace

```typescript
import { getRecurrenceRulesByWorkspace } from '../services/recurrenceGeneration.service';

const regras = await getRecurrenceRulesByWorkspace('workspace-123', 'user-456');

console.log(regras);
// [
//   { id: '...', description: 'Aluguel', amount: 2500, status: 'ACTIVE', ... },
//   { id: '...', description: 'Netflix', amount: 55.90, status: 'ACTIVE', ... },
//   { id: '...', description: 'Academia', amount: 450, status: 'COMPLETED', ... }
// ]
```

### Exemplo 11: Ver todas as transações geradas por uma regra

```typescript
import { getTransactionsByRecurrenceRule } from '../services/recurrenceGeneration.service';

const transacoes = await getTransactionsByRecurrenceRule('rule-id-aluguel');

console.log(transacoes);
// [
//   { transaction_id: '...', recurrence_instance_date: '2025-01-05', recurrence_sequence: 1, ... },
//   { transaction_id: '...', recurrence_instance_date: '2025-02-05', recurrence_sequence: 2, ... },
//   { transaction_id: '...', recurrence_instance_date: '2025-03-05', recurrence_sequence: 3, ... }
// ]
```

---

## Exemplos de Execução do Job

### Exemplo 12: Executar manualmente o job de geração

```typescript
import { generateRecurringTransactions } from '../services/recurrenceGeneration.service';

const resultado = await generateRecurringTransactions(
  'workspace-123',
  'user-456',
  new Date('2025-02-15') // Data de referência
);

console.log(resultado);
// {
//   success: true,
//   transactionsGenerated: 5,
//   rulesProcessed: 3,
//   errors: []
// }
```

### Exemplo 13: Simular geração futura

```typescript
import { calculateMultipleRecurrenceDates } from '../utils/recurrence.utils';

// Ver próximas 12 ocorrências de uma regra
const regra = await supabase
  .from('recurrence_rules')
  .select('*')
  .eq('id', 'rule-id-aluguel')
  .single();

const proximasDatas = calculateMultipleRecurrenceDates(
  regra.data,
  new Date(),
  12 // próximos 12 meses
);

console.log(proximasDatas);
// [
//   2025-03-05,
//   2025-04-05,
//   2025-05-05,
//   ...
//   2026-02-05
// ]
```

---

## Exemplos de Edge Cases

### Exemplo 14: Regra mensal dia 31 (com ajuste)

```typescript
const regraComAjuste = await createRecurrenceRule({
  workspace_id: 'workspace-123',
  user_id: 'user-456',
  transaction_type: 'expense',
  description: 'Conta que sempre cai dia 31',
  amount: 500.00,
  start_date: '2025-01-31',
  recurrence_type: 'MONTHLY',
  recurrence_day: 31,
  due_adjustment: 'LAST_DAY_OF_MONTH',
  status: 'ACTIVE',
  account_id: 'conta-id',
  category_id: 'categoria-id',
  timezone: 'America/Sao_Paulo'
});

// Resultado (próximas datas geradas):
// Jan: 31/01/2025 ✅
// Fev: 28/02/2025 ✅ (ajustado para último dia)
// Mar: 31/03/2025 ✅
// Abr: 30/04/2025 ✅ (ajustado)
// Mai: 31/05/2025 ✅
// Jun: 30/06/2025 ✅ (ajustado)
```

### Exemplo 15: Regra com repeat_count E end_date (o que vem primeiro)

```typescript
const regraComDoisLimites = await createRecurrenceRule({
  workspace_id: 'workspace-123',
  user_id: 'user-456',
  transaction_type: 'expense',
  description: 'Máximo 10 vezes OU até Dezembro',
  amount: 200.00,
  start_date: '2025-01-01',
  end_date: '2025-12-31',
  recurrence_type: 'MONTHLY',
  recurrence_day: 1,
  due_adjustment: 'EXACT_DAY',
  repeat_count: 10,
  status: 'ACTIVE',
  account_id: 'conta-id',
  category_id: 'categoria-id',
  timezone: 'America/Sao_Paulo'
});

// Cenário A: 10 meses chegam antes de Dezembro
// → Para após 10ª transação (01/10/2025)

// Cenário B: Dezembro chega antes da 10ª
// (não é o caso aqui, mas se repeat_count fosse 20)
// → Para em 31/12/2025 mesmo não atingindo repeat_count
```

### Exemplo 16: Regra diária com repeat_count

```typescript
const lembretesDiarios = await createRecurrenceRule({
  workspace_id: 'workspace-123',
  user_id: 'user-456',
  transaction_type: 'expense',
  description: 'Medicação diária (30 dias)',
  amount: 5.00,
  start_date: '2025-02-01',
  recurrence_type: 'DAILY',
  due_adjustment: 'EXACT_DAY',
  repeat_count: 30,
  status: 'ACTIVE',
  account_id: 'conta-id',
  category_id: 'categoria-saude-id',
  timezone: 'America/Sao_Paulo'
});

// Resultado:
// - Gerará 30 transações diárias
// - 01/02, 02/02, 03/02, ..., 02/03 (30 dias)
// - Status automaticamente vira 'COMPLETED' após 30ª
```

---

## Exemplos de Validação

### Exemplo 17: Validação antes de criar

```typescript
import { validateRecurrenceRule } from '../utils/recurrence.utils';

const dadosRegra = {
  start_date: '2025-02-15',
  end_date: '2025-01-15', // ERRO: end_date < start_date
  amount: -100, // ERRO: amount negativo
  repeat_count: 0, // ERRO: repeat_count deve ser > 0
  recurrence_day: 35, // ERRO: dia deve ser 1-31
};

const validacao = validateRecurrenceRule(dadosRegra);

console.log(validacao);
// {
//   valid: false,
//   errors: [
//     'end_date must be >= start_date',
//     'amount must be positive',
//     'repeat_count must be positive',
//     'recurrence_day must be between 1 and 31'
//   ]
// }
```

---

## Exemplos de Monitoramento

### Exemplo 18: Consultar regras com erro

```sql
-- Regras com status ERROR (mais de 10 falhas)
SELECT id, description, error_count, last_error_message, last_error_at
FROM recurrence_rules
WHERE status = 'ERROR'
ORDER BY last_error_at DESC;
```

### Exemplo 19: Relatório de geração do último mês

```sql
-- Transações geradas no último mês
SELECT
  rr.description AS regra,
  COUNT(*) AS total_gerado,
  MIN(t.recurrence_instance_date) AS primeira_data,
  MAX(t.recurrence_instance_date) AS ultima_data
FROM transactions t
JOIN recurrence_rules rr ON t.parent_recurrence_rule_id = rr.id
WHERE t.is_recurrence_generated = true
  AND t.generated_at >= NOW() - INTERVAL '30 days'
GROUP BY rr.id, rr.description
ORDER BY total_gerado DESC;
```

### Exemplo 20: Próximas regras a serem executadas

```sql
-- Regras que vão executar nos próximos 7 dias
SELECT
  id,
  description,
  next_run_at,
  generation_count,
  repeat_count,
  status
FROM recurrence_rules
WHERE status = 'ACTIVE'
  AND next_run_at BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
ORDER BY next_run_at ASC;
```

---

## Dicas de Uso

### ✅ Boas Práticas

1. **Sempre use `due_adjustment`** para regras mensais em dias 29-31
2. **Defina `timezone`** explicitamente para evitar problemas de fuso
3. **Use `repeat_count` OR `end_date`** para limitar duração
4. **Teste com `affectFutureOnly=true`** ao editar regras
5. **Monitore `error_count`** regularmente

### ⚠️ Cuidados

1. **Não altere `start_date`** de regras ativas (cria inconsistências)
2. **Não delete transações geradas manualmente** (quebra sequência)
3. **Não modifique `generation_count`** manualmente
4. **Cuidado com `due_adjustment='SKIP'`** (pode pular períodos inteiros)

### 🚀 Performance

1. **Limite `repeat_count`** para evitar gerações infinitas
2. **Use `end_date`** em regras temporárias
3. **Pausar em vez de deletar** para histórico
4. **Batch updates** ao editar múltiplas regras

---

## Troubleshooting

### Problema: Transação não foi gerada

**Verificar**:
1. `status = 'ACTIVE'`?
2. `next_run_at <= hoje`?
3. `repeat_count` não atingido?
4. `end_date` não ultrapassado?
5. `error_count < 10`?

```sql
SELECT * FROM recurrence_rules WHERE id = 'rule-id';
```

### Problema: Data errada gerada

**Verificar**:
1. `recurrence_day` correto?
2. `due_adjustment` apropriado?
3. `timezone` correto?
4. `start_date` como esperado?

```typescript
// Testar cálculo manualmente
const nextDate = calculateNextRecurrenceDate(rule, new Date());
console.log(nextDate);
```

### Problema: Duplicação de transações

**Improvável devido a UNIQUE constraint**, mas verificar:
1. `parent_recurrence_rule_id` é NULL? (constraint não aplica)
2. `recurrence_instance_date` é NULL? (constraint não aplica)

```sql
-- Encontrar duplicatas
SELECT parent_recurrence_rule_id, recurrence_instance_date, COUNT(*)
FROM transactions
WHERE parent_recurrence_rule_id IS NOT NULL
GROUP BY parent_recurrence_rule_id, recurrence_instance_date
HAVING COUNT(*) > 1;
```

---

**Fim dos Exemplos Práticos**

Para mais informações, consulte:
- `docs/RECURRENCE_SYSTEM_DESIGN.md` - Arquitetura completa
- `docs/RECURRENCE_JOB_IMPLEMENTATION.md` - Implementação do job
- `docs/RECURRENCE_SUMMARY.md` - Resumo executivo
