import { useQuery } from '@tanstack/react-query';
import { bankingService } from '../services/banking.service';
import { useWorkspace } from '../context/WorkspaceContext';

export function useBankingConnections() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.workspace_id;

  return useQuery({
    queryKey: ['banking-connections', wid],
    queryFn: () => bankingService.getConnections(wid!),
    enabled: !!wid,
    staleTime: 2 * 60 * 1000,
    select: (res) => res.data,
  });
}
