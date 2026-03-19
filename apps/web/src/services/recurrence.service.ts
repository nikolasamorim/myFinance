import { apiClient } from '../lib/apiClient';
import type { Transaction } from '../types';

export interface RecurrenceRuleData {
  transaction_type: 'income' | 'expense' | 'debt' | 'investment';
  description: string;
  amount?: number;
  start_date: string;
  recurrence_type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  repeat_count?: number;
  end_date?: string;
  due_adjustment?: 'none' | 'previous_business_day' | 'next_business_day';
  recurrence_day?: string;
  account_id?: string;
  category_id?: string;
  notes?: string;
  status?: 'active' | 'paused' | 'canceled';
  /** Data a partir da qual regenerar lançamentos futuros (frontend-only, removido antes de salvar no DB) */
  from_date?: string;
}

export const recurrenceService = {
  async getRecurrenceRules(workspaceId: string) {
    return apiClient!.get<any[]>(`/workspaces/${workspaceId}/recurrence-rules`);
  },

  async createRecurrenceRule(workspaceId: string, ruleData: RecurrenceRuleData) {
    return apiClient!.post<any>(`/workspaces/${workspaceId}/recurrence-rules`, ruleData);
  },

  async updateRecurrenceRule(id: string, updates: Partial<RecurrenceRuleData>, workspaceId: string) {
    return apiClient!.put<any>(`/workspaces/${workspaceId}/recurrence-rules/${id}`, updates);
  },

  async deleteRecurrenceRule(id: string, workspaceId: string) {
    return apiClient!.delete(`/workspaces/${workspaceId}/recurrence-rules/${id}`);
  },

  async pauseRecurrenceRule(id: string, workspaceId: string) {
    return apiClient!.post<any>(`/workspaces/${workspaceId}/recurrence-rules/${id}/pause`, {});
  },

  async resumeRecurrenceRule(id: string, workspaceId: string) {
    return apiClient!.post<any>(`/workspaces/${workspaceId}/recurrence-rules/${id}/resume`, {});
  },

  async cancelRecurrenceRule(id: string, workspaceId: string) {
    return apiClient!.post<any>(`/workspaces/${workspaceId}/recurrence-rules/${id}/cancel`, {});
  },

  async getRecurrenceRuleById(workspaceId: string, ruleId: string) {
    return apiClient!.get<any>(`/workspaces/${workspaceId}/recurrence-rules/${ruleId}`);
  },

  async getTransactionsByRule(workspaceId: string, ruleId: string): Promise<Transaction[]> {
    const res = await apiClient!.get<{ data: Transaction[] }>(
      `/workspaces/${workspaceId}/transactions?parent_recurrence_rule_id=${encodeURIComponent(ruleId)}`
    );
    return res.data ?? [];
  },
};
