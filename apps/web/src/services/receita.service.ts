import { supabase } from '../lib/supabase';
import type { AdvancedFilters } from '../types/filters';

// ── Period helper ──────────────────────────────────────────────────────────────
function getPeriodRange(filters: AdvancedFilters): { start: string; end: string } | null {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];

  switch (filters.period) {
    case 'this_month':
    case 'current_month': {
      return {
        start: fmt(new Date(now.getFullYear(), now.getMonth(), 1)),
        end: fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
      };
    }
    case 'last_month': {
      return {
        start: fmt(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        end: fmt(new Date(now.getFullYear(), now.getMonth(), 0)),
      };
    }
    case 'today': {
      const today = fmt(now);
      return { start: today, end: today };
    }
    case 'this_week': {
      const day = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((day + 6) % 7));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { start: fmt(monday), end: fmt(sunday) };
    }
    case 'quarter': {
      const q = Math.floor(now.getMonth() / 3);
      return {
        start: fmt(new Date(now.getFullYear(), q * 3, 1)),
        end: fmt(new Date(now.getFullYear(), q * 3 + 3, 0)),
      };
    }
    case 'semester': {
      const half = now.getMonth() < 6 ? 0 : 6;
      return {
        start: fmt(new Date(now.getFullYear(), half, 1)),
        end: fmt(new Date(now.getFullYear(), half + 6, 0)),
      };
    }
    case 'year': {
      return {
        start: fmt(new Date(now.getFullYear(), 0, 1)),
        end: fmt(new Date(now.getFullYear(), 11, 31)),
      };
    }
    case 'custom': {
      if (filters.date_start && filters.date_end) {
        return { start: filters.date_start, end: filters.date_end };
      }
      return null;
    }
    default:
      return null;
  }
}

// ── Apply all advanced filters to a Supabase query ────────────────────────────
function applyFilters<T>(query: T, filters: AdvancedFilters): T {
  let q = query as any;

  if (filters.status?.length) {
    q = q.in('transaction_status', filters.status);
  }
  const range = getPeriodRange(filters);
  if (range) {
    q = q.gte('transaction_date', range.start).lte('transaction_date', range.end);
  }
  if (filters.category_id) {
    q = q.eq('transaction_category_id', filters.category_id);
  }
  if (filters.cost_center_id) {
    q = q.eq('transaction_cost_center_id', filters.cost_center_id);
  }
  if (filters.credit_card_id) {
    q = q.eq('transaction_card_id', filters.credit_card_id);
  }
  if (filters.account_id) {
    q = q.eq('transaction_bank_id', filters.account_id);
  }
  if (filters.amount_min) {
    const min = parseFloat(filters.amount_min);
    if (!isNaN(min)) q = q.gte('transaction_amount', min);
  }
  if (filters.amount_max) {
    const max = parseFloat(filters.amount_max);
    if (!isNaN(max)) q = q.lte('transaction_amount', max);
  }
  if (filters.no_category) {
    q = q.is('transaction_category_id', null);
  }
  if (filters.no_account) {
    q = q.is('transaction_bank_id', null);
  }
  if (filters.only_due_today) {
    const today = new Date().toISOString().split('T')[0];
    q = q.eq('transaction_date', today).in('transaction_status', ['pending', 'overdue']);
  }

  return q as T;
}

// ── Client-side type filter (fixa / parcelada / avulsa) ───────────────────────
function applyTypeFilter(items: any[], types: string[]): any[] {
  if (!types?.length) return items;
  return items.filter(item => {
    const isFixa = !!item.parent_recurrence_rule_id;
    const isParcelada = (item.transaction_description || '').match(/parcela\s+\d+\s*\/\s*\d+/i);
    const isAvulsa = !isFixa && !isParcelada;
    return (
      (types.includes('fixa') && isFixa) ||
      (types.includes('parcelada') && isParcelada) ||
      (types.includes('avulsa') && isAvulsa)
    );
  });
}

