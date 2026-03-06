import { apiClient } from '../lib/apiClient';
import type { Workspace } from '@myfinance/shared';

export const workspaceService = {
  async getUserWorkspaces(): Promise<Workspace[]> {
    return apiClient.get<Workspace[]>('/workspaces');
  },

  async createWorkspace(name: string, type: 'personal' | 'family' | 'business' = 'personal'): Promise<Workspace> {
    return apiClient.post<Workspace>('/workspaces', { workspace_name: name, workspace_type: type });
  },
};
