import { supabase } from '../lib/supabase';

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
          type,
          parent_id,
          sort_order,
          status,
          code,
          accounting_code,
          color,
          icon,
          description,
          cost_center_created_at,
          cost_center_updated_at,
          parent:cost_centers!parent_id(cost_center_name)
        `)
        .eq('cost_center_workspace_id', workspaceId)
        .order('sort_order', { ascending: true });

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
        type: item.type,
        code: item.code,
        parent_id: item.parent_id,
        parent_name: item.parent?.cost_center_name || null,
        accounting_code: item.accounting_code,
        status: item.status || 'active',
        color: item.color,
        icon: item.icon,
        description: item.description,
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
          type: costCenterData.type,
          code: costCenterData.code,
          parent_id: costCenterData.parent_id,
          accounting_code: costCenterData.accounting_code,
          status: costCenterData.status,
          color: costCenterData.color,
          icon: costCenterData.icon,
          description: costCenterData.description,
          sort_order: costCenterData.sort_order || 0,
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
      const updateData: any = {};
      if (updates.title !== undefined) updateData.cost_center_name = updates.title;
      if (updates.type !== undefined) updateData.type = updates.type;
      if (updates.code !== undefined) updateData.code = updates.code;
      if (updates.parent_id !== undefined) updateData.parent_id = updates.parent_id;
      if (updates.accounting_code !== undefined) updateData.accounting_code = updates.accounting_code;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.color !== undefined) updateData.color = updates.color;
      if (updates.icon !== undefined) updateData.icon = updates.icon;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.sort_order !== undefined) updateData.sort_order = updates.sort_order;

      const { data, error } = await supabase
        .from('cost_centers')
        .update(updateData)
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

  async updateCostCenterOrder(workspaceId: string, updates: Array<{ id: string; parent_id: string | null; sort_order: number }>) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw new Error('Authentication failed: ' + userError.message);
      if (!user) throw new Error('User not authenticated');

      // Update multiple cost centers in a single transaction-like operation
      const promises = updates.map(update => 
        supabase
          .from('cost_centers')
          .update({
            parent_id: update.parent_id,
            sort_order: update.sort_order,
          })
          .eq('cost_center_id', update.id)
          .eq('cost_center_workspace_id', workspaceId)
      );

      const results = await Promise.all(promises);
      
      // Check for errors
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        throw new Error('Failed to update cost center order: ' + errors[0].error.message);
      }

      return true;
    } catch (error) {
      console.error('Error in updateCostCenterOrder:', error);
      throw error;
    }
  },
};