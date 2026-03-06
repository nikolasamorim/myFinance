import { apiClient } from '../lib/apiClient';

interface CostCenterFilters {
  status: string;
  search: string;
}

export interface CostCenterData {
  title: string;
  type: 'revenue' | 'expense';
  code?: string | null;
  parent_id?: string | null;
  accounting_code?: string | null;
  sort_order?: number;
  status: 'active' | 'inactive';
  color?: string;
  icon?: string;
  description?: string | null;
}

export const costCenterService = {
  async getCostCenters(workspaceId: string, filters: CostCenterFilters) {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    const qs = params.toString() ? `?${params}` : '';
    return apiClient!.get<any[]>(`/workspaces/${workspaceId}/cost-centers${qs}`);
  },

  async createCostCenter(workspaceId: string, costCenterData: CostCenterData) {
    return apiClient!.post<any>(`/workspaces/${workspaceId}/cost-centers`, costCenterData);
  },

  async updateCostCenter(id: string, updates: Partial<CostCenterData>, workspaceId: string) {
    return apiClient!.put<any>(`/workspaces/${workspaceId}/cost-centers/${id}`, updates);
  },

  async deleteCostCenter(id: string, workspaceId: string) {
    return apiClient!.delete(`/workspaces/${workspaceId}/cost-centers/${id}`);
  },

  async updateCostCenterOrder(workspaceId: string, updates: Array<{ id: string; parent_id: string | null; sort_order: number }>) {
    return apiClient!.put<{ success: boolean }>(`/workspaces/${workspaceId}/cost-centers/order`, updates);
  },
};
