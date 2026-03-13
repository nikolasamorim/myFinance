import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../services/notification.service';
import { useWorkspace } from '../context/WorkspaceContext';
import type { NotificationType, NotificationEntityType } from '@myfinance/shared';

export function useNotificationPreferences() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.workspace_id;

  return useQuery({
    queryKey: ['notification-preferences', wid],
    queryFn: () => notificationService.getPreferences(wid!),
    enabled: !!wid,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useUpdateNotificationPreferences() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const wid = currentWorkspace?.workspace_id;

  return useMutation({
    mutationFn: (
      prefs: Array<{ notification_type: NotificationType; enabled: boolean; advance_days?: number | null }>
    ) => notificationService.updatePreferences(wid!, prefs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences', wid] });
    },
  });
}

export function useNotificationSubscriptions(entityType?: NotificationEntityType) {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.workspace_id;

  return useQuery({
    queryKey: ['notification-subscriptions', wid, entityType],
    queryFn: () => notificationService.getSubscriptions(wid!, entityType),
    enabled: !!wid,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useCreateNotificationSubscription() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const wid = currentWorkspace?.workspace_id;

  return useMutation({
    mutationFn: (sub: {
      entity_type: NotificationEntityType;
      entity_id: string;
      notification_types: NotificationType[];
    }) => notificationService.createSubscription(wid!, sub),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-subscriptions', wid] });
    },
  });
}

export function useDeleteNotificationSubscription() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const wid = currentWorkspace?.workspace_id;

  return useMutation({
    mutationFn: (subscriptionId: string) =>
      notificationService.deleteSubscription(wid!, subscriptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-subscriptions', wid] });
    },
  });
}
