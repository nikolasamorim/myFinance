import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '../services/transaction.service';
import { useWorkspace } from '../context/WorkspaceContext';
import type { Transaction } from '../types';

export function useTransactions(page = 1, limit = 10, search?: string) {
  const { currentWorkspace } = useWorkspace();
  
  return useQuery({
    queryKey: ['transactions', currentWorkspace?.workspace_id, page, limit, search],
    queryFn: () => transactionService.getTransactions(currentWorkspace!.workspace_id, page, limit, search),
    enabled: !!currentWorkspace?.workspace_id,
    staleTime: 30 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: (transaction: Omit<Transaction, 'transaction_id' | 'transaction_created_at' | 'transaction_updated_at'>) =>
      transactionService.createTransaction(transaction),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['receitas', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['despesas', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['receitas-summary', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['despesas-summary', currentWorkspace?.workspace_id] });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Transaction> }) =>
      transactionService.updateTransaction(id, updates, currentWorkspace!.workspace_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['receitas', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['despesas', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['receitas-summary', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['despesas-summary', currentWorkspace?.workspace_id] });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: (id: string) => transactionService.deleteTransaction(id, currentWorkspace!.workspace_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['receitas', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['despesas', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['receitas-summary', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['despesas-summary', currentWorkspace?.workspace_id] });
    },
  });
}
