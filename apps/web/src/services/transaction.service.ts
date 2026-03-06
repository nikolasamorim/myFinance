import { apiClient } from '../lib/apiClient';
import type { Transaction, DashboardStats, MonthlyData, Paginated } from '../types';

export const transactionService = {
  async getTransactions(workspaceId: string, page = 1, limit = 10, search?: string): Promise<{ data: Transaction[]; total: number }> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    const result = await apiClient!.get<Paginated<Transaction>>(`/workspaces/${workspaceId}/transactions?${params}`);
    return { data: result.data, total: result.total };
  },

  async createTransaction(transaction: Omit<Transaction, 'transaction_id' | 'transaction_created_at' | 'transaction_updated_at'>): Promise<Transaction> {
    return apiClient!.post<Transaction>(
      `/workspaces/${transaction.transaction_workspace_id}/transactions`,
      transaction
    );
  },

  async updateTransaction(id: string, updates: Partial<Transaction>, workspaceId: string): Promise<Transaction> {
    return apiClient!.put<Transaction>(`/workspaces/${workspaceId}/transactions/${id}`, updates);
  },

  async deleteTransaction(id: string, workspaceId: string): Promise<void> {
    return apiClient!.delete(`/workspaces/${workspaceId}/transactions/${id}`);
  },

  async getDashboardStats(workspaceId: string): Promise<DashboardStats> {
    if (!workspaceId) {
      return { currentBalance: 0, totalExpenses: 0, totalDebts: 0, monthlyComparison: [] };
    }
    const data = await apiClient!.get<any>(`/workspaces/${workspaceId}/dashboard`);
    return {
      currentBalance: data.paidSummary?.currentBalance ?? 0,
      totalExpenses: data.paidSummary?.totalExpenses ?? 0,
      totalDebts: data.paidSummary?.totalDebts ?? 0,
      monthlyComparison: (data.monthlyComparison ?? []) as MonthlyData[],
    };
  },
};
