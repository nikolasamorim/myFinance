import { apiClient } from '../lib/apiClient';
import type { Workspace } from '../types';

export const workspaceService = {
  async getUserWorkspaces(): Promise<Workspace[]> {
    return apiClient!.get<Workspace[]>('/workspaces');
  },

  async createWorkspace(
    name: string,
    type: 'personal' | 'family' | 'company' = 'personal',
    _shared: boolean = false,
    _mainGoal?: string
  ): Promise<Workspace> {
    return apiClient!.post<Workspace>('/workspaces', {
      workspace_name: name,
      workspace_type: type,
    });
  },

  async updateWorkspace(id: string, updates: Partial<Pick<Workspace, 'workspace_name' | 'workspace_icon'>>): Promise<Workspace> {
    return apiClient!.put<Workspace>(`/workspaces/${id}`, updates);
  },

  async deleteWorkspace(id: string): Promise<void> {
    return apiClient!.delete(`/workspaces/${id}`);
  },
};
