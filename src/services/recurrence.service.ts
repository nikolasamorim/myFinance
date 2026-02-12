import { supabase } from '../lib/supabase';
import type { RecurrenceRule } from '../types';

export interface RecurrenceRuleData {
  transaction_type: 'income' | 'expense' | 'debt' | 'investment';
  description: string;
  start_date: string;
  recurrence_type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  repeat_count?: number;
  end_date?: string;
  due_adjustment: 'none' | 'previous_business_day' | 'next_business_day';
  recurrence_day?: string;
  status: 'active' | 'paused' | 'canceled';
}

export const recurrenceService = {
  async getRecurrenceRules(workspaceId: string) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw new Error('Authentication failed: ' + userError.message);
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('recurrence_rules')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw new Error('Failed to fetch recurrence rules: ' + error.message);
      return data || [];
    } catch (error) {
      console.error('Error in getRecurrenceRules:', error);
      throw error;
    }
  },

  async createRecurrenceRule(workspaceId: string, ruleData: RecurrenceRuleData) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw new Error('Authentication failed: ' + userError.message);
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('recurrence_rules')
        .insert([{
          workspace_id: workspaceId,
          created_by_user_id: user.id,
          ...ruleData,
        }])
        .select()
        .single();

      if (error) throw new Error('Failed to create recurrence rule: ' + error.message);
      return data;
    } catch (error) {
      console.error('Error in createRecurrenceRule:', error);
      throw error;
    }
  },

  async updateRecurrenceRule(id: string, updates: Partial<RecurrenceRuleData>) {
    try {
      const { data, error } = await supabase
        .from('recurrence_rules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error('Failed to update recurrence rule: ' + error.message);
      return data;
    } catch (error) {
      console.error('Error in updateRecurrenceRule:', error);
      throw error;
    }
  },

  async deleteRecurrenceRule(id: string) {
    try {
      const { error } = await supabase
        .from('recurrence_rules')
        .delete()
        .eq('id', id);

      if (error) throw new Error('Failed to delete recurrence rule: ' + error.message);
    } catch (error) {
      console.error('Error in deleteRecurrenceRule:', error);
      throw error;
    }
  },

  async pauseRecurrenceRule(id: string) {
    try {
      return await this.updateRecurrenceRule(id, { status: 'paused' });
    } catch (error) {
      console.error('Error in pauseRecurrenceRule:', error);
      throw error;
    }
  },

  async resumeRecurrenceRule(id: string) {
    try {
      return await this.updateRecurrenceRule(id, { status: 'active' });
    } catch (error) {
      console.error('Error in resumeRecurrenceRule:', error);
      throw error;
    }
  },

  async cancelRecurrenceRule(id: string) {
    try {
      return await this.updateRecurrenceRule(id, { status: 'canceled' });
    } catch (error) {
      console.error('Error in cancelRecurrenceRule:', error);
      throw error;
    }
  },
};