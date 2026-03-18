import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recurrenceService } from '../services/recurrence.service';
import type { RecurrenceRuleData } from '../services/recurrence.service';
import { useWorkspace } from '../context/WorkspaceContext';
import type { Transaction } from '../types';

export function useRecurrenceRules() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['recurrence-rules', currentWorkspace?.workspace_id],
    queryFn: () => recurrenceService.getRecurrenceRules(currentWorkspace!.workspace_id),
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

  const createRecurrenceRule = useMutation({
    mutationFn: (data: RecurrenceRuleData) => recurrenceService.createRecurrenceRule(currentWorkspace!.workspace_id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurrence-rules', currentWorkspace?.workspace_id] });
    },
  });

  const updateRecurrenceRule = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<RecurrenceRuleData> }) =>
      recurrenceService.updateRecurrenceRule(id, updates, currentWorkspace!.workspace_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurrence-rules', currentWorkspace?.workspace_id] });
    },
  });

  const deleteRecurrenceRule = useMutation({
    mutationFn: (id: string) => recurrenceService.deleteRecurrenceRule(id, currentWorkspace!.workspace_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurrence-rules', currentWorkspace?.workspace_id] });
    },
  });

  const pauseRecurrenceRule = useMutation({
    mutationFn: (id: string) => recurrenceService.pauseRecurrenceRule(id, currentWorkspace!.workspace_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurrence-rules', currentWorkspace?.workspace_id] });
    },
  });

  const resumeRecurrenceRule = useMutation({
    mutationFn: (id: string) => recurrenceService.resumeRecurrenceRule(id, currentWorkspace!.workspace_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurrence-rules', currentWorkspace?.workspace_id] });
    },
  });

  const cancelRecurrenceRule = useMutation({
    mutationFn: (id: string) => recurrenceService.cancelRecurrenceRule(id, currentWorkspace!.workspace_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurrence-rules', currentWorkspace?.workspace_id] });
    },
  });

  return {
    ...query,
    createRecurrenceRule,
    updateRecurrenceRule,
    deleteRecurrenceRule,
    pauseRecurrenceRule,
    resumeRecurrenceRule,
    cancelRecurrenceRule,
  };
}

export function useRecurrenceRule(ruleId?: string | null) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['recurrence-rule', ruleId],
    queryFn: () => recurrenceService.getRecurrenceRuleById(currentWorkspace!.workspace_id, ruleId!),
    enabled: !!ruleId && !!currentWorkspace,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const update = useMutation({
    mutationFn: (updates: Partial<RecurrenceRuleData>) =>
      recurrenceService.updateRecurrenceRule(ruleId!, updates, currentWorkspace!.workspace_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurrence-rule', ruleId] });
      queryClient.invalidateQueries({ queryKey: ['transactions-by-rule', ruleId] });
      queryClient.invalidateQueries({ queryKey: ['recurrence-rules', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['transactions', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats', currentWorkspace?.workspace_id] });
    },
  });

  const pause = useMutation({
    mutationFn: () => recurrenceService.pauseRecurrenceRule(ruleId!, currentWorkspace!.workspace_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurrence-rule', ruleId] });
      queryClient.invalidateQueries({ queryKey: ['recurrence-rules', currentWorkspace?.workspace_id] });
    },
  });

  const resume = useMutation({
    mutationFn: () => recurrenceService.resumeRecurrenceRule(ruleId!, currentWorkspace!.workspace_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurrence-rule', ruleId] });
      queryClient.invalidateQueries({ queryKey: ['transactions-by-rule', ruleId] });
      queryClient.invalidateQueries({ queryKey: ['recurrence-rules', currentWorkspace?.workspace_id] });
    },
  });

  const cancel = useMutation({
    mutationFn: () => recurrenceService.cancelRecurrenceRule(ruleId!, currentWorkspace!.workspace_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurrence-rule', ruleId] });
      queryClient.invalidateQueries({ queryKey: ['transactions-by-rule', ruleId] });
      queryClient.invalidateQueries({ queryKey: ['recurrence-rules', currentWorkspace?.workspace_id] });
    },
  });

  return { query, update, pause, resume, cancel };
}

export function useTransactionsByRecurrenceRule(ruleId?: string | null) {
  const { currentWorkspace } = useWorkspace();
  return useQuery<Transaction[]>({
    queryKey: ['transactions-by-rule', ruleId],
    queryFn: () => recurrenceService.getTransactionsByRule(currentWorkspace!.workspace_id, ruleId!),
    enabled: !!ruleId && !!currentWorkspace,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });
}
