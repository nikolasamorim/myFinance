import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { receitaService } from '../services/receita.service';
import type { ReceitaData } from '../services/receita.service';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';
import type { AdvancedFilters } from '../types/filters';

export function useReceitas(filters: AdvancedFilters) {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['receitas', currentWorkspace?.workspace_id, filters],
    queryFn: () => receitaService.getReceitas(currentWorkspace!.workspace_id, filters),
    enabled: !!currentWorkspace?.workspace_id,
    staleTime: 30 * 1000,
    retry: (failureCount, error: any) => {
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

  // === NOVO: summary (espelha despesas) ===
  const summaryQuery = useQuery({
    queryKey: ['receitas-summary', currentWorkspace?.workspace_id, filters],
    queryFn: () => receitaService.getReceitasSummary(currentWorkspace!.workspace_id, filters),
    enabled: !!currentWorkspace?.workspace_id,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });

  // === NOVO: receitas parceladas do mês ===
  const installmentsQuery = useQuery({
    queryKey: ['receitas-installments', currentWorkspace?.workspace_id],
    queryFn: () => receitaService.getInstallmentsThisMonth(currentWorkspace!.workspace_id),
    enabled: !!currentWorkspace?.workspace_id,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });

  // === NOVO: receitas fixas do mês ===
  const fixedIncomesQuery = useQuery({
    queryKey: ['receitas-fixed', currentWorkspace?.workspace_id],
    queryFn: () => receitaService.getFixedIncomesThisMonth(currentWorkspace!.workspace_id),
    enabled: !!currentWorkspace?.workspace_id,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['receitas', currentWorkspace?.workspace_id] });
    queryClient.invalidateQueries({ queryKey: ['receitas-summary', currentWorkspace?.workspace_id] });
    queryClient.invalidateQueries({ queryKey: ['receitas-installments', currentWorkspace?.workspace_id] });
    queryClient.invalidateQueries({ queryKey: ['receitas-fixed', currentWorkspace?.workspace_id] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats', currentWorkspace?.workspace_id] });
  };

  const createReceita = useMutation({
    mutationFn: (data: ReceitaData) => receitaService.createReceita(currentWorkspace!.workspace_id, data, user!.id),
    onSuccess: () => {
      invalidateAll();
    },
  });

  const updateReceita = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<ReceitaData> }) =>
      receitaService.updateReceita(id, updates, currentWorkspace!.workspace_id),
    onSuccess: () => {
      invalidateAll();
    },
  });

  const deleteReceita = useMutation({
    mutationFn: (id: string) => receitaService.deleteReceita(id, currentWorkspace!.workspace_id),
    onSuccess: () => {
      invalidateAll();
    },
  });

  const markAsReceived = useMutation({
    mutationFn: (id: string) => receitaService.markAsReceived(id, currentWorkspace!.workspace_id),
    onSuccess: () => {
      invalidateAll();
      // opcional: força refetch imediato da lista
      queryClient.refetchQueries({ queryKey: ['receitas', currentWorkspace?.workspace_id] });
    },
  });

  return {
    ...query,
    summary: summaryQuery.data,
    installmentsThisMonth: installmentsQuery.data,
    fixedIncomesThisMonth: fixedIncomesQuery.data,
    createReceita,
    updateReceita,
    deleteReceita,
    markAsReceived,
  };
}
