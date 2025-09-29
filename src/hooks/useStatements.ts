import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { statementsService } from '../services/statements.service';
import { useWorkspace } from '../context/WorkspaceContext';

export function useStatement(cardId?: string, period?: string) {
  const { currentWorkspace } = useWorkspace();
  
  return useQuery({
    queryKey: ['statement', currentWorkspace?.workspace_id, cardId, period],
    queryFn: async () => {
      if (!cardId || !period) return null;
      
      const periodStart = `${period}-01`;
      const window = await statementsService.computeStatementWindow(cardId, periodStart);
      const statementId = await statementsService.ensureOpenStatement(cardId, window.period_start);
      const statement = await statementsService.getStatement(currentWorkspace!.workspace_id, cardId, window.period_start);
      
      return { ...statement, window };
    },
    enabled: !!currentWorkspace?.workspace_id && !!cardId && !!period,
    staleTime: 30 * 1000,
  });
}

export function useStatementItems(statementId?: string, filters?: any) {
  return useQuery({
    queryKey: ['statement-items', statementId, filters],
    queryFn: () => statementsService.getStatementItems(statementId!, filters),
    enabled: !!statementId,
    staleTime: 30 * 1000,
  });
}

export function useStatementMutations() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  const closeStatement = useMutation({
    mutationFn: statementsService.closeStatement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statement', currentWorkspace?.workspace_id] });
    },
  });

  const registerPayment = useMutation({
    mutationFn: ({ statementId, paymentData }: { statementId: string; paymentData: any }) =>
      statementsService.registerStatementPayment(statementId, paymentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statement', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['statement-items'] });
    },
  });

  const moveItemToNextCycle = useMutation({
    mutationFn: statementsService.moveItemToNextCycle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statement-items'] });
    },
  });

  return {
    closeStatement,
    registerPayment,
    moveItemToNextCycle,
  };
}