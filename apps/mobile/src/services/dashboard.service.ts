import { apiClient } from '../lib/apiClient';

export interface DashboardData {
  paidSummary: {
    currentBalance: number;
    totalIncome: number;
    totalExpenses: number;
    totalDebts: number;
  };
  summary: {
    balancePaid: number;
    income: { paid: number; unpaid: number };
    expenses: { paid: number; unpaid: number };
    invested: { paid: number; unpaid: number };
  };
  monthlyComparison: Array<{ month: string; income: number; expenses: number }>;
  recentTransactions: any[];
}

export const dashboardService = {
  async getDashboardData(workspaceId: string, period = 'current_month'): Promise<DashboardData> {
    return apiClient.get<DashboardData>(`/workspaces/${workspaceId}/dashboard?period=${period}`);
  },
};
