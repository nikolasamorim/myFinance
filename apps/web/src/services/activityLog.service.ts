import { supabase } from '../lib/supabase';

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
      let query = supabase
        .from('activity_logs')
        .select(`
          id,
          user_id,
          workspace_id,
          action,
          entity_type,
          entity_id,
          changes,
          description,
          created_at
        `)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (filters.action !== 'all') {
        query = query.eq('action', filters.action);
      }

      if (filters.entity_type !== 'all') {
        query = query.eq('entity_type', filters.entity_type);
      }

      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from);
      }

      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to + 'T23:59:59.999Z');
      }

      if (filters.search) {
        query = query.ilike('description', `%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching activity logs:', error);
        throw new Error('Failed to fetch activity logs: ' + error.message);
      }
      
      return {
        data: data || [],
        hasMore: (data?.length || 0) === limit,
      };
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
  }, userId: string) {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .insert([{
          user_id: userId,
          workspace_id: workspaceId,
          action: logData.action,
          entity_type: logData.entity_type,
          entity_id: logData.entity_id,
          changes: logData.changes,
          description: logData.description,
        }])
        .select()
        .single();

      if (error) throw new Error('Failed to create activity log: ' + error.message);
      return data;
    } catch (error) {
      console.error('Error in createActivityLog:', error);
      throw error;
    }
  },
};