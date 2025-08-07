import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboard.service';

interface DashboardFilters {
  period: string;
  category: string;
  search: string;
}

export function useDashboardData(workspaceId?: string, filters?: DashboardFilters) {
  return useQuery({
    queryKey: ['dashboard-data', workspaceId, filters],
    queryFn: () => dashboardService.getDashboardData(workspaceId!, filters),
    enabled: !!workspaceId,
    staleTime: 1 * 60 * 1000, // 1 minute
    retry: 1,
    refetchOnWindowFocus: false,
  });
}