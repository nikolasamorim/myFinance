import { supabase } from '../lib/supabase';

interface AccountFilters {
  type: string;
  search: string;
}

export interface AccountData {
  title: string;
  type: 'cash' | 'bank';
  initial_balance: number;
  opened_at: string;
  cost_center_id?: string | null;
  color?: string;
  icon?: string;
  description?: string;
}

export const accountService = {
  async getAccounts(workspaceId: string, filters: AccountFilters) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('Error getting user:', userError);
        throw new Error('Authentication failed: ' + userError.message);
      }
      if (!user) throw new Error('User not authenticated');

      let query = supabase
        .from('accounts')
        .select(`
          id,
          workspace_id,
          title,
          type,
          initial_balance,
          opened_at,
          cost_center_id,
          color,
          icon,
          description,
          created_at,
          updated_at
        `)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (filters.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }

      if (filters.type !== 'all') {
        query = query.eq('type', filters.type);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching accounts:', error);
        throw new Error('Failed to fetch accounts: ' + error.message);
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getAccounts:', error);
      throw error;
    }
  },

  async createAccount(workspaceId: string, accountData: AccountData) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw new Error('Authentication failed: ' + userError.message);
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('accounts')
        .insert([{
          workspace_id: workspaceId,
          title: accountData.title,
          type: accountData.type,
          initial_balance: accountData.initial_balance,
          opened_at: accountData.opened_at,
          cost_center_id: accountData.cost_center_id,
          color: accountData.color,
          icon: accountData.icon,
          description: accountData.description,
        }])
        .select()
        .single();

      if (error) throw new Error('Failed to create account: ' + error.message);
      return data;
    } catch (error) {
      console.error('Error in createAccount:', error);
      throw error;
    }
  },

  async updateAccount(id: string, updates: Partial<AccountData>) {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error('Failed to update account: ' + error.message);
      return data;
    } catch (error) {
      console.error('Error in updateAccount:', error);
      throw error;
    }
  },

  async deleteAccount(id: string) {
    try {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', id);

      if (error) throw new Error('Failed to delete account: ' + error.message);
    } catch (error) {
      console.error('Error in deleteAccount:', error);
      throw error;
    }
  },
};