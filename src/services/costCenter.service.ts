import { supabase } from '../lib/supabase';

interface CostCenterFilters {
  status: string;
  search: string;
}

export interface CostCenterData {
  title: string;
  code?: string;
  parent_id?: string | null;
  accounting_code?: string;
  status: 'active' | 'inactive';
  description?: string;
}

export const costCenterService = {
  async getCostCenters(workspaceId: string, filters: CostCenterFilters) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('Error getting user:', userError);
        throw new Error('Authentication failed: ' + userError.message);
      }
      if (!user) throw new Error('User not authenticated');

      let query = supabase
        .from('cost_centers')
        .select(`
          id,
          workspace_id,
          title,
          code,
          parent_id,
          accounting_code,
          status,
          description,
          created_at,
          updated_at
        `)
        .eq('workspace_id', workspaceId)
        .order('title', { ascending: true });

      if (filters.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }

      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching cost centers:', error);
        throw new Error('Failed to fetch cost centers: ' + error.message);
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getCostCenters:', error);
      throw error;
    }
  },

  async createCostCenter(workspaceId: string, costCenterData: CostCenterData) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw new Error('Authentication failed: ' + userError.message);
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('cost_centers')
        .insert([{
          workspace_id: workspaceId,
          title: costCenterData.title,
          code: costCenterData.code,
          parent_id: costCenterData.parent_id,
          accounting_code: costCenterData.accounting_code,
          status: costCenterData.status,
          description: costCenterData.description,
        }])
        .select()
        .single();

      if (error) throw new Error('Failed to create cost center: ' + error.message);
      return data;
    } catch (error) {
      console.error('Error in createCostCenter:', error);
      throw error;
    }
  },

  async updateCostCenter(id: string, updates: Partial<CostCenterData>) {
    try {
      const { data, error } = await supabase
        .from('cost_centers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error('Failed to update cost center: ' + error.message);
      return data;
    } catch (error) {
      console.error('Error in updateCostCenter:', error);
      throw error;
    }
  },

  async deleteCostCenter(id: string) {
    try {
      const { error } = await supabase
        .from('cost_centers')
        .delete()
        .eq('id', id);

      if (error) throw new Error('Failed to delete cost center: ' + error.message);
    } catch (error) {
      console.error('Error in deleteCostCenter:', error);
      throw error;
    }
  },
};