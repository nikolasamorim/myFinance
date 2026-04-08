import { apiClient } from '../lib/apiClient';
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

// ── Build query params from AdvancedFilters ──────────────────────────────────
function buildFilterParams(filters: AdvancedFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.status?.length) {
    params.set('status', filters.status.join(','));
  }
  const range = getPeriodRange(filters);
  if (range) {
    params.set('startDate', range.start);
    params.set('endDate', range.end);
  }
  if (filters.category_id) params.set('category_id', filters.category_id);
  if (filters.cost_center_id) params.set('cost_center_id', filters.cost_center_id);
  if (filters.credit_card_id) params.set('credit_card_id', filters.credit_card_id);
  if (filters.account_id) params.set('account_id', filters.account_id);
  if (filters.amount_min) params.set('amount_min', filters.amount_min);
  if (filters.amount_max) params.set('amount_max', filters.amount_max);
  if (filters.no_category) params.set('no_category', 'true');
  if (filters.no_account) params.set('no_account', 'true');
  if (filters.only_due_today) {
    const today = new Date().toISOString().split('T')[0];
    params.set('startDate', today);
    params.set('endDate', today);
    params.set('status', 'pending,overdue');
  }

  return params;
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
  async getDespesas(workspaceId: string, filters: AdvancedFilters) {
    try {
      const params = buildFilterParams(filters);
      params.set('type', 'expense');
      params.set('noPagination', 'true');
      params.set('sort', 'transaction_date');
      params.set('order', 'desc');
      params.set('select_fields', 'transaction_id,transaction_workspace_id,transaction_type,transaction_description,transaction_amount,transaction_date,transaction_category_id,transaction_card_id,transaction_cost_center_id,transaction_status,parent_recurrence_rule_id,recurrence_instance_date,recurrence_sequence,transaction_created_at,transaction_updated_at,categories:transaction_category_id(category_id,category_name,color,icon),credit_cards:transaction_card_id(credit_card_id,credit_card_name,color,icon),cost_centers:transaction_cost_center_id(cost_center_id,cost_center_name,color,icon)');

      const result = await apiClient!.get<{ data: any[] }>(`/workspaces/${workspaceId}/transactions?${params}`);

      let rows = applyTypeFilter(result.data || [], filters.type);
      rows = applyLastInstallmentFilter(rows, filters.only_last_installment);

      return rows.map(item => {
        const isRecurring = !!item.parent_recurrence_rule_id;
        const isInstallment = (item.transaction_description || '').includes('/');
        return {
          id: item.transaction_id,
          title: item.transaction_description,
          amount: item.transaction_amount,
          transaction_date: item.recurrence_instance_date || item.transaction_date,
          status: item.transaction_status || 'pending',
          repeat_type: isRecurring ? 'fixa' : 'avulsa',
          is_installment: isInstallment,
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
      console.error('Error in getDespesas:', error);
      throw error;
    }
  },

  async getDespesasSummary(workspaceId: string, filters: AdvancedFilters): Promise<DespesaSummary> {
    try {
      // 1) Main query WITH the same filters as the listing
      const params = buildFilterParams(filters);
      params.set('type', 'expense');
      params.set('noPagination', 'true');
      params.set('select_fields', 'transaction_id,transaction_amount,transaction_status,transaction_description,transaction_date,parent_recurrence_rule_id');

      const result = await apiClient!.get<{ data: any[] }>(`/workspaces/${workspaceId}/transactions?${params}`);
      const allExpenses = result.data || [];
      const seenIds = new Set(allExpenses.map(e => e.transaction_id));

      // 2) Extra query for recurring expenses WITHOUT period filter
      const recurParams = new URLSearchParams();
      recurParams.set('type', 'expense');
      recurParams.set('noPagination', 'true');
      recurParams.set('has_recurrence', 'true');
      recurParams.set('select_fields', 'transaction_id,transaction_amount,transaction_status,transaction_description,transaction_date');
      if (filters.status?.length) {
        recurParams.set('status', filters.status.join(','));
      }

      const recurResult = await apiClient!.get<{ data: any[] }>(`/workspaces/${workspaceId}/transactions?${recurParams}`);
      const recurringOnly = (recurResult.data || []).filter(r => !seenIds.has(r.transaction_id));

      // ===== Calculations =====
      const sum = (arr: any[]) => arr.reduce((acc, e) => acc + Number(e.transaction_amount || 0), 0);

      const basePaid = sum(allExpenses.filter(e => e.transaction_status === 'paid'));
      const basePending = sum(allExpenses.filter(e => e.transaction_status === 'pending'));

      const recurPaid = sum(recurringOnly.filter(e => e.transaction_status === 'paid'));
      const recurPending = sum(recurringOnly.filter(e => e.transaction_status === 'pending'));

      const totalPaid = basePaid + recurPaid;
      const totalPending = basePending + recurPending;

      const totalInstallments = allExpenses
        .filter(e => (e.transaction_description || '').includes('/'))
        .reduce((acc: number, e: any) => acc + Number(e.transaction_amount), 0);

      const total = allExpenses.reduce((acc: number, e: any) => acc + Number(e.transaction_amount), 0);
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
  },

  async getInstallmentsThisMonth(workspaceId: string) {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      const params = new URLSearchParams({
        type: 'expense',
        startDate: startOfMonth,
        endDate: endOfMonth,
        description_like: '/',
        noPagination: 'true',
      });

      const result = await apiClient!.get<{ data: any[] }>(`/workspaces/${workspaceId}/transactions?${params}`);

      return (result.data || []).map(item => ({
        id: item.transaction_id,
        title: item.transaction_description,
        amount: item.transaction_amount,
        transaction_date: item.recurrence_instance_date || item.transaction_date,
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
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      const params = new URLSearchParams({
        type: 'expense',
        has_recurrence: 'true',
        recurrence_date_start: startOfMonth,
        recurrence_date_end: endOfMonth,
        noPagination: 'true',
      });

      const result = await apiClient!.get<{ data: any[] }>(`/workspaces/${workspaceId}/transactions?${params}`);

      return (result.data || []).map(item => ({
        id: item.transaction_id,
        title: item.transaction_description,
        amount: item.transaction_amount,
        transaction_date: item.recurrence_instance_date || item.transaction_date,
        status: item.transaction_status || 'pending',
        category: null,
      }));
    } catch (error) {
      console.error('Error in getFixedExpensesThisMonth:', error);
      throw error;
    }
  },

  async createDespesa(workspaceId: string, despesaData: DespesaData, userId: string) {
    try {
      if (despesaData.is_installment && despesaData.installment_total && despesaData.installment_total > 1) {
        const installments = [];

        for (let i = 1; i <= despesaData.installment_total; i++) {
          const installmentDate = new Date(despesaData.transaction_date);
          installmentDate.setMonth(installmentDate.getMonth() + (i - 1));

          installments.push({
            transaction_created_by_user_id: userId,
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

        return apiClient!.post<any[]>(`/workspaces/${workspaceId}/transactions`, installments);
      } else {
        return apiClient!.post<any>(`/workspaces/${workspaceId}/transactions`, {
          transaction_created_by_user_id: userId,
          transaction_type: 'expense',
          transaction_description: despesaData.title,
          transaction_amount: despesaData.amount,
          transaction_date: despesaData.transaction_date,
          transaction_category_id: despesaData.category_id || null,
          transaction_cost_center_id: despesaData.cost_center_id || null,
          transaction_bank_id: despesaData.bank_id || null,
          transaction_status: despesaData.status || 'pending',
        });
      }
    } catch (error) {
      console.error('Error in createDespesa:', error);
      throw error;
    }
  },

  async updateDespesa(id: string, updates: Partial<DespesaData>, workspaceId: string) {
    try {
      const updateData: any = {};

      if (updates.title !== undefined) updateData.transaction_description = updates.title;
      if (updates.amount !== undefined) updateData.transaction_amount = updates.amount;
      if (updates.transaction_date !== undefined) updateData.transaction_date = updates.transaction_date;
      if (updates.category_id !== undefined) updateData.transaction_category_id = updates.category_id;
      if (updates.cost_center_id !== undefined) updateData.transaction_cost_center_id = updates.cost_center_id;
      if (updates.bank_id !== undefined) updateData.transaction_bank_id = updates.bank_id;
      if (updates.status !== undefined) updateData.transaction_status = updates.status;

      return apiClient!.put<any>(`/workspaces/${workspaceId}/transactions/${id}`, updateData);
    } catch (error) {
      console.error('Error in updateDespesa:', error);
      throw error;
    }
  },

  async deleteDespesa(id: string, workspaceId: string) {
    try {
      await apiClient!.delete(`/workspaces/${workspaceId}/transactions/${id}`);
    } catch (error) {
      console.error('Error in deleteDespesa:', error);
      throw error;
    }
  },

  async markAsPaid(id: string, workspaceId: string) {
    try {
      return apiClient!.put<any>(`/workspaces/${workspaceId}/transactions/${id}`, { transaction_status: 'paid' });
    } catch (error) {
      console.error('Error in markAsPaid:', error);
      throw error;
    }
  },
};
