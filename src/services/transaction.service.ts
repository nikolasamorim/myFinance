import { supabase } from '../lib/supabase';
import type { Transaction, DashboardStats, MonthlyData } from '../types';

export const transactionService = {
  async getTransactions(workspaceId: string, page = 1, limit = 10, search?: string): Promise<{ data: Transaction[]; total: number }> {
    let query = supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('transaction_workspace_id', workspaceId)
      .order('transaction_date', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (search) {
      query = query.ilike('transaction_description', `%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) throw error;
    return { data: data || [], total: count || 0 };
  },

  async createTransaction(transaction: Omit<Transaction, 'transaction_id' | 'transaction_created_at' | 'transaction_updated_at'>): Promise<Transaction> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        ...transaction,
        transaction_created_by_user_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction> {
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('transaction_id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteTransaction(id: string): Promise<void> {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('transaction_id', id);

    if (error) throw error;
  },

  async getDashboardStats(workspaceId: string): Promise<DashboardStats> {
    if (!workspaceId) {
      console.log('No workspaceId provided, returning empty stats');
      return {
        currentBalance: 0,
        totalExpenses: 0,
        totalDebts: 0,
        monthlyComparison: [],
      };
    }

    console.log('Fetching dashboard stats for workspace:', workspaceId);

    const currentYear = new Date().getFullYear();
    
    // Get all transactions for the current year
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('transaction_workspace_id', workspaceId)
      .gte('transaction_date', `${currentYear}-01-01`)
      .lte('transaction_date', `${currentYear}-12-31`);

    if (error) {
      console.error('Error fetching transactions for stats:', error);
      throw error;
    }

    console.log('Fetched transactions:', transactions?.length || 0);

    const allTransactions = transactions || [];
    
    // Calculate current balance
    const currentBalance = allTransactions.reduce((acc, t) => {
      if (t.transaction_type === 'income') return acc + Number(t.transaction_amount);
      if (t.transaction_type === 'expense') return acc - Number(t.transaction_amount);
      return acc;
    }, 0);

    // Calculate total expenses
    const totalExpenses = allTransactions
      .filter(t => t.transaction_type === 'expense')
      .reduce((acc, t) => acc + Number(t.transaction_amount), 0);

    // Calculate total debts
    const totalDebts = allTransactions
      .filter(t => t.transaction_type === 'debt')
      .reduce((acc, t) => acc + Number(t.transaction_amount), 0);

    // Calculate monthly comparison
    const monthlyComparison: MonthlyData[] = [];
    for (let month = 1; month <= 12; month++) {
      const monthTransactions = allTransactions.filter(t => {
        const transactionMonth = new Date(t.transaction_date).getMonth() + 1;
        return transactionMonth === month;
      });

      const income = monthTransactions
        .filter(t => t.transaction_type === 'income')
        .reduce((acc, t) => acc + Number(t.transaction_amount), 0);

      const expenses = monthTransactions
        .filter(t => t.transaction_type === 'expense')
        .reduce((acc, t) => acc + Number(t.transaction_amount), 0);

      monthlyComparison.push({
        month: new Date(currentYear, month - 1).toLocaleDateString('pt-BR', { month: 'short' }),
        income,
        expenses,
      });
    }

    return {
      currentBalance,
      totalExpenses,
      totalDebts,
      monthlyComparison,
    };
  },
};