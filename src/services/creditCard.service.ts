import { supabase } from '../lib/supabase';

interface CreditCardFilters {
  search: string;
}

export interface CreditCardData {
  title: string;
  flag: string;
  limit: number;
  linked_account_id?: string | null;
  due_day: number;
  closing_day: number;
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
          id,
          workspace_id,
          title,
          flag,
          limit,
          linked_account_id,
          due_day,
          closing_day,
          description,
          created_at,
          updated_at
        `)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (filters.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching credit cards:', error);
        throw new Error('Failed to fetch credit cards: ' + error.message);
      }
      
      return data || [];
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
          workspace_id: workspaceId,
          title: cardData.title,
          flag: cardData.flag,
          limit: cardData.limit,
          linked_account_id: cardData.linked_account_id,
          due_day: cardData.due_day,
          closing_day: cardData.closing_day,
          description: cardData.description,
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
      const { data, error } = await supabase
        .from('credit_cards')
        .update(updates)
        .eq('id', id)
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
        .eq('id', id);

      if (error) throw new Error('Failed to delete credit card: ' + error.message);
    } catch (error) {
      console.error('Error in deleteCreditCard:', error);
      throw error;
    }
  },
};