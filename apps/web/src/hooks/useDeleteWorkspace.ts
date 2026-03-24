import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useWorkspace } from '../context/WorkspaceContext';

export function useDeleteWorkspace() {
  const { deleteWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workspaceId: string) => deleteWorkspace(workspaceId),
    onSuccess: (_data, workspaceId) => {
      queryClient.removeQueries({ queryKey: ['teams', workspaceId] });
      queryClient.removeQueries({ queryKey: ['workspace-members', workspaceId] });
      queryClient.removeQueries({ queryKey: ['dashboard', workspaceId] });
      queryClient.removeQueries({ queryKey: ['transactions', workspaceId] });
    },
  });
}
