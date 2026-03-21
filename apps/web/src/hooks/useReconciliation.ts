import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reconciliationService } from '../services/reconciliation.service';
import { useWorkspace } from '../context/WorkspaceContext';
import type { ReconciliationFilters, ReconcilePayload, ReconciliationTab } from '@myfinance/shared';

function statusFromTab(tab: ReconciliationTab): 'pending' | 'reconciled' | 'ignored' {
  if (tab === 'conciliados') return 'reconciled';
  if (tab === 'ignorados') return 'ignored';
  return 'pending';
}

export function useImportedTransactions(filters: ReconciliationFilters, tab: ReconciliationTab) {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.workspace_id;
  const status = statusFromTab(tab);

  return useQuery({
    queryKey: ['reconciliation-imported', wid, filters, status],
    queryFn: () => reconciliationService.getImported(wid!, { ...filters, status }),
    enabled: !!wid,
    staleTime: 15 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useReconciledTransactions(filters: ReconciliationFilters) {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.workspace_id;

  return useQuery({
    queryKey: ['reconciliation-conciliados', wid, filters],
    queryFn: () => reconciliationService.getReconciled(wid!, filters),
    enabled: !!wid,
    staleTime: 15 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useSuggestions(importedId: string | null) {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.workspace_id;

  return useQuery({
    queryKey: ['reconciliation-suggestions', wid, importedId],
    queryFn: () => reconciliationService.getSuggestions(wid!, importedId!),
    enabled: !!wid && !!importedId,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useCandidates(
  params: ReconciliationFilters & { search?: string; page?: number; limit?: number },
  enabled = true
) {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.workspace_id;

  return useQuery({
    queryKey: ['reconciliation-candidates', wid, params],
    queryFn: () => reconciliationService.searchCandidates(wid!, params),
    enabled: !!wid && enabled,
    staleTime: 15 * 1000,
    refetchOnWindowFocus: false,
  });
}

function useInvalidateAll() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const wid = currentWorkspace?.workspace_id;
  return () => {
    queryClient.invalidateQueries({ queryKey: ['reconciliation-imported', wid] });
    queryClient.invalidateQueries({ queryKey: ['reconciliation-conciliados', wid] });
    queryClient.invalidateQueries({ queryKey: ['reconciliation-candidates', wid] });
    queryClient.invalidateQueries({ queryKey: ['reconciliation-suggestions', wid] });
    queryClient.invalidateQueries({ queryKey: ['reconciliation-summary', wid] });
  };
}

export function useReconciliationSummary() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.workspace_id;

  return useQuery({
    queryKey: ['reconciliation-summary', wid],
    queryFn: () => reconciliationService.getSummary(wid!),
    enabled: !!wid,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useReconcile() {
  const { currentWorkspace } = useWorkspace();
  const invalidateAll = useInvalidateAll();

  return useMutation({
    mutationFn: (payload: ReconcilePayload) =>
      reconciliationService.reconcile(currentWorkspace!.workspace_id, payload),
    onSuccess: invalidateAll,
  });
}

export function useDereconcile() {
  const { currentWorkspace } = useWorkspace();
  const invalidateAll = useInvalidateAll();

  return useMutation({
    mutationFn: (reconciliationId: string) =>
      reconciliationService.dereconcile(currentWorkspace!.workspace_id, reconciliationId),
    onSuccess: invalidateAll,
  });
}

export function useIgnore() {
  const { currentWorkspace } = useWorkspace();
  const invalidateAll = useInvalidateAll();

  return useMutation({
    mutationFn: (importedId: string) =>
      reconciliationService.ignore(currentWorkspace!.workspace_id, importedId),
    onSuccess: invalidateAll,
  });
}

export function useUnignore() {
  const { currentWorkspace } = useWorkspace();
  const invalidateAll = useInvalidateAll();

  return useMutation({
    mutationFn: (importedId: string) =>
      reconciliationService.unignore(currentWorkspace!.workspace_id, importedId),
    onSuccess: invalidateAll,
  });
}
