import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

interface ReceitaFilters {
  status: string;
  type: string;
  installments: string;
  period: string;
  category: string;
  search: string;
}

interface ReceitaData {
  title: string;
  subtitle?: string;
  amount: number;
  transaction_date: string;
  is_received: boolean;
  repeat_type: 'avulsa' | 'fixa' | 'recorrente';
  repeat_interval?: string;
  is_installment: boolean;
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
      .select('*')
      .eq('transaction_workspace_id', workspaceId)
      .eq('transaction_type', 'income')
      .order('transaction_date', { ascending: false });

    // Apply filters
    if (filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters.type !== 'all') {
      query = query.eq('repeat_type', filters.type);
    }

    if (filters.installments === 'installments') {
      query = query.eq('is_installment', true);
    }

    if (filters.search) {
      query = query.ilike('title', `%${filters.search}%`);
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
    return data || [];
  },

  async createReceita(workspaceId: string, receitaData: ReceitaData) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const baseReceita = {
      transaction_workspace_id: workspaceId,
      transaction_created_by_user_id: user.id,
      transaction_type: 'income',
      transaction_description: receitaData.title,
      transaction_amount: receitaData.amount,
      transaction_date: receitaData.transaction_date,
      transaction_category_id: receitaData.category_id || null,
    };

    if (receitaData.is_installment && receitaData.installment_total && receitaData.installment_total > 1) {
      // Create installments
      const installmentGroupId = uuidv4();
      const installments = [];

      for (let i = 1; i <= receitaData.installment_total; i++) {
        const installmentDate = new Date(receitaData.transaction_date);
        installmentDate.setMonth(installmentDate.getMonth() + (i - 1));

        installments.push({
          ...baseReceita,
          transaction_description: `${receitaData.title} - Parcela ${i}/${receitaData.installment_total}`,
          transaction_date: installmentDate.toISOString().split('T')[0],
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
          ...baseReceita,
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
    const { data, error } = await supabase
      .from('transactions')
      .update({
        transaction_type: 'income',
      })
      .eq('transaction_id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};