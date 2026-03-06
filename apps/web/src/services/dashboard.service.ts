import { apiClient } from '../lib/apiClient';
import type { Transaction, MonthlyData } from '../types';

interface DashboardFilters {
  period: string;
  category: string;
  search: string;
  startDate?: string;
  endDate?: string;
}

interface PaidSummary {
  currentBalance: number;
  totalIncome: number;
  totalExpenses: number;
  totalDebts: number;
}

interface Summary {
  balancePaid: number;
  income: { paid: number; unpaid: number };
  expenses: { paid: number; unpaid: number };
  invested: { paid: number; unpaid: number };
}

interface DashboardData {
  paidSummary: PaidSummary;
  summary: Summary;
  monthlyBreakdown: Record<string, { income: number; expense: number; debtIn: number; debtOut: number }>;
  monthlyComparison: MonthlyData[];
  recentTransactions: Transaction[];
}

export const dashboardService = {
  async getDashboardData(workspaceId: string, filters?: DashboardFilters): Promise<DashboardData> {
    if (!workspaceId) throw new Error('Workspace ID is required');

    const params = new URLSearchParams();
    if (filters?.period) params.set('period', filters.period);
    if (filters?.search) params.set('search', filters.search);
    if (filters?.startDate) params.set('startDate', filters.startDate);
    if (filters?.endDate) params.set('endDate', filters.endDate);
    const qs = params.toString() ? `?${params}` : '';

    return apiClient!.get<DashboardData>(`/workspaces/${workspaceId}/dashboard${qs}`);
  },
};
