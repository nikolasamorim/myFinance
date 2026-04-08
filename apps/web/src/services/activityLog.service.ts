import { apiClient } from '../lib/apiClient';

interface ActivityLogFilters {
  action: string;
  entity_type: string;
  date_from: string;
  date_to: string;
  search: string;
}

export const activityLogService = {
  async getActivityLogs(workspaceId: string, filters: ActivityLogFilters, page: number = 1, limit: number = 20) {
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      if (filters.action !== 'all') params.set('action', filters.action);
      if (filters.entity_type !== 'all') params.set('entity_type', filters.entity_type);
      if (filters.date_from) params.set('date_from', filters.date_from);
      if (filters.date_to) params.set('date_to', filters.date_to);
      if (filters.search) params.set('search', filters.search);

      return await apiClient!.get<{ data: any[]; hasMore: boolean }>(`/workspaces/${workspaceId}/activity-logs?${params}`);
    } catch (error) {
      console.error('Error in getActivityLogs:', error);
      throw error;
    }
  },

  async createActivityLog(workspaceId: string, logData: {
    action: string;
    entity_type: string;
    entity_id: string;
    changes?: any;
    description?: string;
  }, _userId: string) {
    try {
      return await apiClient!.post<any>(`/workspaces/${workspaceId}/activity-logs`, logData);
    } catch (error) {
      console.error('Error in createActivityLog:', error);
      throw error;
    }
  },
};
