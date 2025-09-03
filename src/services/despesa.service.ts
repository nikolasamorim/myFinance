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
  transaction_date: string;
  status: 'pending' | 'paid';
  repeat_type?: 'avulsa' | 'fixa' | 'recorrente';
  repeat_interval?: string;
  is_installment?: boolean;
  installment_total?: number;
  category_id?: string;
  cost_center_id?: string;
  bank_id?: string;
  notes?: string;
}

interface DespesaSummary {
  totalPaid: number;
  totalPending: number;
  totalInstallments: number;
  monthlyAverage: number;
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

      // Status filter
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
        transaction_date: item.transaction_date,
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

  async getDespesasSummary(workspaceId: string, filters: DespesaFilters): Promise<DespesaSummary> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw new Error('Authentication failed: ' + userError.message);
      if (!user) throw new Error('User not authenticated');
  
      // 1) Consulta principal COM os mesmos filtros da listagem
      let baseQuery = supabase
        .from('transactions')
        .select('transaction_id, transaction_amount, transaction_status, transaction_description, transaction_date')
        .eq('transaction_workspace_id', workspaceId)
        .eq('transaction_type', 'expense');
  
      if (filters.search) {
        baseQuery = baseQuery.ilike('transaction_description', `%${filters.search}%`);
      }
  
      if (filters.status !== 'all') {
        baseQuery = baseQuery.eq('transaction_status', filters.status);
      }
  
      if (filters.period === 'current_month') {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
        baseQuery = baseQuery
          .gte('transaction_date', startOfMonth.toISOString().split('T')[0])
          .lte('transaction_date', endOfMonth.toISOString().split('T')[0]);
      } else if (filters.period === 'last_month') {
        const now = new Date();
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  
        baseQuery = baseQuery
          .gte('transaction_date', startOfLastMonth.toISOString().split('T')[0])
          .lte('transaction_date', endOfLastMonth.toISOString().split('T')[0]);
      }
  
      const { data: expenses, error: baseErr } = await baseQuery;
      if (baseErr) throw new Error('Failed to fetch expenses summary: ' + baseErr.message);
  
      const allExpenses = expenses || [];
      const seenIds = new Set(allExpenses.map(e => e.transaction_id));
  
      // 2) Consulta EXTRA só de recorrentes, SEM filtro de período
      let recurQuery = supabase
        .from('transactions')
        .select('transaction_id, transaction_amount, transaction_status, transaction_description, transaction_date')
        .eq('transaction_workspace_id', workspaceId)
        .eq('transaction_type', 'expense')
        .eq('recurring', true); // troque para .eq('transaction_recurring', true) se for o seu caso
  
      // Mantém search/status para respeitar o filtro atual, mas sem período
      if (filters.search) {
        recurQuery = recurQuery.ilike('transaction_description', `%${filters.search}%`);
      }
      if (filters.status !== 'all') {
        recurQuery = recurQuery.eq('transaction_status', filters.status);
      }
  
      const { data: recurringRows, error: recurErr } = await recurQuery;
      if (recurErr) throw new Error('Failed to fetch recurring expenses: ' + recurErr.message);
  
      // Evita duplicar recorrentes que já entraram pela consulta principal (período)
      const recurringOnly = (recurringRows || []).filter(r => !seenIds.has(r.transaction_id));
  
      // ===== Cálculos =====
      const sum = (arr: any[]) => arr.reduce((acc, e) => acc + Number(e.transaction_amount || 0), 0);
  
      // Base
      const basePaid = sum(allExpenses.filter(e => e.transaction_status === 'paid'));
      const basePending = sum(allExpenses.filter(e => e.transaction_status === 'pending'));
  
      // Recorrentes (fora de período)
      const recurPaid = sum(recurringOnly.filter(e => e.transaction_status === 'paid'));
      const recurPending = sum(recurringOnly.filter(e => e.transaction_status === 'pending'));
  
      const totalPaid = basePaid + recurPaid;
      const totalPending = basePending + recurPending;
  
      // Heurística de parcelas (mantida como no seu código)
      const totalInstallments = allExpenses
        .filter(e => (e.transaction_description || '').includes('/'))
        .reduce((acc, e) => acc + Number(e.transaction_amount), 0);
  
      const total = allExpenses.reduce((acc, e) => acc + Number(e.transaction_amount), 0);
      const monthlyAverage = allExpenses.length > 0 ? total / 12 : 0;
  
