import { apiClient } from '../lib/apiClient';
import type { Workspace, WorkspaceMember, Team } from '../types';

function requireApiClient() {
  if (!apiClient) {
    throw new Error('VITE_API_URL não está configurada. A API não está disponível.');
  }
  return apiClient;
}

export const workspaceService = {
  async getUserWorkspaces(): Promise<Workspace[]> {
    return requireApiClient().get<Workspace[]>('/workspaces');
  },

  async createWorkspace(
    name: string,
    type: 'personal' | 'family' | 'company' = 'personal',
    _shared: boolean = false,
    _mainGoal?: string
  ): Promise<Workspace> {
    return requireApiClient().post<Workspace>('/workspaces', {
      workspace_name: name,
      workspace_type: type,
    });
  },

  async updateWorkspace(id: string, updates: Partial<Pick<Workspace, 'workspace_name' | 'workspace_icon'>>): Promise<Workspace> {
    return requireApiClient().put<Workspace>(`/workspaces/${id}`, updates);
  },

  async deleteWorkspace(id: string): Promise<void> {
    return requireApiClient().delete(`/workspaces/${id}`);
  },

  async getMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    return requireApiClient().get<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`);
  },

  async getTeams(workspaceId: string): Promise<Team[]> {
    return requireApiClient().get<Team[]>(`/workspaces/${workspaceId}/teams`);
  },

  async createTeam(workspaceId: string, name: string): Promise<Team> {
    return requireApiClient().post<Team>(`/workspaces/${workspaceId}/teams`, { name });
  },

  async deleteTeam(workspaceId: string, teamId: string): Promise<void> {
    return requireApiClient().delete(`/workspaces/${workspaceId}/teams/${teamId}`);
  },
};
