import { supabase } from '../lib/supabase';
import type { InstallmentGroup } from '../types';

export interface InstallmentGroupData {
  total_value: number;
  installment_count: number;
  initial_due_date: string;
  description: string;
  payment_method_id?: string;
  account_id?: string;
  card_id?: string;
}

export const installmentService = {
  async getInstallmentGroups(workspaceId: string) {
    try {
      const { data, error } = await supabase
        .from('installment_groups')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw new Error('Failed to fetch installment groups: ' + error.message);
      return data || [];
    } catch (error) {
      console.error('Error in getInstallmentGroups:', error);
      throw error;
    }
  },

  async createInstallmentGroup(workspaceId: string, groupData: InstallmentGroupData, userId: string) {
    try {
      const { data, error } = await supabase
        .from('installment_groups')
        .insert([{
          workspace_id: workspaceId,
          user_id: userId,
          ...groupData,
        }])
        .select()
        .single();

      if (error) throw new Error('Failed to create installment group: ' + error.message);
      return data;
    } catch (error) {
      console.error('Error in createInstallmentGroup:', error);
      throw error;
    }
  },

  async updateInstallmentGroup(id: string, updates: Partial<InstallmentGroupData>) {
    try {
      const { data, error } = await supabase
        .from('installment_groups')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error('Failed to update installment group: ' + error.message);
      return data;
    } catch (error) {
      console.error('Error in updateInstallmentGroup:', error);
      throw error;
    }
  },

  async deleteInstallmentGroup(id: string) {
    try {
      const { error } = await supabase
        .from('installment_groups')
        .delete()
        .eq('id', id);

      if (error) throw new Error('Failed to delete installment group: ' + error.message);
    } catch (error) {
      console.error('Error in deleteInstallmentGroup:', error);
      throw error;
    }
  },

  async getInstallmentsByGroup(groupId: string) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('installment_group_id', groupId)
        .order('installment_number', { ascending: true });

      if (error) throw new Error('Failed to fetch installments: ' + error.message);
      return data || [];
    } catch (error) {
      console.error('Error in getInstallmentsByGroup:', error);
      throw error;
    }
  },
};