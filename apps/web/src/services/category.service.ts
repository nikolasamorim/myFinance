import { apiClient } from '../lib/apiClient';

interface CategoryFilters {
  type: string;
  search: string;
}

export interface CategoryData {
  title: string;
  type: 'income' | 'expense';
  parent_id?: string | null;
  color?: string;
  icon?: string;
  description?: string;
  sort_order?: number;
}

export const categoryService = {
  async getCategories(workspaceId: string, filters: CategoryFilters) {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.type && filters.type !== 'all') params.set('type', filters.type);
    const qs = params.toString() ? `?${params}` : '';
    return apiClient!.get<any[]>(`/workspaces/${workspaceId}/categories${qs}`);
  },

  async createCategory(workspaceId: string, categoryData: CategoryData) {
    return apiClient!.post<any>(`/workspaces/${workspaceId}/categories`, categoryData);
  },

  async updateCategory(id: string, updates: Partial<CategoryData>, workspaceId: string) {
    return apiClient!.put<any>(`/workspaces/${workspaceId}/categories/${id}`, updates);
  },

  async deleteCategory(id: string, workspaceId: string) {
    return apiClient!.delete(`/workspaces/${workspaceId}/categories/${id}`);
  },

  async updateCategoryOrder(workspaceId: string, updates: Array<{ id: string; parent_id: string | null; sort_order: number }>) {
    return apiClient!.put<{ success: boolean }>(`/workspaces/${workspaceId}/categories/order`, updates);
  },
};
