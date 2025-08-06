import { supabase } from '../lib/supabase';

interface DespesaFilters {
  status: string;
  type: string;
  installments: string;
  period: string;
  category: string;
  search: string;
}

export interface DespesaData {
  title: string;
  subtitle?: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid';
  repeat_type?: 'avulsa' | 'fixa' | 'recorrente';
  repeat_interval?: string;
  is_installment?: boolean;
  installment_total?: number;
  category_id?: string;
  notes?: string;
}

export const despesaService = {
  async getDespesas(workspaceId: string, filters: DespesaFilters) {
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
        .eq('transaction_type', 'expense')
        .order('transaction_date', { ascending: false });

      if (filters.search) {
        query = query.ilike('transaction_description', `%${filters.search}%`);
      }

      if (filters.status !== 'all') {
        query = query.eq('transaction_status', filters.status);
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
        console.error('Error fetching despesas:', error);
        throw new Error('Failed to fetch despesas: ' + error.message);
      }
      
      // Transform data to match expected format
      return (data || []).map(item => ({
        id: item.transaction_id,
        title: item.transaction_description,
        amount: item.transaction_amount,
        due_date: item.transaction_date,
        status: item.transaction_status || 'pending',
        repeat_type: 'avulsa', // Default type
        is_installment: false,
        category_id: item.transaction_category_id,
        created_at: item.transaction_created_at,
        updated_at: item.transaction_updated_at
      }));
    } catch (error) {
      console.error('Error in getDespesas:', error);
      throw error;
    }
  },

  async createDespesa(workspaceId: string, despesaData: DespesaData) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('Error getting user:', userError);
        throw new Error('Authentication failed: ' + userError.message);
      }
      if (!user) throw new Error('User not authenticated');

      if (despesaData.is_installment && despesaData.installment_total && despesaData.installment_total > 1) {
        // Create installments
        const installments = [];
        const installmentGroupId = crypto.randomUUID();

        for (let i = 1; i <= despesaData.installment_total; i++) {
          const installmentDate = new Date(despesaData.due_date);
          installmentDate.setMonth(installmentDate.getMonth() + (i - 1));

          installments.push({
            transaction_workspace_id: workspaceId,
            transaction_created_by_user_id: user.id,
            transaction_type: 'expense',
            transaction_description: `${despesaData.title} - Parcela ${i}/${despesaData.installment_total}`,
            transaction_amount: despesaData.amount,
            transaction_date: installmentDate.toISOString().split('T')[0],
            transaction_category_id: despesaData.category_id || null,
            transaction_status: despesaData.status || 'pending',
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
        // Create single despesa
        const { data, error } = await supabase
          .from('transactions')
          .insert([{
            transaction_workspace_id: workspaceId,
            transaction_created_by_user_id: user.id,
            transaction_type: 'expense',
            transaction_description: despesaData.title,
            transaction_amount: despesaData.amount,
            transaction_date: despesaData.due_date,
            transaction_category_id: despesaData.category_id || null,
            transaction_status: despesaData.status || 'pending',
          }])
          .select()
          .single();

        if (error) {
          console.error('Error creating despesa:', error);
          throw new Error('Failed to create despesa: ' + error.message);
        }
        return data;
      }
    } catch (error) {
      console.error('Error in createDespesa:', error);
      throw error;
    }
  },

  async updateDespesa(id: string, updates: Partial<DespesaData>) {
    try {
      const updateData: any = {};

      if (updates.title !== undefined) updateData.transaction_description = updates.title;
      if (updates.amount !== undefined) updateData.transaction_amount = updates.amount;
      if (updates.due_date !== undefined) updateData.transaction_date = updates.due_date;
      if (updates.category_id !== undefined) updateData.transaction_category_id = updates.category_id;
      if (updates.status !== undefined) updateData.transaction_status = updates.status;

      const { data, error } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('transaction_id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating despesa:', error);
        throw new Error('Failed to update despesa: ' + error.message);
      }
      return data;
    } catch (error) {
      console.error('Error in updateDespesa:', error);
      throw error;
    }
  },

  async deleteDespesa(id: string) {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('transaction_id', id);

      if (error) {
        console.error('Error deleting despesa:', error);
        throw new Error('Failed to delete despesa: ' + error.message);
      }
    } catch (error) {
      console.error('Error in deleteDespesa:', error);
      throw error;
    }
  },

  async markAsPaid(id: string) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .update({ 
          transaction_status: 'paid',
          // Could also set paid_date here if we had that field
        })
        .eq('transaction_id', id)
        .select()
        .single();

      if (error) {
        console.error('Error marking despesa as paid:', error);
        throw new Error('Failed to mark despesa as paid: ' + error.message);
      }
      return data;
    } catch (error) {
      console.error('Error in markAsPaid:', error);
      throw error;
    }
  },

  async duplicateDespesa(id: string) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw new Error('Authentication failed: ' + userError.message);
      if (!user) throw new Error('User not authenticated');

      // Get original despesa
      const { data: original, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('transaction_id', id)
        .single();

      if (fetchError) throw new Error('Failed to fetch original despesa: ' + fetchError.message);

      // Create duplicate
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          transaction_workspace_id: original.transaction_workspace_id,
          transaction_created_by_user_id: user.id,
          transaction_type: 'expense',
          transaction_description: `${original.transaction_description} (Cópia)`,
          transaction_amount: original.transaction_amount,
          transaction_date: new Date().toISOString().split('T')[0], // Today's date
          transaction_category_id: original.transaction_category_id,
          transaction_status: 'pending', // Always start as pending
        }])
        .select()
        .single();

      if (error) {
        console.error('Error duplicating despesa:', error);
        throw new Error('Failed to duplicate despesa: ' + error.message);
      }
      return data;
    } catch (error) {
      console.error('Error in duplicateDespesa:', error);
      throw error;
    }
  },
};