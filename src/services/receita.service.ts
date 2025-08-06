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
  due_date: string;
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
      .eq('workspace_id', workspaceId)
      .eq('type', 'income')
      .order('due_date', { ascending: false });

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
        .gte('due_date', startOfMonth.toISOString().split('T')[0])
        .lte('due_date', endOfMonth.toISOString().split('T')[0]);
    } else if (filters.period === 'last_month') {
      const now = new Date();
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      
      query = query
        .gte('due_date', startOfLastMonth.toISOString().split('T')[0])
        .lte('due_date', endOfLastMonth.toISOString().split('T')[0]);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  async createReceita(workspaceId: string, receitaData: ReceitaData) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const baseReceita = {
      workspace_id: workspaceId,
      user_id: user.id,
      type: 'income',
      flow: 'in',
      status: receitaData.is_received ? 'received' : 'pending',
      title: receitaData.title,
      subtitle: receitaData.subtitle || null,
      amount: receitaData.amount,
      due_date: receitaData.due_date,
      paid_date: receitaData.is_received ? receitaData.due_date : null,
      repeat_type: receitaData.repeat_type,
      repeat_interval: receitaData.repeat_interval || null,
      is_installment: receitaData.is_installment,
      installment_total: receitaData.is_installment ? receitaData.installment_total : null,
      category_id: receitaData.category_id || null,
      notes: receitaData.notes || null,
    };

    if (receitaData.is_installment && receitaData.installment_total && receitaData.installment_total > 1) {
      // Create installments
      const installmentGroupId = uuidv4();
      const installments = [];

      for (let i = 1; i <= receitaData.installment_total; i++) {
        const installmentDate = new Date(receitaData.due_date);
        installmentDate.setMonth(installmentDate.getMonth() + (i - 1));

        installments.push({
          ...baseReceita,
          subtitle: receitaData.subtitle || `Parcela ${i}/${receitaData.installment_total}`,
          due_date: installmentDate.toISOString().split('T')[0],
          paid_date: receitaData.is_received && i === 1 ? installmentDate.toISOString().split('T')[0] : null,
          status: receitaData.is_received && i === 1 ? 'received' : 'pending',
          installment_number: i,
          installment_group_id: installmentGroupId,
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
          installment_number: null,
          installment_group_id: null,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  },

  async updateReceita(id: string, updates: Partial<ReceitaData>) {
    const updateData: any = {};

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.subtitle !== undefined) updateData.subtitle = updates.subtitle;
    if (updates.amount !== undefined) updateData.amount = updates.amount;
    if (updates.due_date !== undefined) updateData.due_date = updates.due_date;
    if (updates.repeat_type !== undefined) updateData.repeat_type = updates.repeat_type;
    if (updates.repeat_interval !== undefined) updateData.repeat_interval = updates.repeat_interval;
    if (updates.category_id !== undefined) updateData.category_id = updates.category_id;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    if (updates.is_received !== undefined) {
      updateData.status = updates.is_received ? 'received' : 'pending';
      updateData.paid_date = updates.is_received ? (updates.due_date || new Date().toISOString().split('T')[0]) : null;
    }

    const { data, error } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteReceita(id: string) {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async markAsReceived(id: string) {
    const { data, error } = await supabase
      .from('transactions')
      .update({
        status: 'received',
        paid_date: new Date().toISOString().split('T')[0],
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};