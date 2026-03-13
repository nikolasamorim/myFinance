import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../services/notification.service';
import { useWorkspace } from '../context/WorkspaceContext';
import type { NotificationFilters } from '@myfinance/shared';

export function useNotifications(filters?: NotificationFilters, page = 1, limit = 20) {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.workspace_id;

  return useQuery({
    queryKey: ['notifications', wid, filters, page, limit],
    queryFn: () => notificationService.getNotifications(wid!, filters, page, limit),
    enabled: !!wid,
    staleTime: 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useUnreadNotificationCount() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.workspace_id;

  return useQuery({
    queryKey: ['notifications-unread-count', wid],
    queryFn: () => notificationService.getUnreadCount(wid!),
    enabled: !!wid,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
    select: (data) => data.count,
  });
}

export function useMarkNotificationRead() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const wid = currentWorkspace?.workspace_id;

  return useMutation({
    mutationFn: (notificationId: string) =>
      notificationService.markAsRead(wid!, notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', wid] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', wid] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const wid = currentWorkspace?.workspace_id;

  return useMutation({
    mutationFn: () => notificationService.markAllAsRead(wid!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', wid] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', wid] });
    },
  });
}

export function useDismissNotification() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const wid = currentWorkspace?.workspace_id;

  return useMutation({
    mutationFn: (notificationId: string) =>
      notificationService.dismiss(wid!, notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', wid] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', wid] });
    },
  });
}
