import { supabase } from '../lib/supabase';
import type { Transaction, MonthlyData } from '../types';

/* =========================
 *      Tipagens
 * ========================= */
interface DashboardFilters {
  period: string;
  category: string;
  search: string;
  startDate?: string;
  endDate?: string;
}

interface PaidSummary {
  currentBalance: number;
  totalIncome: number;
  totalExpenses: number;
  totalDebts: number;
}

interface MonthlyBreakdown {
  [monthKey: string]: {
    income: number;
    expense: number;
    debtIn: number;
    debtOut: number;
  };
}

interface Summary {
  balancePaid: number;                 // Saldo considerando apenas pagos (receitas pagas - despesas pagas)
  income: { paid: number; unpaid: number };      // Receitas pagas / não pagas
  expenses: { paid: number; unpaid: number };    // Despesas pagas / não pagas
  invested: { paid: number; unpaid: number };    // Investimentos pagos / não pagos
}

interface DashboardData {
  paidSummary: PaidSummary;            // legado
  summary: Summary;                    // novo
  monthlyBreakdown: MonthlyBreakdown;
  monthlyComparison: MonthlyData[];
  recentTransactions: Transaction[];
}

/* =========================
 *      Helpers locais
 * ========================= */

// Converte Date -> 'YYYY-MM-DD'
const toISODate = (d: Date) => d.toISOString().split('T')[0];

// Monta range de datas a partir do filtro de período
function getPeriodRange(period?: string, customStart?: string, customEnd?: string): { start?: string; end?: string } {
  if (!period) return {};

  // Handle custom period with explicit date range
  if (period === 'custom') {
    if (customStart && customEnd) {
      return { start: customStart, end: customEnd };
    }
    return {};
  }

  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  switch (period) {
    case 'current_month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;
    case 'last_month':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      break;
    case 'current_year':
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31);
      break;
    default:
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31);
  }

  return { start: toISODate(startDate), end: toISODate(endDate) };
}

// Chave do mês: 'YYYY-MM'
const monthKeyFrom = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

// Status helpers
const isPaidLike = (t: any) => t.transaction_status === 'paid' || t.transaction_status === 'received';
const isUnpaidLike = (t: any) => !isPaidLike(t);

// Soma segura
const sumAmounts = (arr: any[]) => arr.reduce((acc, t) => acc + Number(t.transaction_amount || 0), 0);

// Define tipo usado para investido (compat: 'investment' ou 'debt')
function detectInvestmentType(transactions: any[]): 'investment' | 'debt' {
  return transactions.some(t => t.transaction_type === 'investment') ? 'investment' : 'debt';
}

// Calcula comparação mensal (últimos 12 meses) a partir do breakdown
function buildMonthlyComparison(breakdown: MonthlyBreakdown): MonthlyData[] {
  const out: MonthlyData[] = [];
  const currentDate = new Date();

  for (let i = 11; i >= 0; i--) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const key = monthKeyFrom(date);
    const monthData = breakdown[key] || { income: 0, expense: 0, debtIn: 0, debtOut: 0 };

    out.push({
      month: date.toLocaleDateString('pt-BR', { month: 'short' }),
      income: monthData.income,
      expenses: monthData.expense,
    });
  }

  return out;
}

/* =========================
 *      Service
 * ========================= */