// ── Client-side only_last_installment filter ──────────────────────────────────
function applyLastInstallmentFilter(items: any[], enabled: boolean): any[] {
  if (!enabled) return items;
  return items.filter(item => {
    const m = (item.transaction_description || '').match(/parcela\s+(\d+)\s*\/\s*(\d+)/i);
    if (!m) return false;
    return Number(m[1]) === Number(m[2]);
  });
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

interface ReceitaSummary {
  totalPaid: number;          // recebido
  totalPending: number;       // a receber
  totalInstallments: number;  // total de valores de receitas parceladas
  monthlyAverage: number;     // média simples (12)
}

// Parser simples para textos "… - Parcela X/Y"
function parseInstallmentMeta(description?: string): { number: number; total: number } | null {
  if (!description) return null;
  // procura “Parcela 3/12” insensível a maiúsc./minúsc.
  const m = description.match(/parcela\s+(\d+)\s*\/\s*(\d+)/i);
  if (!m) return null;
  const n = Number(m[1]);
  const t = Number(m[2]);
  if (!Number.isFinite(n) || !Number.isFinite(t) || n < 1 || t < 1) return null;
  return { number: n, total: t };
}

export const receitaService = {
  async getReceitas(workspaceId: string, filters: AdvancedFilters) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw new Error('Authentication failed: ' + userError.message);
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
          transaction_card_id,
          transaction_cost_center_id,
          transaction_status,
          parent_recurrence_rule_id,
          recurrence_instance_date,
          recurrence_sequence,
          transaction_created_at,
          transaction_updated_at,
          categories:transaction_category_id ( category_id, category_name, color, icon ),
          credit_cards:transaction_card_id ( credit_card_id, credit_card_name, color, icon ),
          cost_centers:transaction_cost_center_id ( cost_center_id, cost_center_name, color, icon )
        `)
        .eq('transaction_workspace_id', workspaceId)
        .eq('transaction_type', 'income')
        .order('transaction_date', { ascending: false });

      query = applyFilters(query, filters);

      const { data, error } = await query;
      if (error) throw new Error('Failed to fetch receitas: ' + error.message);

      let rows = applyTypeFilter(data || [], filters.type);
      rows = applyLastInstallmentFilter(rows, filters.only_last_installment);

      return rows.map(item => {
        const parsed = parseInstallmentMeta(item.transaction_description || undefined);
        const isRecurring = !!item.parent_recurrence_rule_id;
        return {
          id: item.transaction_id,
          title: item.transaction_description,
          amount: item.transaction_amount,
          transaction_date: item.recurrence_instance_date || item.transaction_date,
          status: item.transaction_status || 'pending',
          repeat_type: isRecurring ? 'fixa' : 'avulsa',
          is_installment: !!parsed,
          installment_number: parsed?.number,
          installment_total: parsed?.total,
          category_id: item.transaction_category_id,
          category_name: item.categories?.category_name || null,
          category_color: item.categories?.color || null,
          category_icon: item.categories?.icon || null,
          card_id: item.transaction_card_id,
          card_name: item.credit_cards?.credit_card_name || null,
          card_color: item.credit_cards?.color || null,
          card_icon: item.credit_cards?.icon || null,
          cost_center_id: item.transaction_cost_center_id,
          cost_center_name: item.cost_centers?.cost_center_name || null,
          cost_center_color: item.cost_centers?.color || null,
          cost_center_icon: item.cost_centers?.icon || null,
          parent_recurrence_rule_id: item.parent_recurrence_rule_id,
          recurrence_instance_date: item.recurrence_instance_date,
          recurrence_sequence: item.recurrence_sequence,
          created_at: item.transaction_created_at,
          updated_at: item.transaction_updated_at
        };
      });
    } catch (error) {
      console.error('Error in getReceitas:', error);
      throw error;
    }
  },

  async getReceitasSummary(workspaceId: string, filters: AdvancedFilters): Promise<ReceitaSummary> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw new Error('Authentication failed: ' + userError.message);
      if (!user) throw new Error('User not authenticated');

      let baseQuery = supabase
        .from('transactions')
        .select('transaction_id, transaction_amount, transaction_status, transaction_description, transaction_date, parent_recurrence_rule_id')
        .eq('transaction_workspace_id', workspaceId)
        .eq('transaction_type', 'income');

      baseQuery = applyFilters(baseQuery, filters);

      const { data: incomes, error: baseErr } = await baseQuery;
      if (baseErr) throw new Error('Failed to fetch incomes summary: ' + baseErr.message);

      const allIncomes = incomes || [];
      const seenIds = new Set(allIncomes.map(e => e.transaction_id));

      let recurQuery = supabase
        .from('transactions')
        .select('transaction_id, transaction_amount, transaction_status, transaction_description, transaction_date, parent_recurrence_rule_id')
        .eq('transaction_workspace_id', workspaceId)
        .eq('transaction_type', 'income')
        .not('parent_recurrence_rule_id', 'is', null);

      if (filters.status?.length) {
        recurQuery = recurQuery.in('transaction_status', filters.status);
      }

      const { data: recurringRows, error: recurErr } = await recurQuery;
      if (recurErr) throw new Error('Failed to fetch recurring incomes: ' + recurErr.message);

      const recurringOnly = (recurringRows || []).filter(r => !seenIds.has(r.transaction_id));

      const sum = (arr: any[]) => arr.reduce((acc, e) => acc + Number(e.transaction_amount || 0), 0);

      const basePaid = sum(allIncomes.filter(e => e.transaction_status === 'received'));
      const basePending = sum(allIncomes.filter(e => e.transaction_status === 'pending'));

      const recurPaid = sum(recurringOnly.filter(e => e.transaction_status === 'received'));
      const recurPending = sum(recurringOnly.filter(e => e.transaction_status === 'pending'));

      const totalPaid = basePaid + recurPaid;
      const totalPending = basePending + recurPending;

      const totalInstallments = allIncomes
        .filter(e => parseInstallmentMeta(e.transaction_description || undefined))
        .reduce((acc, e) => acc + Number(e.transaction_amount), 0);

      const total = allIncomes.reduce((acc, e) => acc + Number(e.transaction_amount), 0);
      const monthlyAverage = allIncomes.length > 0 ? total / 12 : 0;

      return {
        totalPaid,
        totalPending,
        totalInstallments,
        monthlyAverage,
      };
    } catch (error) {
      console.error('Error in getReceitasSummary:', error);
      throw error;
    }
  },

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
        .eq('transaction_type', 'income')
        .gte('transaction_date', startOfMonth.toISOString().split('T')[0])
        .lte('transaction_date', endOfMonth.toISOString().split('T')[0])
        .ilike('transaction_description', '%parcela%');

      if (error) throw new Error('Failed to fetch installments: ' + error.message);

      return (data || []).map(item => {
        const parsed = parseInstallmentMeta(item.transaction_description || undefined);
        return {
          id: item.transaction_id,
          title: item.transaction_description,
          amount: item.transaction_amount,
          transaction_date: item.transaction_date,
          status: item.transaction_status || 'pending',
          installment_number: parsed?.number ?? 1,
          installment_total: parsed?.total ?? 1,
        };
      });
    } catch (error) {
      console.error('Error in getInstallmentsThisMonth:', error);
      throw error;
    }
  },

  async getFixedIncomesThisMonth(workspaceId: string) {
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
        .eq('transaction_type', 'income')
        .not('parent_recurrence_rule_id', 'is', null)
        .gte('recurrence_instance_date', startOfMonth.toISOString().split('T')[0])
        .lte('recurrence_instance_date', endOfMonth.toISOString().split('T')[0]);

      if (error) throw new Error('Failed to fetch fixed incomes: ' + error.message);

      return (data || []).map(item => ({
        id: item.transaction_id,
        title: item.transaction_description,
        amount: item.transaction_amount,
        transaction_date: item.recurrence_instance_date || item.transaction_date,
        status: item.transaction_status || 'pending',
        category: null,
      }));
    } catch (error) {
      console.error('Error in getFixedIncomesThisMonth:', error);
      throw error;
    }
  },

  async createReceita(workspaceId: string, receitaData: ReceitaData) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw new Error('Authentication failed: ' + userError.message);
      if (!user) throw new Error('User not authenticated');

      if (receitaData.is_installment && receitaData.installment_total && receitaData.installment_total > 1) {
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

        if (error) throw new Error('Failed to create installments: ' + error.message);
        return data;
      } else {
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

        if (error) throw new Error('Failed to create receita: ' + error.message);
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

      if (error) throw new Error('Failed to update receita: ' + error.message);
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

      if (error) throw new Error('Failed to delete receita: ' + error.message);
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

      if (error) throw new Error('Failed to mark receita as received: ' + error.message);
      return data;
    } catch (error) {
      console.error('Error in markAsReceived:', error);
      throw error;
    }
  },
};
