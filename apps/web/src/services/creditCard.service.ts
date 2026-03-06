import { apiClient } from '../lib/apiClient';

interface CreditCardFilters {
  search: string;
}

export interface CreditCardData {
  title: string;
  flag: string;
  limit: number;
  initial_balance: number;
  due_day: number;
  closing_day: number;
  last_four_digits?: string;
  color?: string;
  icon?: string;
  description?: string;
}

export const creditCardService = {
  async getCreditCards(workspaceId: string, filters: CreditCardFilters) {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    const qs = params.toString() ? `?${params}` : '';
    return apiClient!.get<any[]>(`/workspaces/${workspaceId}/credit-cards${qs}`);
  },

  async createCreditCard(workspaceId: string, cardData: CreditCardData) {
    return apiClient!.post<any>(`/workspaces/${workspaceId}/credit-cards`, cardData);
  },

  async updateCreditCard(id: string, updates: Partial<CreditCardData>, workspaceId: string) {
    return apiClient!.put<any>(`/workspaces/${workspaceId}/credit-cards/${id}`, updates);
  },

  async deleteCreditCard(id: string, workspaceId: string) {
    return apiClient!.delete(`/workspaces/${workspaceId}/credit-cards/${id}`);
  },
};