export const dashboardService = {
  async getDashboardData(workspaceId: string, filters?: DashboardFilters): Promise<DashboardData> {
    if (!workspaceId) throw new Error('Workspace ID is required');

    console.log('Fetching dashboard data for workspace:', workspaceId);

    try {
      // Base query
      let query = supabase
        .from('transactions')
        .select('*, accounts:transaction_bank_id ( id, title, color, icon )')
        .eq('transaction_workspace_id', workspaceId)
        .order('transaction_description', { ascending: false });

      // Filtro de busca
      if (filters?.search) {
        query = query.ilike('transaction_description', `%${filters.search}%`);
      }

      // Filtro de período
      const { start, end } = getPeriodRange(filters?.period, filters?.startDate, filters?.endDate);
      console.log('Dashboard filter period range:', {
        period: filters?.period,
        customStart: filters?.startDate,
        customEnd: filters?.endDate,
        calculatedStart: start,
        calculatedEnd: end
      });
      if (start && end) {
        query = query.gte('transaction_date', start).lte('transaction_date', end);
      }

      // Execução
      const { data: transactions, error } = await query;
      if (error) {
        console.error('Error fetching transactions:', error);
        throw error;
      }

      console.log('Fetched transactions:', transactions?.length || 0);

      const allTransactions = (transactions || []).map((t:any)=>({
        ...t,
        transaction_account: t.accounts?.title ?? null,
        transaction_account_color: t.accounts?.color ?? null,
        transaction_account_icon: t.accounts?.icon ?? null,
      }));

      // Expansão de recorrência (para visão mensal/visuais)
      const expandedTransactions = await this.expandRecurringTransactions(allTransactions);

      // Detecta tipo "investido" compatível
      const investmentType = detectInvestmentType(expandedTransactions);

      // Particiona por status
      const paidTransactions = expandedTransactions.filter(isPaidLike);
      const unpaidTransactions = expandedTransactions.filter(isUnpaidLike);

      // Somatórios pagos
      const paidIncome   = sumAmounts(paidTransactions.filter(t => t.transaction_type === 'income'));
      const paidExpenses = sumAmounts(paidTransactions.filter(t => t.transaction_type === 'expense'));
      const paidInvested = sumAmounts(paidTransactions.filter(t => t.transaction_type === investmentType));

      // Somatórios não pagos
      const unpaidIncome   = sumAmounts(unpaidTransactions.filter(t => t.transaction_type === 'income'));
      const unpaidExpenses = sumAmounts(unpaidTransactions.filter(t => t.transaction_type === 'expense'));
      const unpaidInvested = sumAmounts(unpaidTransactions.filter(t => t.transaction_type === investmentType));

      // ===================== HOTFIX TEMPORÁRIO: incluir recorrentes (qualquer data) =====================
      const INCLUDE_RECURRING_ANY_DATE = true; // <— para remover depois, basta apagar este bloco inteiro

      // usamos variáveis ajustadas para não mexer nas originais (fácil de remover)
      let adjPaidIncome   = paidIncome;
      let adjPaidExpenses = paidExpenses;
      let adjUnpaidIncome = unpaidIncome;
      let adjUnpaidExpenses = unpaidExpenses;

      if (INCLUDE_RECURRING_ANY_DATE) {
        // 1) Busca TODAS as recorrentes do workspace, sem filtro de data
        const { data: recurringAnyDate, error: recurringErr } = await supabase
          .from('transactions')
          .select('*')
          .eq('transaction_workspace_id', workspaceId)
          .eq('recurring', true);

        if (!recurringErr && Array.isArray(recurringAnyDate)) {
          // 2) O que já está considerado no período atual (recorrentes) — para evitar contagem dupla
          const inPeriodRecurring = expandedTransactions.filter((t: any) => t.recurring === true);

          // Helpers locais
          const paidR   = (arr: any[]) => arr.filter(isPaidLike);
          const unpaidR = (arr: any[]) => arr.filter(isUnpaidLike);
          const typeIs  = (typ: 'income' | 'expense') => (t: any) => t.transaction_type === typ;

          // 3) Somatórios (todas as datas)
          const any_paid_income   = sumAmounts(paidR(recurringAnyDate).filter(typeIs('income')));
          const any_paid_expense  = sumAmounts(paidR(recurringAnyDate).filter(typeIs('expense')));
          const any_unpaid_income = sumAmounts(unpaidR(recurringAnyDate).filter(typeIs('income')));
          const any_unpaid_expense= sumAmounts(unpaidR(recurringAnyDate).filter(typeIs('expense')));

          // 4) Somatórios recorrentes JÁ considerados no período atual (para tirar do adicional)
          const in_paid_income    = sumAmounts(paidR(inPeriodRecurring).filter(typeIs('income')));
          const in_paid_expense   = sumAmounts(paidR(inPeriodRecurring).filter(typeIs('expense')));
          const in_unpaid_income  = sumAmounts(unpaidR(inPeriodRecurring).filter(typeIs('income')));
          const in_unpaid_expense = sumAmounts(unpaidR(inPeriodRecurring).filter(typeIs('expense')));

          // 5) Deltas a adicionar (qualquer data – já no período)
          adjPaidIncome    += (any_paid_income   - in_paid_income);
          adjPaidExpenses  += (any_paid_expense  - in_paid_expense);
          adjUnpaidIncome  += (any_unpaid_income - in_unpaid_income);
          adjUnpaidExpenses+= (any_unpaid_expense- in_unpaid_expense);
        }
      }
      // ===================== FIM HOTFIX TEMPORÁRIO =====================

      // Saídas legadas + novas
      const paidSummary: PaidSummary = {
        currentBalance: adjPaidIncome - adjPaidExpenses, // saldo pago ajustado
        totalIncome: adjPaidIncome,                      // receitas pagas ajustadas
        totalExpenses: adjPaidExpenses,                  // despesas pagas ajustadas
        totalDebts: paidInvested,                        // mantém investidos como estavam
      };
      
      const summary: Summary = {
        balancePaid: adjPaidIncome - adjPaidExpenses,    // saldo pago ajustado
        income:   { paid: adjPaidIncome,   unpaid: adjUnpaidIncome },   // receitas ajustadas
        expenses: { paid: adjPaidExpenses, unpaid: adjUnpaidExpenses }, // despesas ajustadas
        invested: { paid: paidInvested,    unpaid: unpaidInvested },    // investidos inalterados
      };

      // Breakdown mensal (todas as transações, por data)
      const monthlyBreakdown: MonthlyBreakdown = {};
      for (const transaction of expandedTransactions) {
        const date = new Date(transaction.transaction_date);
        const key = monthKeyFrom(date);

        if (!monthlyBreakdown[key]) {
          monthlyBreakdown[key] = { income: 0, expense: 0, debtIn: 0, debtOut: 0 };
        }

        const amount = Number(transaction.transaction_amount);

        switch (transaction.transaction_type) {
          case 'income':
            monthlyBreakdown[key].income += amount;
            break;
          case 'expense':
            monthlyBreakdown[key].expense += amount;
            break;
          case 'debt': {
            // Heurística para fluxo de dívida (entrada/saída)
            const desc = (transaction.transaction_description || '').toLowerCase();
            const isDebtIn =
              desc.includes('receb') ||
              desc.includes('entrada') ||
              transaction.transaction_status === 'received';

            if (isDebtIn) monthlyBreakdown[key].debtIn += amount;
            else monthlyBreakdown[key].debtOut += amount;
            break;
          }
        }
      }

      // Comparação mensal (últimos 12 meses)
      const monthlyComparison = buildMonthlyComparison(monthlyBreakdown);

      // Últimas 10 transações (após expansão)
      const recentTransactions = expandedTransactions.slice(0, 50);

      // Retorno FINAL (sem alterar contrato)
      return {
        paidSummary,     // Mantém código legado
        summary,         // novo objeto recomendado
        monthlyBreakdown,
        monthlyComparison,
        recentTransactions,
      };

    } catch (error) {
      console.error('Error in getDashboardData:', error);
      throw error;
    }
  },

  // Mantida a assinatura e a lógica geral (apenas organização mínima interna)
  async expandRecurringTransactions(transactions: any[]): Promise<any[]> {
    const expanded = [...transactions];
    const currentDate = new Date();
    const futureLimit = new Date();
    futureLimit.setFullYear(currentDate.getFullYear() + 2); // Expand 2 years into future

    // Transações com regra de recorrência
    const recurringTransactions = transactions.filter(t => t.recurrence_rule_id);

    for (const transaction of recurringTransactions) {
      try {
        // Busca a regra
        const { data: rule, error } = await supabase
          .from('recurrence_rules')
          .select('*')
          .eq('id', transaction.recurrence_rule_id)
          .single();

        if (error || !rule || rule.status !== 'active') continue;

        // Gera futuras ocorrências
        const startDate = new Date(rule.start_date);
        const endDate = rule.end_date ? new Date(rule.end_date) : futureLimit;

        let currentInstanceDate = new Date(startDate);
        let instanceCount = 0;
        const maxInstances = rule.repeat_count || 100; // limite razoável

        while (currentInstanceDate <= endDate && instanceCount < maxInstances) {
          // Evita duplicar a data original
          if (toISODate(currentInstanceDate) !== transaction.transaction_date) {
            const futureInstance = {
              ...transaction,
              transaction_id: `${transaction.transaction_id}-future-${instanceCount}`,
              transaction_date: toISODate(currentInstanceDate),
              transaction_status: 'pending',   // futuras sempre pendentes
              is_future_instance: true,        // marca como futura
            };
            expanded.push(futureInstance);
          }

          // Próxima ocorrência
          switch (rule.recurrence_type) {
            case 'daily':
              currentInstanceDate.setDate(currentInstanceDate.getDate() + 1);
              break;
            case 'weekly':
              currentInstanceDate.setDate(currentInstanceDate.getDate() + 7);
              break;
            case 'monthly':
              currentInstanceDate.setMonth(currentInstanceDate.getMonth() + 1);
              break;
            case 'yearly':
              currentInstanceDate.setFullYear(currentInstanceDate.getFullYear() + 1);
              break;
          }

          instanceCount++;
        }
      } catch (error) {
        console.error('Error expanding recurring transaction:', transaction.transaction_id, error);
        // Continua para as próximas mesmo em caso de falha nesta
      }
    }

    return expanded;
  },
};
