import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { installmentService } from '../services/installment.service';
import type { InstallmentGroupData } from '../services/installment.service';
import { advancedTransactionService } from '../services/advancedTransaction.service';
import { useWorkspace } from '../context/WorkspaceContext';

export function useInstallmentGroups() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['installment-groups', currentWorkspace?.workspace_id],
    queryFn: () => installmentService.getInstallmentGroups(currentWorkspace!.workspace_id),
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

  const createInstallmentGroup = useMutation({
    mutationFn: (data: InstallmentGroupData) => installmentService.createInstallmentGroup(currentWorkspace!.workspace_id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installment-groups', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['transactions', currentWorkspace?.workspace_id] });
    },
  });

  const updateInstallmentGroup = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<InstallmentGroupData> }) =>
      installmentService.updateInstallmentGroup(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installment-groups', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['transactions', currentWorkspace?.workspace_id] });
    },
  });

  const deleteInstallmentGroup = useMutation({
    mutationFn: (id: string) => installmentService.deleteInstallmentGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installment-groups', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['transactions', currentWorkspace?.workspace_id] });
    },
  });

  return {
    ...query,
    createInstallmentGroup,
    updateInstallmentGroup,
    deleteInstallmentGroup,
  };
}

export function useInstallmentsByGroup(groupId: string) {
  return useQuery({
    queryKey: ['installments-by-group', groupId],
    queryFn: () => installmentService.getInstallmentsByGroup(groupId),
    enabled: !!groupId,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useInstallmentGroup(groupId?: string | null) {
  return useQuery({
    queryKey: ['installment-group', groupId],
    queryFn: () => advancedTransactionService.getInstallmentGroup(groupId!),
    enabled: !!groupId,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}