import React, { useState } from 'react';
import { Bell, CheckCheck, CreditCard, RefreshCw, TrendingDown, AlertCircle, ArrowRight, Check, X, Filter } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead, useDismissNotification } from '../hooks/useNotifications';
import type { Notification, NotificationType, NotificationFilters } from '@myfinance/shared';

const TYPE_LABELS: Record<NotificationType, string> = {
  invoice_closing: 'Fatura fechada',
  invoice_due: 'Fatura vencendo',
  transaction_status_changed: 'Status alterado',
  recurrence_processed: 'Recorrência processada',
  recurrence_paused: 'Recorrência pausada',
  recurrence_canceled: 'Recorrência cancelada',
  account_low_balance: 'Saldo baixo',
  budget_exceeded: 'Orçamento excedido',
  custom: 'Personalizada',
};

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'invoice_closing':
    case 'invoice_due':
      return <CreditCard size={18} className="text-blue-500" />;
    case 'recurrence_processed':
      return <RefreshCw size={18} className="text-green-500" />;
    case 'recurrence_paused':
      return <RefreshCw size={18} className="text-yellow-500" />;
    case 'recurrence_canceled':
      return <RefreshCw size={18} className="text-red-500" />;
    case 'transaction_status_changed':
      return <TrendingDown size={18} className="text-purple-500" />;
    case 'account_low_balance':
      return <TrendingDown size={18} className="text-red-500" />;
    case 'budget_exceeded':
      return <AlertCircle size={18} className="text-orange-500" />;
    default:
      return <Bell size={18} className="text-gray-500" />;
  }
}

function NotificationRow({
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
        'flex gap-4 p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors',
        !notification.is_read && 'bg-blue-50/30'
      )}
    >
      <div className="flex-shrink-0 mt-0.5">
        {getNotificationIcon(notification.type)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('text-sm text-gray-900', !notification.is_read && 'font-semibold')}>
            {notification.title}
          </p>
          <span className="text-xs text-gray-400 flex-shrink-0 mt-0.5">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ptBR })}
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-0.5">{notification.message}</p>
        <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
          {TYPE_LABELS[notification.type]}
        </span>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {!notification.is_read && (
          <button
            onClick={() => onMarkRead(notification.id)}
            className="p-1.5 rounded-lg hover:bg-green-100 text-gray-400 hover:text-green-600 transition-colors"
            title="Marcar como lida"
          >
            <Check size={14} />
          </button>
        )}
        {notification.entity_id && (
          <button
            onClick={handleNavigate}
            className="p-1.5 rounded-lg hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-colors"
            title="Ver detalhes"
          >
            <ArrowRight size={14} />
          </button>
        )}
        <button
          onClick={() => onDismiss(notification.id)}
          className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors"
          title="Dispensar"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

const TABS = [
  { key: 'all', label: 'Todas' },
  { key: 'unread', label: 'Não lidas' },
] as const;

type Tab = (typeof TABS)[number]['key'];

export function Notifications() {
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [typeFilter, setTypeFilter] = useState<NotificationType | ''>('');
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  const filters: NotificationFilters = {
    unread_only: activeTab === 'unread',
    ...(typeFilter ? { type: typeFilter as NotificationType } : {}),
  };

  const { data, isLoading } = useNotifications(filters, page, LIMIT);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const dismiss = useDismissNotification();

  const notifications = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setPage(1);
  };

  const handleTypeFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTypeFilter(e.target.value as NotificationType | '');
    setPage(1);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6 text-gray-700" />
          <h1 className="text-xl font-semibold text-gray-900">Notificações</h1>
          {total > 0 && (
            <span className="text-sm text-gray-500">({total})</span>
          )}
        </div>
        {notifications.some((n) => !n.is_read) && (
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 transition-colors"
          >
            <CheckCheck size={16} />
            Marcar todas como lidas
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        {/* Tabs */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={cn(
                'px-4 py-1.5 text-sm transition-colors',
                activeTab === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-1.5 ml-auto">
          <Filter size={14} className="text-gray-400" />
          <select
            value={typeFilter}
            onChange={handleTypeFilter}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os tipos</option>
            {Object.entries(TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-gray-100">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4 p-4 animate-pulse">
                <div className="w-5 h-5 rounded-full bg-gray-200 flex-shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Bell size={40} className="text-gray-200 mb-3" />
            <p className="text-gray-500 font-medium">Nenhuma notificação</p>
            <p className="text-sm text-gray-400 mt-1">
              {activeTab === 'unread' ? 'Você está em dia!' : 'As notificações aparecerão aqui.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((n) => (
              <NotificationRow
                key={n.id}
                notification={n}
                onMarkRead={(id) => markRead.mutate(id)}
                onDismiss={(id) => dismiss.mutate(id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            Página {page} de {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
