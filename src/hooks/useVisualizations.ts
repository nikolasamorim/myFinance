import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { visualizationService } from '../services/visualization.service';
import { useWorkspace } from '../context/WorkspaceContext';
import type { Visualization } from '../types';

export function useVisualizations(screenContext: string) {
  const { currentWorkspace } = useWorkspace();
  
  return useQuery({
    queryKey: ['visualizations', currentWorkspace?.workspace_id, screenContext],
    queryFn: () => visualizationService.getUserVisualizations(currentWorkspace!.workspace_id, screenContext),
    enabled: !!currentWorkspace?.workspace_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

export function useDefaultVisualization(screenContext: string) {
  const { currentWorkspace } = useWorkspace();
  
  return useQuery({
    queryKey: ['default-visualization', currentWorkspace?.workspace_id, screenContext],
    queryFn: () => visualizationService.getDefaultVisualization(currentWorkspace!.workspace_id, screenContext),
    enabled: !!currentWorkspace?.workspace_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

export function useCreateVisualization() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: (visualization: Omit<Visualization, 'visualization_id' | 'visualization_created_at' | 'visualization_updated_at'>) =>
      visualizationService.createVisualization(visualization),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['visualizations', currentWorkspace?.workspace_id, variables.visualization_screen_context] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['default-visualization', currentWorkspace?.workspace_id, variables.visualization_screen_context] 
      });
    },
  });
}

export function useUpdateVisualization() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Visualization> }) =>
      visualizationService.updateVisualization(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visualizations', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['default-visualization', currentWorkspace?.workspace_id] });
    },
  });
}

export function useSetDefaultVisualization() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: ({ screenContext, visualizationId }: { screenContext: string; visualizationId: string }) =>
      visualizationService.setDefaultVisualization(currentWorkspace!.workspace_id, screenContext, visualizationId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['visualizations', currentWorkspace?.workspace_id, variables.screenContext] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['default-visualization', currentWorkspace?.workspace_id, variables.screenContext] 
      });
    },
  });
}

export function useDeleteVisualization() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: (id: string) => visualizationService.deleteVisualization(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visualizations', currentWorkspace?.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['default-visualization', currentWorkspace?.workspace_id] });
    },
  });
}