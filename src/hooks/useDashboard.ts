import { useQuery } from '@tanstack/react-query';
import { transactionService } from '../services/transaction.service';
import { useWorkspace } from '../context/WorkspaceContext';

export function useDashboardStats() {
  const { currentWorkspace } = useWorkspace();
  
  return useQuery({
    queryKey: ['dashboard-stats', currentWorkspace?.workspace_id],
    queryFn: () => transactionService.getDashboardStats(currentWorkspace!.workspace_id),
    enabled: !!currentWorkspace?.workspace_id,
    staleTime: 1 * 60 * 1000, // 1 minute
    retry: 1,
    refetchOnWindowFocus: false,
  });
}