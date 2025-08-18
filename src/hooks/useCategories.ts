import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoryService } from '../services/category.service';
import type { CategoryData } from '../services/category.service';
import { useWorkspace } from '../context/WorkspaceContext';

interface CategoryFilters {
  type: string;
  search: string;
}

export function useCategories(filters: CategoryFilters) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['categories', currentWorkspace?.workspace_id, filters],
    queryFn: () => categoryService.getCategories(currentWorkspace!.workspace_id, filters),
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

  const createCategory = useMutation({
    mutationFn: (data: CategoryData) => categoryService.createCategory(currentWorkspace!.workspace_id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', currentWorkspace?.workspace_id] });
    },
  });

  const updateCategory = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CategoryData> }) =>
      categoryService.updateCategory(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', currentWorkspace?.workspace_id] });
    },
  });

  const deleteCategory = useMutation({
    mutationFn: (id: string) => categoryService.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', currentWorkspace?.workspace_id] });
    },
  });

  return {
    ...query,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}