import { apiClient } from '../lib/apiClient';
import type { Transaction, MonthlyData } from '../types';

interface InvoiceFilters {
  period: string;
  category: string;
  search: string;
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

interface InvoiceData {
  paidSummary: PaidSummary;
  monthlyBreakdown: MonthlyBreakdown;
  monthlyComparison: MonthlyData[];
  recentTransactions: Transaction[];
}

export const invoiceService = {
  async getInvoiceData(workspaceId: string, filters?: InvoiceFilters): Promise<InvoiceData> {
    if (!workspaceId) {
      throw new Error('Workspace ID is required');
    }

    try {
      const params = new URLSearchParams({
        noPagination: 'true',
        sort: 'transaction_date',
        order: 'desc',
      });

      if (filters?.search) {
        params.set('search', filters.search);
      }

      if (filters?.period && filters.period !== 'custom') {
        const now = new Date();
        let startDate: Date;
        let endDate: Date;

        switch (filters.period) {
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

        params.set('startDate', startDate.toISOString().split('T')[0]);
        params.set('endDate', endDate.toISOString().split('T')[0]);
      }

      const result = await apiClient!.get<{ data: any[] }>(`/workspaces/${workspaceId}/transactions?${params}`);
      const allTransactions = result.data || [];

      // Expand recurring transactions for monthly view
      const expandedTransactions = await this.expandRecurringTransactions(allTransactions, workspaceId);

      // Calculate paid summary (only paid/received transactions)
      const paidTransactions = expandedTransactions.filter(t =>
        t.transaction_status === 'paid' || t.transaction_status === 'received'
      );

      const paidIncome = paidTransactions
        .filter(t => t.transaction_type === 'income')
        .reduce((acc, t) => acc + Number(t.transaction_amount), 0);

      const paidExpenses = paidTransactions
        .filter(t => t.transaction_type === 'expense')
        .reduce((acc, t) => acc + Number(t.transaction_amount), 0);

      const paidDebts = paidTransactions
        .filter(t => t.transaction_type === 'debt')
        .reduce((acc, t) => acc + Number(t.transaction_amount), 0);

      const paidSummary: PaidSummary = {
        currentBalance: paidIncome - paidExpenses,
        totalIncome: paidIncome,
        totalExpenses: paidExpenses,
        totalDebts: paidDebts,
      };

      // Calculate monthly breakdown
      const monthlyBreakdown: MonthlyBreakdown = {};

      expandedTransactions.forEach(transaction => {
        const date = new Date(transaction.transaction_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!monthlyBreakdown[monthKey]) {
          monthlyBreakdown[monthKey] = {
            income: 0,
            expense: 0,
            debtIn: 0,
            debtOut: 0,
          };
        }

        const amount = Number(transaction.transaction_amount);

        switch (transaction.transaction_type) {
          case 'income':
            monthlyBreakdown[monthKey].income += amount;
            break;
          case 'expense':
            monthlyBreakdown[monthKey].expense += amount;
            break;
          case 'debt': {
            const isDebtIn = transaction.transaction_description?.toLowerCase().includes('receb') ||
                           transaction.transaction_description?.toLowerCase().includes('entrada') ||
                           transaction.transaction_status === 'received';

            if (isDebtIn) {
              monthlyBreakdown[monthKey].debtIn += amount;
            } else {
              monthlyBreakdown[monthKey].debtOut += amount;
            }
            break;
          }
        }
      });

      // Calculate monthly comparison for charts (last 12 months)
      const monthlyComparison: MonthlyData[] = [];
      const currentDate = new Date();

      for (let i = 11; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthData = monthlyBreakdown[monthKey] || { income: 0, expense: 0, debtIn: 0, debtOut: 0 };

        monthlyComparison.push({
          month: date.toLocaleDateString('pt-BR', { month: 'short' }),
          income: monthData.income,
          expenses: monthData.expense,
        });
      }

      // Get recent transactions (last 10)
      const recentTransactions = expandedTransactions.slice(0, 10);

      return {
        paidSummary,
        monthlyBreakdown,
        monthlyComparison,
        recentTransactions,
      };

    } catch (error) {
      console.error('Error in getInvoiceData:', error);
      throw error;
    }
  },

  async expandRecurringTransactions(transactions: any[], workspaceId: string): Promise<any[]> {
    const expanded = [...transactions];
    const currentDate = new Date();
    const futureLimit = new Date();
    futureLimit.setFullYear(currentDate.getFullYear() + 2);

    // Find recurring transactions
    const recurringTransactions = transactions.filter(t => t.recurrence_rule_id);

    for (const transaction of recurringTransactions) {
      try {
        const rule = await apiClient!.get<any>(`/workspaces/${workspaceId}/recurrence-rules/${transaction.recurrence_rule_id}`);

        if (!rule || rule.status !== 'active') continue;

        // Generate future instances
        const startDate = new Date(rule.start_date);
        const endDate = rule.end_date ? new Date(rule.end_date) : futureLimit;
        let currentInstanceDate = new Date(startDate);
        let instanceCount = 0;
        const maxInstances = rule.repeat_count || 100;

        while (currentInstanceDate <= endDate && instanceCount < maxInstances) {
          if (currentInstanceDate.toISOString().split('T')[0] !== transaction.transaction_date) {
            const futureInstance = {
              ...transaction,
              transaction_id: `${transaction.transaction_id}-future-${instanceCount}`,
              transaction_date: currentInstanceDate.toISOString().split('T')[0],
              transaction_status: 'pending',
              is_future_instance: true,
            };
            expanded.push(futureInstance);
          }

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
      }
    }

    return expanded;
  },
};
