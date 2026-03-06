import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountService } from '../services/account.service';
import type { AccountData } from '../services/account.service';
import { useWorkspace } from '../context/WorkspaceContext';

interface AccountFilters {
  type: string;
  search: string;
}

export function useAccounts(filters: AccountFilters) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['accounts', currentWorkspace?.workspace_id, filters],
    queryFn: () => accountService.getAccounts(currentWorkspace!.workspace_id, filters),
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

  const createAccount = useMutation({
    mutationFn: (data: AccountData) => accountService.createAccount(currentWorkspace!.workspace_id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts', currentWorkspace?.workspace_id] });
    },
  });

  const updateAccount = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<AccountData> }) =>
      accountService.updateAccount(id, updates, currentWorkspace!.workspace_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts', currentWorkspace?.workspace_id] });
    },
  });

  const deleteAccount = useMutation({
    mutationFn: (id: string) => accountService.deleteAccount(id, currentWorkspace!.workspace_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts', currentWorkspace?.workspace_id] });
    },
  });

  return {
    ...query,
    createAccount,
    updateAccount,
    deleteAccount,
  };
}
