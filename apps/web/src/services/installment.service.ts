import { apiClient } from '../lib/apiClient';
import type { InstallmentGroup } from '../types';

export interface InstallmentGroupData {
  total_value: number;
  installment_count: number;
  initial_due_date: string;
  description: string;
  payment_method_id?: string;
  account_id?: string;
  card_id?: string;
}

export const installmentService = {
  async getInstallmentGroups(workspaceId: string) {
    try {
      return await apiClient!.get<any[]>(`/workspaces/${workspaceId}/installment-groups`);
    } catch (error) {
      console.error('Error in getInstallmentGroups:', error);
      throw error;
    }
  },

  async createInstallmentGroup(workspaceId: string, groupData: InstallmentGroupData, userId: string) {
    try {
      return await apiClient!.post<any>(`/workspaces/${workspaceId}/installment-groups`, {
        ...groupData,
        user_id: userId,
      });
    } catch (error) {
      console.error('Error in createInstallmentGroup:', error);
      throw error;
    }
  },

  async updateInstallmentGroup(id: string, updates: Partial<InstallmentGroupData>, workspaceId: string) {
    try {
      return await apiClient!.put<any>(`/workspaces/${workspaceId}/installment-groups/${id}`, updates);
    } catch (error) {
      console.error('Error in updateInstallmentGroup:', error);
      throw error;
    }
  },

  async deleteInstallmentGroup(id: string, workspaceId: string) {
    try {
      await apiClient!.delete(`/workspaces/${workspaceId}/installment-groups/${id}`);
    } catch (error) {
      console.error('Error in deleteInstallmentGroup:', error);
      throw error;
    }
  },

  async getInstallmentsByGroup(groupId: string, workspaceId: string) {
    try {
      const params = new URLSearchParams({
        installment_group_id: groupId,
        noPagination: 'true',
        sort: 'transaction_date',
        order: 'asc',
      });
      const result = await apiClient!.get<{ data: any[] }>(`/workspaces/${workspaceId}/transactions?${params}`);
      return result.data || [];
    } catch (error) {
      console.error('Error in getInstallmentsByGroup:', error);
      throw error;
    }
  },
};
