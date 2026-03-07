import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { statementsService } from '../services/statements.service';
import { useWorkspace } from '../context/WorkspaceContext';

export function useStatement(cardId?: string, period?: string) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['statement', currentWorkspace?.workspace_id, cardId, period],
    queryFn: () => statementsService.getStatement(currentWorkspace!.workspace_id, cardId!, period!),
    enabled: !!currentWorkspace?.workspace_id && !!cardId && !!period,
    staleTime: 30 * 1000,
  });
}

export function useStatementItems(cardId?: string, statementId?: string, filters?: any) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['statement-items', currentWorkspace?.workspace_id, cardId, statementId, filters],
    queryFn: () => statementsService.getStatementItems(currentWorkspace!.workspace_id, cardId!, statementId!, filters),
    enabled: !!currentWorkspace?.workspace_id && !!cardId && !!statementId,
    staleTime: 30 * 1000,
  });
}

export function useStatementMutations(cardId?: string) {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['statement'] });
    queryClient.invalidateQueries({ queryKey: ['statement-items'] });
    queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
  };

  const closeStatement = useMutation({
    mutationFn: (statementId: string) =>
      statementsService.closeStatement(currentWorkspace!.workspace_id, cardId!, statementId),
    onSuccess: invalidateAll,
  });

  const registerPayment = useMutation({
    mutationFn: ({ statementId, paymentData }: { statementId: string; paymentData: any }) =>
      statementsService.registerPayment(currentWorkspace!.workspace_id, cardId!, statementId, paymentData),
    onSuccess: invalidateAll,
  });

  const moveItemToNextCycle = useMutation({
    mutationFn: (itemId: string) =>
      statementsService.moveItemToNextCycle(currentWorkspace!.workspace_id, cardId!, itemId),
    onSuccess: invalidateAll,
  });

  return {
    closeStatement,
    registerPayment,
    moveItemToNextCycle,
  };
}
