import { apiClient } from '../lib/apiClient';
import {
  Notification,
  NotificationPreference,
  NotificationSubscription,
  NotificationFilters,
  NotificationType,
  NotificationEntityType,
  Paginated,
} from '@myfinance/shared';

export const notificationService = {
  async getNotifications(
    workspaceId: string,
    filters?: NotificationFilters,
    page = 1,
    limit = 20
  ): Promise<Paginated<Notification>> {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (filters?.unread_only) params.set('unread_only', 'true');
    if (filters?.type) params.set('type', filters.type);
    if (filters?.entity_type) params.set('entity_type', filters.entity_type);
    return apiClient!.get<Paginated<Notification>>(
      `/workspaces/${workspaceId}/notifications?${params}`
    );
  },

  async getUnreadCount(workspaceId: string): Promise<{ count: number }> {
    return apiClient!.get<{ count: number }>(
      `/workspaces/${workspaceId}/notifications/count/unread`
    );
  },

  async markAsRead(workspaceId: string, notificationId: string): Promise<Notification> {
    return apiClient!.patch<Notification>(
      `/workspaces/${workspaceId}/notifications/${notificationId}/read`,
      {}
    );
  },

  async markAllAsRead(workspaceId: string): Promise<{ success: boolean }> {
    return apiClient!.patch<{ success: boolean }>(
      `/workspaces/${workspaceId}/notifications/read-all`,
      {}
    );
  },

  async dismiss(workspaceId: string, notificationId: string): Promise<void> {
    await apiClient!.delete(`/workspaces/${workspaceId}/notifications/${notificationId}`);
  },

  async getPreferences(workspaceId: string): Promise<NotificationPreference[]> {
    return apiClient!.get<NotificationPreference[]>(
      `/workspaces/${workspaceId}/notification-preferences`
    );
  },

  async updatePreferences(
    workspaceId: string,
    prefs: Array<{ notification_type: NotificationType; enabled: boolean; advance_days?: number | null }>
  ): Promise<NotificationPreference[]> {
    return apiClient!.put<NotificationPreference[]>(
      `/workspaces/${workspaceId}/notification-preferences`,
      prefs
    );
  },

  async getSubscriptions(
    workspaceId: string,
    entityType?: NotificationEntityType
  ): Promise<NotificationSubscription[]> {
    const params = entityType ? `?entity_type=${entityType}` : '';
    return apiClient!.get<NotificationSubscription[]>(
      `/workspaces/${workspaceId}/notification-preferences/subscriptions${params}`
    );
  },

  async createSubscription(
    workspaceId: string,
    sub: { entity_type: NotificationEntityType; entity_id: string; notification_types: NotificationType[] }
  ): Promise<NotificationSubscription> {
    return apiClient!.post<NotificationSubscription>(
      `/workspaces/${workspaceId}/notification-preferences/subscriptions`,
      sub
    );
  },

  async deleteSubscription(workspaceId: string, subscriptionId: string): Promise<void> {
    await apiClient!.delete(
      `/workspaces/${workspaceId}/notification-preferences/subscriptions/${subscriptionId}`
    );
  },
};
