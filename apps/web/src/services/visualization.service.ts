import { apiClient } from '../lib/apiClient';
import type { Visualization } from '../types';

export const visualizationService = {
  async getUserVisualizations(workspaceId: string, screenContext: string, _userId: string): Promise<Visualization[]> {
    const params = new URLSearchParams({ screen_context: screenContext });
    const data = await apiClient!.get<Visualization[]>(`/workspaces/${workspaceId}/visualizations?${params}`);
    return data || [];
  },

  async getDefaultVisualization(workspaceId: string, screenContext: string, _userId: string): Promise<Visualization | null> {
    const params = new URLSearchParams({ screen_context: screenContext });
    return apiClient!.get<Visualization | null>(`/workspaces/${workspaceId}/visualizations/default?${params}`);
  },

  async createVisualization(visualization: Omit<Visualization, 'visualization_id' | 'visualization_created_at' | 'visualization_updated_at'>, _userId: string): Promise<Visualization> {
    const workspaceId = visualization.visualization_workspace_id;
    return apiClient!.post<Visualization>(`/workspaces/${workspaceId}/visualizations`, visualization);
  },

  async updateVisualization(id: string, updates: Partial<Visualization>, workspaceId: string): Promise<Visualization> {
    return apiClient!.put<Visualization>(`/workspaces/${workspaceId}/visualizations/${id}`, updates);
  },

  async setDefaultVisualization(workspaceId: string, screenContext: string, visualizationId: string, _userId: string): Promise<void> {
    await apiClient!.put(`/workspaces/${workspaceId}/visualizations/${visualizationId}/set-default`, {
      screen_context: screenContext,
    });
  },

  async deleteVisualization(id: string, workspaceId: string): Promise<void> {
    await apiClient!.delete(`/workspaces/${workspaceId}/visualizations/${id}`);
  },
};
