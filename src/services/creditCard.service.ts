import { supabase } from '../lib/supabase';

interface CreditCardFilters {
  search: string;
}

export interface CreditCardData {
  title: string;
  flag: string;
  limit: number;
  initial_balance: number;
  account_id: string;
  due_day: number;
  closing_day: number;
  last_four_digits?: string;
  color?: string;
  icon?: string;
  description?: string;
}

export const creditCardService = {
  async getCreditCards(workspaceId: string, filters: CreditCardFilters) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('Error getting user:', userError);
        throw new Error('Authentication failed: ' + userError.message);
      }
      if (!user) throw new Error('User not authenticated');

      let query = supabase
        .from('credit_cards')
        .select(`
          credit_card_id,
          credit_card_workspace_id,
          credit_card_name,
          credit_card_limit,
          initial_balance,
          account_id,
          credit_card_closing_day,
          credit_card_due_day,
          color,
          icon,
          credit_card_created_at,
          credit_card_updated_at,
          accounts!inner(id, title)
        `)
        .eq('credit_card_workspace_id', workspaceId)
        .order('credit_card_created_at', { ascending: false });

      if (filters.search) {
        query = query.ilike('credit_card_name', `%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching credit cards:', error);
        throw new Error('Failed to fetch credit cards: ' + error.message);
      }
      
      // Map database column names to frontend expected format
      return (data || []).map(card => ({
        id: card.credit_card_id,
        workspace_id: card.credit_card_workspace_id,
        title: card.credit_card_name,
        flag: 'Visa', // Default since flag column doesn't exist in schema
        limit: card.credit_card_limit,
        initial_balance: card.initial_balance || 0,
        account_id: card.account_id,
        linked_account_name: card.accounts?.title || null,
        due_day: card.credit_card_due_day,
        closing_day: card.credit_card_closing_day,
        color: card.color,
        icon: card.icon,
        description: null, // Not in current schema
        created_at: card.credit_card_created_at,
        updated_at: card.credit_card_updated_at,
      }));
    } catch (error) {
      console.error('Error in getCreditCards:', error);
      throw error;
    }
  },

  async createCreditCard(workspaceId: string, cardData: CreditCardData) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw new Error('Authentication failed: ' + userError.message);
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('credit_cards')
        .insert([{
          credit_card_workspace_id: workspaceId,
          credit_card_name: cardData.title,
          credit_card_limit: cardData.limit,
          initial_balance: cardData.initial_balance,
          account_id: cardData.account_id,
          credit_card_due_day: cardData.due_day,
          credit_card_closing_day: cardData.closing_day,
          color: cardData.color,
          icon: cardData.icon,
        }])
        .select()
        .single();

      if (error) throw new Error('Failed to create credit card: ' + error.message);
      return data;
    } catch (error) {
      console.error('Error in createCreditCard:', error);
      throw error;
    }
  },

  async updateCreditCard(id: string, updates: Partial<CreditCardData>) {
    try {
      // Map frontend field names to database column names
      const dbUpdates: any = {};
      if (updates.title) dbUpdates.credit_card_name = updates.title;
      if (updates.limit !== undefined) dbUpdates.credit_card_limit = updates.limit;
      if (updates.initial_balance !== undefined) dbUpdates.initial_balance = updates.initial_balance;
      if (updates.account_id !== undefined) dbUpdates.account_id = updates.account_id;
      if (updates.due_day !== undefined) dbUpdates.credit_card_due_day = updates.due_day;
      if (updates.closing_day !== undefined) dbUpdates.credit_card_closing_day = updates.closing_day;
      if (updates.color !== undefined) dbUpdates.color = updates.color;
      if (updates.icon !== undefined) dbUpdates.icon = updates.icon;

      const { data, error } = await supabase
        .from('credit_cards')
        .update(dbUpdates)
        .eq('credit_card_id', id)
        .select()
        .single();

      if (error) throw new Error('Failed to update credit card: ' + error.message);
      return data;
    } catch (error) {
      console.error('Error in updateCreditCard:', error);
      throw error;
    }
  },

  async deleteCreditCard(id: string) {
    try {
      const { error } = await supabase
        .from('credit_cards')
        .delete()
        .eq('credit_card_id', id);

      if (error) throw new Error('Failed to delete credit card: ' + error.message);
    } catch (error) {
      console.error('Error in deleteCreditCard:', error);
      throw error;
    }
  },
};