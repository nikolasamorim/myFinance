import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workspaceService } from '../services/workspace.service';
import { useWorkspace } from '../context/WorkspaceContext';

export function useTeams() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.workspace_id;

  return useQuery({
    queryKey: ['teams', wid],
    queryFn: () => workspaceService.getTeams(wid!),
    enabled: !!wid,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateTeam() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const wid = currentWorkspace?.workspace_id;

  return useMutation({
    mutationFn: (name: string) => workspaceService.createTeam(wid!, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams', wid] });
    },
  });
}

export function useDeleteTeam() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const wid = currentWorkspace?.workspace_id;

  return useMutation({
    mutationFn: (teamId: string) => workspaceService.deleteTeam(wid!, teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams', wid] });
    },
  });
}
