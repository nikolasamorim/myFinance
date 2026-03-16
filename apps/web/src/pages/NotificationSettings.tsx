import React, { useState, useEffect } from 'react';
import { Bell, CreditCard, RefreshCw, TrendingDown, AlertCircle, Save, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  useNotificationSubscriptions,
  useDeleteNotificationSubscription,
} from '../hooks/useNotificationPreferences';
import type { NotificationType, NotificationPreference } from '@myfinance/shared';

const NOTIFICATION_TYPES: Array<{
  type: NotificationType;
  label: string;
  description: string;
  icon: React.ReactNode;
  hasAdvanceDays: boolean;
}> = [
  {
    type: 'invoice_closing',
    label: 'Fatura fechada',
    description: 'Notifica quando uma fatura de cartão é fechada.',
    icon: <CreditCard size={18} className="text-blue-500" />,
    hasAdvanceDays: true,
  },
  {
    type: 'invoice_due',
    label: 'Fatura vencendo',
    description: 'Notifica com antecedência quando uma fatura está vencendo.',
    icon: <CreditCard size={18} className="text-orange-500" />,
    hasAdvanceDays: true,
  },
  {
    type: 'recurrence_processed',
    label: 'Recorrência processada',
    description: 'Notifica quando uma regra de recorrência é retomada ou processa lançamentos.',
    icon: <RefreshCw size={18} className="text-green-500" />,
    hasAdvanceDays: false,
  },
  {
    type: 'recurrence_paused',
    label: 'Recorrência pausada',
    description: 'Notifica quando uma regra de recorrência é pausada.',
    icon: <RefreshCw size={18} className="text-yellow-500" />,
    hasAdvanceDays: false,
  },
  {
    type: 'recurrence_canceled',
    label: 'Recorrência cancelada',
    description: 'Notifica quando uma regra de recorrência é cancelada.',
    icon: <RefreshCw size={18} className="text-red-500" />,
    hasAdvanceDays: false,
  },
  {
    type: 'transaction_status_changed',
    label: 'Status de lançamento',
    description: 'Notifica quando o status de um lançamento é alterado.',
    icon: <TrendingDown size={18} className="text-purple-500" />,
    hasAdvanceDays: false,
  },
  {
    type: 'account_low_balance',
    label: 'Saldo baixo',
    description: 'Notifica quando o saldo de uma conta fica baixo.',
    icon: <TrendingDown size={18} className="text-red-500" />,
    hasAdvanceDays: false,
  },
  {
    type: 'budget_exceeded',
    label: 'Orçamento excedido',
    description: 'Notifica quando o orçamento de uma categoria é excedido.',
    icon: <AlertCircle size={18} className="text-orange-500" />,
    hasAdvanceDays: false,
  },
];

const ENTITY_TYPE_LABELS: Record<string, string> = {
  transaction: 'Lançamento',
  account: 'Conta',
  category: 'Categoria',
  credit_card: 'Cartão de crédito',
  recurrence_rule: 'Regra de recorrência',
};

type PrefsState = Record<NotificationType, { enabled: boolean; advance_days: number }>;

function buildInitialState(savedPrefs: NotificationPreference[]): PrefsState {
  const defaults = Object.fromEntries(
    NOTIFICATION_TYPES.map(({ type }) => [type, { enabled: true, advance_days: 3 }])
  ) as PrefsState;

  savedPrefs.forEach((p) => {
    defaults[p.notification_type] = {
      enabled: p.enabled,
      advance_days: p.advance_days ?? 3,
    };
  });

  return defaults;
}

