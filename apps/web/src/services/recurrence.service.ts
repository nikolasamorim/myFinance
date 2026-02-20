import { supabase } from '../lib/supabase';
import { generateRecurrences } from './recurrenceEngine.service';

export interface RecurrenceRuleData {
  transaction_type: 'income' | 'expense' | 'debt' | 'investment';
  description: string;
  amount?: number;
  start_date: string;
  recurrence_type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  repeat_count?: number;
  end_date?: string;
  due_adjustment?: 'none' | 'previous_business_day' | 'next_business_day';
  recurrence_day?: string;
  account_id?: string;
  category_id?: string;
  notes?: string;
  status?: 'active' | 'paused' | 'canceled';
}

function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const recurrenceService = {
  async getRecurrenceRules(workspaceId: string) {
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
  },

  async createRecurrenceRule(workspaceId: string, ruleData: RecurrenceRuleData) {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw new Error('Authentication failed: ' + userError.message);
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('recurrence_rules')
      .insert([{
        workspace_id: workspaceId,
        created_by_user_id: user.id,
        ...ruleData,
        due_adjustment: ruleData.due_adjustment || 'none',
        status: 'active',
        generation_count: 0,
      }])
      .select()
      .single();

    if (error) throw new Error('Failed to create recurrence rule: ' + error.message);

    const engineResult = await generateRecurrences(data.id, 'on_save');
    if (!engineResult.success) {
      console.error('Engine generation failed after rule creation:', engineResult.error);
    }

    return data;
  },

  async updateRecurrenceRule(id: string, updates: Partial<RecurrenceRuleData>) {
    const todayISO = toISO(new Date());

    await supabase
      .from('transactions')
      .delete()
      .eq('parent_recurrence_rule_id', id)
      .gte('recurrence_instance_date', todayISO);

    const { data, error } = await supabase
      .from('recurrence_rules')
      .update({
        ...updates,
        generated_until: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error('Failed to update recurrence rule: ' + error.message);

    if (data.status === 'active') {
      const existingMax = await getMaxGeneratedDate(id);
      if (existingMax) {
        await supabase
          .from('recurrence_rules')
          .update({ generated_until: existingMax })
          .eq('id', id);
      }

      const engineResult = await generateRecurrences(id, 'on_edit');
      if (!engineResult.success) {
        console.error('Engine generation failed after rule update:', engineResult.error);
      }
    }

    return data;
  },

  async deleteRecurrenceRule(id: string) {
    const { error } = await supabase
      .from('recurrence_rules')
      .delete()
      .eq('id', id);

    if (error) throw new Error('Failed to delete recurrence rule: ' + error.message);
  },

  async pauseRecurrenceRule(id: string) {
    const { data, error } = await supabase
      .from('recurrence_rules')
      .update({ status: 'paused', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error('Failed to pause recurrence rule: ' + error.message);
    return data;
  },

  async resumeRecurrenceRule(id: string) {
    const { data, error } = await supabase
      .from('recurrence_rules')
      .update({
        status: 'active',
        error_count: 0,
        last_error_at: null,
        last_error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error('Failed to resume recurrence rule: ' + error.message);

    const engineResult = await generateRecurrences(id, 'maintenance');
    if (!engineResult.success) {
      console.error('Engine generation failed after rule resume:', engineResult.error);
    }

    return data;
  },

  async cancelRecurrenceRule(id: string) {
    const todayISO = toISO(new Date());

    await supabase
      .from('transactions')
      .delete()
      .eq('parent_recurrence_rule_id', id)
      .gte('recurrence_instance_date', todayISO);

    const { data, error } = await supabase
      .from('recurrence_rules')
      .update({
        status: 'canceled',
        next_run_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error('Failed to cancel recurrence rule: ' + error.message);
    return data;
  },
};

async function getMaxGeneratedDate(ruleId: string): Promise<string | null> {
  const { data } = await supabase
    .from('transactions')
    .select('recurrence_instance_date')
    .eq('parent_recurrence_rule_id', ruleId)
    .order('recurrence_instance_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.recurrence_instance_date || null;
}
