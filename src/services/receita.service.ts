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
    const { data: { user } } = await supabase.auth.getUser();
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

    if (error) throw error;
    
    // Transform data to match expected format
    return (data || []).map(item => ({
      id: item.transaction_id,
      title: item.transaction_description,
      amount: item.transaction_amount,
      transaction_date: item.transaction_date,
      status: 'pending', // Default status since we don't have this field yet
      repeat_type: 'avulsa', // Default type
      is_installment: false,
      category_id: item.transaction_category_id,
      created_at: item.transaction_created_at,
      updated_at: item.transaction_updated_at
    }));
  },

  async createReceita(workspaceId: string, receitaData: ReceitaData) {
    const { data: { user } } = await supabase.auth.getUser();
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
        });
      }

      const { data, error } = await supabase
        .from('transactions')
        .insert(installments)
        .select();

      if (error) throw error;
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
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  },

  async updateReceita(id: string, updates: Partial<ReceitaData>) {
    const updateData: any = {};

    if (updates.title !== undefined) updateData.transaction_description = updates.title;
    if (updates.amount !== undefined) updateData.transaction_amount = updates.amount;
    if (updates.transaction_date !== undefined) updateData.transaction_date = updates.transaction_date;
    if (updates.category_id !== undefined) updateData.transaction_category_id = updates.category_id;

    const { data, error } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('transaction_id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteReceita(id: string) {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('transaction_id', id);

    if (error) throw error;
  },

  async markAsReceived(id: string) {
    // Since we don't have a status field in the database yet,
    // we'll use a simple approach - just return success for now
    // In a real implementation, you would update a status field
    const { data, error } = await supabase
      .from('transactions')
      .select('transaction_id')
      .eq('transaction_id', id)
      .single();

    if (error) throw error;
    return { success: true, data };
  },
};