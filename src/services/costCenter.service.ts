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
          cost_center_id,
          cost_center_workspace_id,
          cost_center_name,
          cost_center_created_at,
          cost_center_updated_at
        `)
        .eq('cost_center_workspace_id', workspaceId)
        .order('cost_center_name', { ascending: true });

      if (filters.search) {
        query = query.ilike('cost_center_name', `%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching cost centers:', error);
        throw new Error('Failed to fetch cost centers: ' + error.message);
      }
      
      // Map database columns to frontend interface
      return (data || []).map(item => ({
        id: item.cost_center_id,
        workspace_id: item.cost_center_workspace_id,
        title: item.cost_center_name,
        code: null, // Not in current schema
        parent_id: null, // Not in current schema
        accounting_code: null, // Not in current schema
        status: 'active', // Default since not in current schema
        description: null, // Not in current schema
        created_at: item.cost_center_created_at,
        updated_at: item.cost_center_updated_at,
      }));
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
          cost_center_workspace_id: workspaceId,
          cost_center_name: costCenterData.title,
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
        .update({
          cost_center_name: updates.title,
        })
        .eq('cost_center_id', id)
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
        .eq('cost_center_id', id);

      if (error) throw new Error('Failed to delete cost center: ' + error.message);
    } catch (error) {
      console.error('Error in deleteCostCenter:', error);
      throw error;
    }
  },
};