export function NotificationSettings() {
  const { data: savedPrefs = [], isLoading } = useNotificationPreferences();
  const { data: subscriptions = [], isLoading: subsLoading } = useNotificationSubscriptions();
  const updatePrefs = useUpdateNotificationPreferences();
  const deleteSubscription = useDeleteNotificationSubscription();

  const [prefs, setPrefs] = useState<PrefsState>(() => buildInitialState([]));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (savedPrefs.length > 0) {
      setPrefs(buildInitialState(savedPrefs));
    }
  }, [savedPrefs]);

  const handleToggle = (type: NotificationType) => {
    setPrefs((prev) => ({
      ...prev,
      [type]: { ...prev[type], enabled: !prev[type].enabled },
    }));
    setSaved(false);
  };

  const handleAdvanceDays = (type: NotificationType, value: string) => {
    const days = Math.max(1, Math.min(30, parseInt(value, 10) || 1));
    setPrefs((prev) => ({
      ...prev,
      [type]: { ...prev[type], advance_days: days },
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    const payload = NOTIFICATION_TYPES.map(({ type, hasAdvanceDays }) => ({
      notification_type: type,
      enabled: prefs[type].enabled,
      advance_days: hasAdvanceDays ? prefs[type].advance_days : null,
    }));
    await updatePrefs.mutateAsync(payload);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Bell className="w-6 h-6 text-text-secondary" />
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Configurações de Notificações</h1>
          <p className="text-sm text-text-muted mt-0.5">Escolha quais notificações você deseja receber.</p>
        </div>
      </div>

      {/* Global preferences */}
      <div className="bg-bg-page rounded-xl border border-border overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-border bg-bg-surface">
          <h2 className="text-sm font-semibold text-text-secondary">Notificações globais</h2>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-5 h-5 rounded bg-bg-elevated" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 bg-bg-elevated rounded w-1/3" />
                  <div className="h-3 bg-bg-elevated rounded w-2/3" />
                </div>
                <div className="w-10 h-5 rounded-full bg-bg-elevated" />
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {NOTIFICATION_TYPES.map(({ type, label, description, icon, hasAdvanceDays }) => (
              <div key={type} className="flex items-start gap-3 px-4 py-3">
                <div className="flex-shrink-0 mt-0.5">{icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary">{label}</p>
                  <p className="text-xs text-text-muted mt-0.5">{description}</p>
                  {hasAdvanceDays && prefs[type].enabled && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-text-secondary">Notificar com</span>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={prefs[type].advance_days}
                        onChange={(e) => handleAdvanceDays(type, e.target.value)}
                        className="w-14 text-xs border border-border rounded px-2 py-1 text-center focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                      <span className="text-xs text-text-secondary">dias de antecedência</span>
                    </div>
                  )}
                </div>
                <button
                  role="switch"
                  aria-checked={prefs[type].enabled}
                  onClick={() => handleToggle(type)}
                  className={cn(
                    'relative flex-shrink-0 w-10 h-5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1',
                    prefs[type].enabled ? 'bg-accent' : 'bg-bg-elevated'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                      prefs[type].enabled && 'translate-x-5'
                    )}
                  />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Entity subscriptions */}
      <div className="bg-bg-page rounded-xl border border-border overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-border bg-bg-surface">
          <h2 className="text-sm font-semibold text-text-secondary">Inscrições por entidade</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Notificações configuradas para lançamentos, contas, cartões ou recorrências específicos.
          </p>
        </div>

        {subsLoading ? (
          <div className="p-4 animate-pulse space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-10 bg-bg-elevated rounded" />
            ))}
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-text-muted">Nenhuma inscrição configurada.</p>
            <p className="text-xs text-text-muted mt-1">
              Você pode se inscrever para receber notificações de entidades específicas diretamente nas páginas de lançamentos, contas e cartões.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {subscriptions.map((sub) => (
              <div key={sub.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary">
                    {ENTITY_TYPE_LABELS[sub.entity_type] ?? sub.entity_type}
                  </p>
                  <p className="text-xs text-text-muted truncate">
                    ID: {sub.entity_id}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {sub.notification_types.map((t) => (
                      <span key={t} className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => deleteSubscription.mutate(sub.id)}
                  className="p-1.5 rounded-lg hover:bg-red-100 text-text-muted hover:text-red-500 transition-colors flex-shrink-0"
                  title="Remover inscrição"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={updatePrefs.isPending}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            saved
              ? 'bg-green-600 text-white'
              : 'bg-accent text-white hover:bg-accent-hover disabled:opacity-50'
          )}
        >
          <Save size={14} />
          {updatePrefs.isPending ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar preferências'}
        </button>
      </div>
    </div>
  );
}
