import { useNavigate } from 'react-router-dom';
import { Bell, CreditCard, RefreshCw, TrendingDown, TrendingUp, AlertCircle, ArrowRight, Check, X, Settings, Maximize2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../../lib/utils';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDismissNotification,
} from '../../hooks/useNotifications';
import type { Notification, NotificationType } from '@myfinance/shared';

interface NotificationPanelProps {
  onClose: () => void;
}

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'invoice_closing':
    case 'invoice_due':
      return <CreditCard size={16} className="text-blue-500" />;
    case 'recurrence_processed':
      return <RefreshCw size={16} className="text-green-500" />;
    case 'recurrence_paused':
      return <RefreshCw size={16} className="text-yellow-500" />;
    case 'recurrence_canceled':
      return <RefreshCw size={16} className="text-red-500" />;
    case 'transaction_status_changed':
      return <TrendingDown size={16} className="text-purple-500" />;
    case 'account_low_balance':
      return <TrendingDown size={16} className="text-red-500" />;
    case 'budget_exceeded':
      return <AlertCircle size={16} className="text-orange-500" />;
    default:
      return <Bell size={16} className="text-text-muted" />;
  }
}

function NotificationItem({
  notification,
  onMarkRead,
  onDismiss,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const navigate = useNavigate();

  const handleNavigate = () => {
    if (!notification.entity_type || !notification.entity_id) return;
    const routes: Record<string, string> = {
      credit_card: '/credit-cards',
      recurrence_rule: '/recurrences',
      transaction: '/transactions',
      account: '/accounts',
      category: '/categories',
    };
    const route = routes[notification.entity_type];
    if (route) navigate(route);
  };

  return (
    <div
      className={cn(
        'flex gap-3 p-3 hover:bg-bg-elevated transition-colors',
        !notification.is_read && 'bg-accent/5'
      )}
    >
      <div className="flex-shrink-0 mt-0.5">
        {getNotificationIcon(notification.type)}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-xs font-medium text-text-primary leading-tight', !notification.is_read && 'font-semibold')}>
          {notification.title}
        </p>
        <p className="text-xs text-text-muted mt-0.5 leading-tight line-clamp-2">
          {notification.message}
        </p>
        <p className="text-xs text-text-muted/70 mt-1">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ptBR })}
        </p>
      </div>
      <div className="flex flex-col gap-1 flex-shrink-0">
        {!notification.is_read && (
          <button
            onClick={() => onMarkRead(notification.id)}
            className="p-1 rounded hover:bg-bg-elevated text-text-muted hover:text-green-600 transition-colors"
            title="Marcar como lida"
          >
            <Check size={12} />
          </button>
        )}
        {notification.entity_id && (
          <button
            onClick={handleNavigate}
            className="p-1 rounded hover:bg-bg-elevated text-text-muted hover:text-accent transition-colors"
            title="Ver detalhes"
          >
            <ArrowRight size={12} />
          </button>
        )}
        <button
          onClick={() => onDismiss(notification.id)}
          className="p-1 rounded hover:bg-bg-elevated text-text-muted hover:text-red-600 transition-colors"
          title="Dispensar"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3 p-3 animate-pulse">
          <div className="w-4 h-4 rounded-full bg-bg-elevated flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-bg-elevated rounded w-3/4" />
            <div className="h-3 bg-bg-elevated rounded w-full" />
            <div className="h-2 bg-bg-elevated rounded w-1/3" />
          </div>
        </div>
      ))}
    </>
  );
}

export function NotificationPanel({ onClose }: NotificationPanelProps) {
  const navigate = useNavigate();
  const { data, isLoading } = useNotifications(undefined, 1, 10);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const dismiss = useDismissNotification();

  const notifications = data?.data ?? [];
  const hasUnread = notifications.some((n) => !n.is_read);

  const handleMarkRead = (id: string) => markRead.mutate(id);
  const handleDismiss = (id: string) => dismiss.mutate(id);
  const handleMarkAllRead = () => markAllRead.mutate();

  const handleViewAll = () => {
    navigate('/notifications');
    onClose();
  };

  const handleSettings = () => {
    navigate('/settings/notifications');
    onClose();
  };

  return (
    <div className="flex flex-col w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <h3 className="text-sm font-semibold text-text-primary">Notificações</h3>
        {hasUnread && (
          <button
            onClick={handleMarkAllRead}
            disabled={markAllRead.isPending}
            className="text-xs text-accent hover:text-accent-hover disabled:opacity-50 transition-colors"
          >
            Marcar todas como lidas
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto divide-y divide-border">
        {isLoading ? (
          <LoadingSkeleton />
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-3 text-center">
            <Bell size={24} className="text-text-muted mb-2" />
            <p className="text-sm text-text-muted">Nenhuma notificação no momento</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkRead={handleMarkRead}
              onDismiss={handleDismiss}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border flex">
        <button
          onClick={handleSettings}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition-colors border-r border-border"
        >
          <Settings size={12} />
          Configurações
        </button>
        <button
          onClick={handleViewAll}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition-colors"
        >
          <Maximize2 size={12} />
          Ver todas
        </button>
      </div>
    </div>
  );
}
