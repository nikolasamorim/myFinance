import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { advancedTransactionService } from '../services/advancedTransaction.service';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';
import type { AdvancedTransactionData } from '../types';

export function useAdvancedTransactions() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const createAdvancedTransaction = useMutation({
    mutationFn: ({ transactionType, data }: { transactionType: string; data: AdvancedTransactionData }) =>
      advancedTransactionService.createAdvancedTransaction(currentWorkspace!.workspace_id, transactionType, data, user!.id),
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['transactions', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['receitas', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['receitas-summary', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['receitas-installments', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['receitas-fixed', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['despesas', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['despesas-summary', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['despesas-installments', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['despesas-fixed', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['installment-groups', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['recurrence-rules', currentWorkspace?.workspace_id] });
    },
  });

  const getInstallmentGroup = (groupId: string) => useQuery({
    queryKey: ['installment-group', groupId],
    queryFn: () => advancedTransactionService.getInstallmentGroup(groupId),
    enabled: !!groupId,
    staleTime: 30 * 1000,
  });

  const getRecurrenceRule = (ruleId: string) => useQuery({
    queryKey: ['recurrence-rule', ruleId],
    queryFn: () => advancedTransactionService.getRecurrenceRule(ruleId),
    enabled: !!ruleId,
    staleTime: 30 * 1000,
  });

  const updateInstallmentGroup = useMutation({
    mutationFn: ({ groupId, updates }: { groupId: string; updates: any }) =>
      advancedTransactionService.updateInstallmentGroup(groupId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installment-groups', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['transactions', currentWorkspace?.workspace_id] });
    },
  });

  const updateRecurrenceRule = useMutation({
    mutationFn: ({ ruleId, updates }: { ruleId: string; updates: any }) =>
      advancedTransactionService.updateRecurrenceRule(ruleId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurrence-rules', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['transactions', currentWorkspace?.workspace_id] });
    },
  });

  const markInstallmentAsPaid = useMutation({
    mutationFn: (transactionId: string) =>
      advancedTransactionService.markInstallmentAsPaid(transactionId, currentWorkspace!.workspace_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data', currentWorkspace?.workspace_id] });
    },
  });

  const pauseRecurrenceRule = useMutation({
    mutationFn: (ruleId: string) =>
      advancedTransactionService.pauseRecurrenceRule(ruleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurrence-rules', currentWorkspace?.workspace_id] });
    },
  });

  const resumeRecurrenceRule = useMutation({
    mutationFn: (ruleId: string) =>
      advancedTransactionService.resumeRecurrenceRule(ruleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurrence-rules', currentWorkspace?.workspace_id] });
    },
  });

  const cancelRecurrenceRule = useMutation({
    mutationFn: (ruleId: string) =>
      advancedTransactionService.cancelRecurrenceRule(ruleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurrence-rules', currentWorkspace?.workspace_id] });
    },
  });

  return {
    createAdvancedTransaction,
    getInstallmentGroup,
    getRecurrenceRule,
    updateInstallmentGroup,
    updateRecurrenceRule,
    markInstallmentAsPaid,
    pauseRecurrenceRule,
    resumeRecurrenceRule,
    cancelRecurrenceRule,
  };
}