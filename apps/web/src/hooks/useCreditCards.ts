import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { creditCardService } from '../services/creditCard.service';
import type { CreditCardData } from '../services/creditCard.service';
import { useWorkspace } from '../context/WorkspaceContext';

interface CreditCardFilters {
  search: string;
}

export function useCreditCards(filters: CreditCardFilters) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['credit-cards', currentWorkspace?.workspace_id, filters],
    queryFn: () => creditCardService.getCreditCards(currentWorkspace!.workspace_id, filters),
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

  const createCreditCard = useMutation({
    mutationFn: (data: CreditCardData) => creditCardService.createCreditCard(currentWorkspace!.workspace_id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-cards', currentWorkspace?.workspace_id] });
    },
  });

  const updateCreditCard = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CreditCardData> }) =>
      creditCardService.updateCreditCard(id, updates, currentWorkspace!.workspace_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-cards', currentWorkspace?.workspace_id] });
    },
  });

  const deleteCreditCard = useMutation({
    mutationFn: (id: string) => creditCardService.deleteCreditCard(id, currentWorkspace!.workspace_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-cards', currentWorkspace?.workspace_id] });
    },
  });

  return {
    ...query,
    createCreditCard,
    updateCreditCard,
    deleteCreditCard,
  };
}
