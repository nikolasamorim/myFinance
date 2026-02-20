import { useInfiniteQuery } from '@tanstack/react-query';
import { activityLogService } from '../services/activityLog.service';
import { useWorkspace } from '../context/WorkspaceContext';

interface ActivityLogFilters {
  action: string;
  entity_type: string;
  date_from: string;
  date_to: string;
  search: string;
}

export function useActivityLogs(filters: ActivityLogFilters, page: number = 1, limit: number = 20) {
  const { currentWorkspace } = useWorkspace();

  return useInfiniteQuery({
    queryKey: ['activity-logs', currentWorkspace?.workspace_id, filters],
    queryFn: ({ pageParam = 1 }) => 
      activityLogService.getActivityLogs(currentWorkspace!.workspace_id, filters, pageParam, limit),
    enabled: !!currentWorkspace?.workspace_id,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.data.length < limit) return undefined;
      return allPages.length + 1;
    },
    staleTime: 30 * 1000,
    retry: (failureCount, error) => {
      if (error.message?.includes('Authentication failed') || error.message?.includes('User not authenticated')) {
        return false;
      }
      if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        return failureCount < 3;
      }
      return failureCount < 1;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
  });
}