      return {
        totalPaid,
        totalPending,
        totalInstallments,
        monthlyAverage,
      };
    } catch (error) {
      console.error('Error in getDespesasSummary:', error);
      throw error;
    }
  }
  ,

  async getInstallmentsThisMonth(workspaceId: string) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw new Error('Authentication failed: ' + userError.message);
      if (!user) throw new Error('User not authenticated');

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('transaction_workspace_id', workspaceId)
        .eq('transaction_type', 'expense')
        .gte('transaction_date', startOfMonth.toISOString().split('T')[0])
        .lte('transaction_date', endOfMonth.toISOString().split('T')[0])
        .ilike('transaction_description', '%/%'); // Simple pattern for installments

      if (error) throw new Error('Failed to fetch installments: ' + error.message);

      return (data || []).map(item => ({
        id: item.transaction_id,
        title: item.transaction_description,
        amount: item.transaction_amount,
        transaction_date: item.transaction_date,
        status: item.transaction_status || 'pending',
        installment_number: item.installment_number,
        installment_total: item.installment_total,
      }));
    } catch (error) {
      console.error('Error in getInstallmentsThisMonth:', error);
      throw error;
    }
  },

  async getFixedExpensesThisMonth(workspaceId: string) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw new Error('Authentication failed: ' + userError.message);
      if (!user) throw new Error('User not authenticated');

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('transaction_workspace_id', workspaceId)
        .eq('transaction_type', 'expense')
        .eq('recurring', true)
        // Comentando o código abaixo para trazer as despesas fixas independente da data que foi criada
        // .gte('transaction_date', startOfMonth.toISOString().split('T')[0])
        // .lte('transaction_date', endOfMonth.toISOString().split('T')[0])

      if (error) throw new Error('Failed to fetch fixed expenses: ' + error.message);

      return (data || []).map(item => ({
        id: item.transaction_id,
        title: item.transaction_description,
        amount: item.transaction_amount,
        transaction_date: item.transaction_date,
        status: item.transaction_status || 'pending',
        category: null, // Would need category join
      }));
    } catch (error) {
      console.error('Error in getFixedExpensesThisMonth:', error);
      throw error;
    }
  },

  async createDespesa(workspaceId: string, despesaData: DespesaData) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw new Error('Authentication failed: ' + userError.message);
      if (!user) throw new Error('User not authenticated');

      if (despesaData.is_installment && despesaData.installment_total && despesaData.installment_total > 1) {
        // Create installments
        const installments = [];

        for (let i = 1; i <= despesaData.installment_total; i++) {
          const installmentDate = new Date(despesaData.transaction_date);
          installmentDate.setMonth(installmentDate.getMonth() + (i - 1));

          installments.push({
            transaction_workspace_id: workspaceId,
            transaction_created_by_user_id: user.id,
            transaction_type: 'expense',
            transaction_description: `${despesaData.title} - Parcela ${i}/${despesaData.installment_total}`,
            transaction_amount: despesaData.amount,
            transaction_date: installmentDate.toISOString().split('T')[0],
            transaction_category_id: despesaData.category_id || null,
            transaction_cost_center_id: despesaData.cost_center_id || null,
            transaction_bank_id: despesaData.bank_id || null,
            transaction_status: despesaData.status || 'pending',
          });
        }

        const { data, error } = await supabase
          .from('transactions')
          .insert(installments)
          .select();

        if (error) throw new Error('Failed to create installments: ' + error.message);
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
            transaction_date: despesaData.transaction_date,
            transaction_category_id: despesaData.category_id || null,
            transaction_cost_center_id: despesaData.cost_center_id || null,
            transaction_bank_id: despesaData.bank_id || null,
            transaction_status: despesaData.status || 'pending',
          }])
          .select()
          .single();

        if (error) throw new Error('Failed to create despesa: ' + error.message);
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
      if (updates.transaction_date !== undefined) updateData.transaction_date = updates.transaction_date;
      if (updates.category_id !== undefined) updateData.transaction_category_id = updates.category_id;
      if (updates.cost_center_id !== undefined) updateData.transaction_cost_center_id = updates.cost_center_id;
      if (updates.bank_id !== undefined) updateData.transaction_bank_id = updates.bank_id;
      if (updates.status !== undefined) updateData.transaction_status = updates.status;

      const { data, error } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('transaction_id', id)
        .select()
        .single();

      if (error) throw new Error('Failed to update despesa: ' + error.message);
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

      if (error) throw new Error('Failed to delete despesa: ' + error.message);
    } catch (error) {
      console.error('Error in deleteDespesa:', error);
      throw error;
    }
  },

  async markAsPaid(id: string) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .update({ transaction_status: 'paid' })
        .eq('transaction_id', id)
        .select()
        .single();

      if (error) throw new Error('Failed to mark despesa as paid: ' + error.message);
      return data;
    } catch (error) {
      console.error('Error in markAsPaid:', error);
      throw error;
    }
  },
};