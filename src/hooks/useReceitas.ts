import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { receitaService } from '../services/receita.service';
import type { ReceitaData } from '../services/receita.service';
import { useWorkspace } from '../context/WorkspaceContext';

interface ReceitaFilters {
  status: string;
  type: string;
  installments: string;
  period: string;
  category: string;
  search: string;
}

export function useReceitas(filters: ReceitaFilters) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['receitas', currentWorkspace?.workspace_id, filters],
    queryFn: () => receitaService.getReceitas(currentWorkspace!.workspace_id, filters),
    enabled: !!currentWorkspace?.workspace_id,
    staleTime: 30 * 1000,
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error.message?.includes('Authentication failed') || error.message?.includes('User not authenticated')) {
        return false;
      }
      // Retry network errors up to 3 times
      if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        return failureCount < 3;
      }
      return failureCount < 1;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
  });

  const createReceita = useMutation({
    mutationFn: (data: ReceitaData) => receitaService.createReceita(currentWorkspace!.workspace_id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receitas', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats', currentWorkspace?.workspace_id] });
    },
  });

  const updateReceita = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<ReceitaData> }) =>
      receitaService.updateReceita(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receitas', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats', currentWorkspace?.workspace_id] });
    },
  });

  const deleteReceita = useMutation({
    mutationFn: (id: string) => receitaService.deleteReceita(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receitas', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats', currentWorkspace?.workspace_id] });
    },
  });

  const markAsReceived = useMutation({
    mutationFn: (id: string) => receitaService.markAsReceived(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receitas', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats', currentWorkspace?.workspace_id] });
      // Force refetch of receitas data
      queryClient.refetchQueries({ queryKey: ['receitas', currentWorkspace?.workspace_id] });
    },
  });

  return {
    ...query,
    createReceita,
    updateReceita,
    deleteReceita,
    markAsReceived,
  };
}