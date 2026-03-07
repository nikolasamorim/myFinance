import { apiClient } from '../lib/apiClient';

export const statementsService = {
  async getStatement(workspaceId: string, cardId: string, period: string) {
    return apiClient!.get<any>(`/workspaces/${workspaceId}/credit-cards/${cardId}/statements?period=${period}`);
  },

  async getStatementItems(workspaceId: string, cardId: string, statementId: string, filters?: any) {
    const params = new URLSearchParams();
    if (filters?.type && filters.type !== 'all') params.set('type', filters.type);
    if (filters?.search) params.set('search', filters.search);
    const qs = params.toString() ? `?${params}` : '';
    return apiClient!.get<any[]>(`/workspaces/${workspaceId}/credit-cards/${cardId}/statements/${statementId}/items${qs}`);
  },

  async closeStatement(workspaceId: string, cardId: string, statementId: string) {
    return apiClient!.post<any>(`/workspaces/${workspaceId}/credit-cards/${cardId}/statements/${statementId}/close`, {});
  },

  async registerPayment(workspaceId: string, cardId: string, statementId: string, paymentData: any) {
    return apiClient!.post<any>(`/workspaces/${workspaceId}/credit-cards/${cardId}/statements/${statementId}/payments`, paymentData);
  },

  async moveItemToNextCycle(workspaceId: string, cardId: string, itemId: string) {
    return apiClient!.post<any>(`/workspaces/${workspaceId}/credit-cards/${cardId}/statements/items/${itemId}/move-next`, {});
  },
};
