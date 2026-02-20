import { supabase } from '../lib/supabase';
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

    console.log('Fetching invoice data for workspace:', workspaceId);

    try {
      // Get all transactions including recurring expansions
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('transaction_workspace_id', workspaceId)
        .order('transaction_date', { ascending: false });

      // Apply search filter if provided
      if (filters?.search) {
        query = query.ilike('transaction_description', `%${filters.search}%`);
      }

      // Apply period filter
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

        query = query
          .gte('transaction_date', startDate.toISOString().split('T')[0])
          .lte('transaction_date', endDate.toISOString().split('T')[0]);
      }

      const { data: transactions, error } = await query;

      if (error) {
        console.error('Error fetching transactions:', error);
        throw error;
      }

      console.log('Fetched transactions:', transactions?.length || 0);

      const allTransactions = transactions || [];

      // Expand recurring transactions for monthly view
      const expandedTransactions = await this.expandRecurringTransactions(allTransactions);

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

      // Calculate monthly breakdown (all transactions, regardless of status, grouped by transaction_date)
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
          case 'debt':
            // Debt logic: assume debt transactions have a flow indicator
            // For now, we'll use a simple logic based on description or amount sign
            // This should be adjusted based on your actual debt flow logic
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

  async expandRecurringTransactions(transactions: any[]): Promise<any[]> {
    const expanded = [...transactions];
    const currentDate = new Date();
    const futureLimit = new Date();
    futureLimit.setFullYear(currentDate.getFullYear() + 2); // Expand 2 years into future

    // Find recurring transactions
    const recurringTransactions = transactions.filter(t => t.recurrence_rule_id);

    for (const transaction of recurringTransactions) {
      try {
        // Get recurrence rule
        const { data: rule, error } = await supabase
          .from('recurrence_rules')
          .select('*')
          .eq('id', transaction.recurrence_rule_id)
          .single();

        if (error || !rule || rule.status !== 'active') continue;

        // Generate future instances
        const startDate = new Date(rule.start_date);
        const endDate = rule.end_date ? new Date(rule.end_date) : futureLimit;
        let currentInstanceDate = new Date(startDate);
        let instanceCount = 0;
        const maxInstances = rule.repeat_count || 100; // Reasonable limit

        while (currentInstanceDate <= endDate && instanceCount < maxInstances) {
          // Skip the original transaction date to avoid duplicates
          if (currentInstanceDate.toISOString().split('T')[0] !== transaction.transaction_date) {
            const futureInstance = {
              ...transaction,
              transaction_id: `${transaction.transaction_id}-future-${instanceCount}`,
              transaction_date: currentInstanceDate.toISOString().split('T')[0],
              transaction_status: 'pending', // Future instances are always pending
              is_future_instance: true, // Mark as future instance
            };
            expanded.push(futureInstance);
          }

          // Calculate next occurrence
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
        // Continue with other transactions if one fails
      }
    }

    return expanded;
  },
};