import { useQuery } from '@tanstack/react-query';
import { workspaceService } from '../services/workspace.service';
import { useWorkspace } from '../context/WorkspaceContext';

export function useWorkspaceMembers() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.workspace_id;

  return useQuery({
    queryKey: ['workspace-members', wid],
    queryFn: () => workspaceService.getMembers(wid!),
    enabled: !!wid,
    staleTime: 5 * 60 * 1000,
  });
}
