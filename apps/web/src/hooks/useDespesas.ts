import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { despesaService } from '../services/despesa.service';
import type { DespesaData } from '../services/despesa.service';
import { useWorkspace } from '../context/WorkspaceContext';
import type { AdvancedFilters } from '../types/filters';

export function useDespesas(filters: AdvancedFilters) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['despesas', currentWorkspace?.workspace_id, filters],
    queryFn: () => despesaService.getDespesas(currentWorkspace!.workspace_id, filters),
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

  const summaryQuery = useQuery({
    queryKey: ['despesas-summary', currentWorkspace?.workspace_id, filters],
    queryFn: () => despesaService.getDespesasSummary(currentWorkspace!.workspace_id, filters),
    enabled: !!currentWorkspace?.workspace_id,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });

  const installmentsQuery = useQuery({
    queryKey: ['despesas-installments', currentWorkspace?.workspace_id],
    queryFn: () => despesaService.getInstallmentsThisMonth(currentWorkspace!.workspace_id),
    enabled: !!currentWorkspace?.workspace_id,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });

  const fixedExpensesQuery = useQuery({
    queryKey: ['despesas-fixed', currentWorkspace?.workspace_id],
    queryFn: () => despesaService.getFixedExpensesThisMonth(currentWorkspace!.workspace_id),
    enabled: !!currentWorkspace?.workspace_id,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });

  const createDespesa = useMutation({
    mutationFn: (data: DespesaData) => despesaService.createDespesa(currentWorkspace!.workspace_id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['despesas', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['despesas-summary', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['despesas-installments', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['despesas-fixed', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats', currentWorkspace?.workspace_id] });
    },
  });

  const updateDespesa = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<DespesaData> }) =>
      despesaService.updateDespesa(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['despesas', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['despesas-summary', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['despesas-installments', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['despesas-fixed', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats', currentWorkspace?.workspace_id] });
    },
  });

  const deleteDespesa = useMutation({
    mutationFn: (id: string) => despesaService.deleteDespesa(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['despesas', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['despesas-summary', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['despesas-installments', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['despesas-fixed', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats', currentWorkspace?.workspace_id] });
    },
  });

  const markAsPaid = useMutation({
    mutationFn: (id: string) => despesaService.markAsPaid(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['despesas', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['despesas-summary', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['despesas-installments', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['despesas-fixed', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats', currentWorkspace?.workspace_id] });
      // Force refetch of despesas data
      queryClient.refetchQueries({ queryKey: ['despesas', currentWorkspace?.workspace_id] });
    },
  });

  return {
    ...query,
    summary: summaryQuery.data,
    installmentsThisMonth: installmentsQuery.data,
    fixedExpensesThisMonth: fixedExpensesQuery.data,
    createDespesa,
    updateDespesa,
    deleteDespesa,
    markAsPaid,
  };
}