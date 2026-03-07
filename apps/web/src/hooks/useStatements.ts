import { useQuery, useMutation, useQueryClient, useQueries } from '@tanstack/react-query';
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

export function useStatementsForPeriods(cardIds: string[], periods: string[]) {
  const { currentWorkspace } = useWorkspace();
  const queries = [];
  for (const cardId of cardIds) {
    for (const period of periods) {
      queries.push({
        queryKey: ['statement', currentWorkspace?.workspace_id, cardId, period],
        queryFn: () => statementsService.getStatement(currentWorkspace!.workspace_id, cardId, period),
        enabled: !!currentWorkspace?.workspace_id && !!cardId && !!period,
        staleTime: 5 * 60 * 1000,
      });
    }
  }
  return useQueries({ queries });
}

export function useMultipleStatements(cardIds: string[], period: string) {
  const { currentWorkspace } = useWorkspace();
  return useQueries({
    queries: cardIds.map(cardId => ({
      queryKey: ['statement', currentWorkspace?.workspace_id, cardId, period],
      queryFn: () => statementsService.getStatement(currentWorkspace!.workspace_id, cardId, period),
      enabled: !!currentWorkspace?.workspace_id && !!cardId && !!period,
      staleTime: 30 * 1000,
    })),
  });
}

export function useMultipleStatementItems(
  statementInfos: Array<{ cardId: string; statementId: string; color?: string | null }>,
  filters: { type: string; search: string }
) {
  const { currentWorkspace } = useWorkspace();
  return useQueries({
    queries: statementInfos.map(info => ({
      queryKey: ['statement-items', currentWorkspace?.workspace_id, info.cardId, info.statementId, filters],
      queryFn: async () => {
        const items = await statementsService.getStatementItems(
          currentWorkspace!.workspace_id, info.cardId, info.statementId, filters
        );
        return (items as any[]).map((item: any) => ({ ...item, _cardColor: info.color, _cardId: info.cardId }));
      },
      enabled: !!currentWorkspace?.workspace_id && !!info.cardId && !!info.statementId,
      staleTime: 30 * 1000,
    })),
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
