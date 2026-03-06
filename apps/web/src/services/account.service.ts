import { apiClient } from '../lib/apiClient';

interface AccountFilters {
  type: string;
  search: string;
}

export interface AccountData {
  title: string;
  type: 'cash' | 'bank';
  initial_balance: number;
  opened_at: string;
  cost_center_id?: string | null;
  color?: string;
  icon?: string;
  description?: string;
}

export const accountService = {
  async getAccounts(workspaceId: string, filters: AccountFilters) {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.type && filters.type !== 'all') params.set('type', filters.type);
    const qs = params.toString() ? `?${params}` : '';
    return apiClient!.get<any[]>(`/workspaces/${workspaceId}/accounts${qs}`);
  },

  async createAccount(workspaceId: string, accountData: AccountData) {
    return apiClient!.post<any>(`/workspaces/${workspaceId}/accounts`, accountData);
  },

  async updateAccount(id: string, updates: Partial<AccountData>, workspaceId: string) {
    return apiClient!.put<any>(`/workspaces/${workspaceId}/accounts/${id}`, updates);
  },

  async deleteAccount(id: string, workspaceId: string) {
    return apiClient!.delete(`/workspaces/${workspaceId}/accounts/${id}`);
  },
};
