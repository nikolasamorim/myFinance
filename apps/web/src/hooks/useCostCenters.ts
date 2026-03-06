import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { costCenterService } from '../services/costCenter.service';
import type { CostCenterData } from '../services/costCenter.service';
import { useWorkspace } from '../context/WorkspaceContext';

interface CostCenterFilters {
  status: string;
  search: string;
}

export function useCostCenters(filters: CostCenterFilters) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['cost-centers', currentWorkspace?.workspace_id, filters],
    queryFn: () => costCenterService.getCostCenters(currentWorkspace!.workspace_id, filters),
    enabled: !!currentWorkspace?.workspace_id,
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

  const createCostCenter = useMutation({
    mutationFn: (data: CostCenterData) => costCenterService.createCostCenter(currentWorkspace!.workspace_id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-centers', currentWorkspace?.workspace_id] });
    },
  });

  const updateCostCenter = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CostCenterData> }) =>
      costCenterService.updateCostCenter(id, updates, currentWorkspace!.workspace_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-centers', currentWorkspace?.workspace_id] });
    },
  });

  const deleteCostCenter = useMutation({
    mutationFn: (id: string) => costCenterService.deleteCostCenter(id, currentWorkspace!.workspace_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-centers', currentWorkspace?.workspace_id] });
    },
  });

  return {
    ...query,
    createCostCenter,
    updateCostCenter,
    deleteCostCenter,
    updateCostCenterOrder: useMutation({
      mutationFn: (updates: Array<{ id: string; parent_id: string | null; sort_order: number }>) =>
        costCenterService.updateCostCenterOrder(currentWorkspace!.workspace_id, updates),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['cost-centers', currentWorkspace?.workspace_id] });
      },
    }),
  };
}
