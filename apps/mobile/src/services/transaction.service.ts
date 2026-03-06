import { apiClient } from '../lib/apiClient';
import type { Transaction, Paginated } from '@myfinance/shared';

export const transactionService = {
  async getTransactions(
    workspaceId: string,
    page = 1,
    limit = 20,
    search?: string,
    type?: string
  ): Promise<Paginated<Transaction>> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    if (type) params.set('type', type);
    return apiClient.get<Paginated<Transaction>>(`/workspaces/${workspaceId}/transactions?${params}`);
  },

  async createTransaction(
    workspaceId: string,
    transaction: Omit<Transaction, 'transaction_id' | 'transaction_created_at' | 'transaction_updated_at'>
  ): Promise<Transaction> {
    return apiClient.post<Transaction>(`/workspaces/${workspaceId}/transactions`, transaction);
  },

  async updateTransaction(workspaceId: string, id: string, updates: Partial<Transaction>): Promise<Transaction> {
    return apiClient.put<Transaction>(`/workspaces/${workspaceId}/transactions/${id}`, updates);
  },

  async deleteTransaction(workspaceId: string, id: string): Promise<void> {
    return apiClient.delete(`/workspaces/${workspaceId}/transactions/${id}`);
  },
};
