import { supabase } from '../lib/supabase';

interface ReceitaFilters {
  status: string;
  type: string;
  installments: string;
  period: string;
  category: string;
  search: string;
}

export interface ReceitaData {
  title: string;
  subtitle?: string;
  amount: number;
  transaction_date: string;
  status: 'pending' | 'received';
  repeat_type?: 'avulsa' | 'fixa' | 'recorrente';
  repeat_interval?: string;
  is_installment?: boolean;
  installment_total?: number;
  category_id?: string;
  notes?: string;
}

export const receitaService = {
  async getReceitas(workspaceId: string, filters: ReceitaFilters) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('Error getting user:', userError);
        throw new Error('Authentication failed: ' + userError.message);
      }
      if (!user) throw new Error('User not authenticated');

      let query = supabase
        .from('transactions')
        .select(`
          transaction_id,
          transaction_workspace_id,
          transaction_type,
          transaction_description,
          transaction_amount,
          transaction_date,
          transaction_category_id,
          transaction_status,
          transaction_created_at,
          transaction_updated_at
        `)
        .eq('transaction_workspace_id', workspaceId)
        .eq('transaction_type', 'income')
        .order('transaction_date', { ascending: false });

      if (filters.search) {
        query = query.ilike('transaction_description', `%${filters.search}%`);
      }

      // Period filter
      if (filters.period === 'current_month') {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        query = query
          .gte('transaction_date', startOfMonth.toISOString().split('T')[0])
          .lte('transaction_date', endOfMonth.toISOString().split('T')[0]);
      } else if (filters.period === 'last_month') {
        const now = new Date();
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        
        query = query
          .gte('transaction_date', startOfLastMonth.toISOString().split('T')[0])
          .lte('transaction_date', endOfLastMonth.toISOString().split('T')[0]);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching receitas:', error);
        throw new Error('Failed to fetch receitas: ' + error.message);
      }
      
      // Transform data to match expected format
      return (data || []).map(item => ({
        id: item.transaction_id,
        title: item.transaction_description,
        amount: item.transaction_amount,
        transaction_date: item.transaction_date,
        status: item.transaction_status || 'pending',
        repeat_type: 'avulsa', // Default type
        is_installment: false,
        category_id: item.transaction_category_id,
        created_at: item.transaction_created_at,
        updated_at: item.transaction_updated_at
      }));
    } catch (error) {
      console.error('Error in getReceitas:', error);
      throw error;
    }
  },

  async createReceita(workspaceId: string, receitaData: ReceitaData) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('Error getting user:', userError);
        throw new Error('Authentication failed: ' + userError.message);
      }
      if (!user) throw new Error('User not authenticated');

      if (receitaData.is_installment && receitaData.installment_total && receitaData.installment_total > 1) {
        // Create installments
        const installments = [];

        for (let i = 1; i <= receitaData.installment_total; i++) {
          const installmentDate = new Date(receitaData.transaction_date);
          installmentDate.setMonth(installmentDate.getMonth() + (i - 1));

          installments.push({
            transaction_workspace_id: workspaceId,
            transaction_created_by_user_id: user.id,
            transaction_type: 'income',
            transaction_description: `${receitaData.title} - Parcela ${i}/${receitaData.installment_total}`,
            transaction_amount: receitaData.amount,
            transaction_date: installmentDate.toISOString().split('T')[0],
            transaction_category_id: receitaData.category_id || null,
            transaction_status: receitaData.status || 'pending',
          });
        }

        const { data, error } = await supabase
          .from('transactions')
          .insert(installments)
          .select();

        if (error) {
          console.error('Error creating installments:', error);
          throw new Error('Failed to create installments: ' + error.message);
        }
        return data;
      } else {
        // Create single receita
        const { data, error } = await supabase
          .from('transactions')
          .insert([{
            transaction_workspace_id: workspaceId,
            transaction_created_by_user_id: user.id,
            transaction_type: 'income',
            transaction_description: receitaData.title,
            transaction_amount: receitaData.amount,
            transaction_date: receitaData.transaction_date,
            transaction_category_id: receitaData.category_id || null,
            transaction_status: receitaData.status || 'pending',
          }])
          .select()
          .single();

        if (error) {
          console.error('Error creating receita:', error);
          throw new Error('Failed to create receita: ' + error.message);
        }
        return data;
      }
    } catch (error) {
      console.error('Error in createReceita:', error);
      throw error;
    }
  },

  async updateReceita(id: string, updates: Partial<ReceitaData>) {
    try {
      const updateData: any = {};

      if (updates.title !== undefined) updateData.transaction_description = updates.title;
      if (updates.amount !== undefined) updateData.transaction_amount = updates.amount;
      if (updates.transaction_date !== undefined) updateData.transaction_date = updates.transaction_date;
      if (updates.category_id !== undefined) updateData.transaction_category_id = updates.category_id;
      if (updates.status !== undefined) updateData.transaction_status = updates.status;

      const { data, error } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('transaction_id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating receita:', error);
        throw new Error('Failed to update receita: ' + error.message);
      }
      return data;
    } catch (error) {
      console.error('Error in updateReceita:', error);
      throw error;
    }
  },

  async deleteReceita(id: string) {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('transaction_id', id);

      if (error) {
        console.error('Error deleting receita:', error);
        throw new Error('Failed to delete receita: ' + error.message);
      }
    } catch (error) {
      console.error('Error in deleteReceita:', error);
      throw error;
    }
  },

  async markAsReceived(id: string) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .update({ transaction_status: 'received' })
        .eq('transaction_id', id)
        .select()
        .single();

      if (error) {
        console.error('Error marking receita as received:', error);
        throw new Error('Failed to mark receita as received: ' + error.message);
      }
      return data;
    } catch (error) {
      console.error('Error in markAsReceived:', error);
      throw error;
    }
  },
};