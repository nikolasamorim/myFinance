import { SupabaseClient } from '@supabase/supabase-js';
import { NotificationType, NotificationEntityType } from '@myfinance/shared';

interface CreateNotificationPayload {
    supabase: SupabaseClient;
    userId: string;
    workspaceId: string;
    type: NotificationType;
    title: string;
    message: string;
    entityType?: NotificationEntityType;
    entityId?: string;
    data?: Record<string, unknown>;
    scheduledFor?: string;
}

/**
 * Core notification creator. Checks user preference before inserting.
 * Errors are swallowed — notification failures must never block the main action.
 */
export async function createNotificationIfEnabled(
    payload: CreateNotificationPayload
): Promise<void> {
    const { supabase, userId, workspaceId, type, title, message, entityType, entityId, data, scheduledFor } = payload;

    try {
        const { data: enabled, error: prefError } = await supabase.rpc(
            'is_notification_enabled',
            { p_user_id: userId, p_workspace_id: workspaceId, p_type: type }
        );

        if (prefError) {
            console.warn('[notificationService] Error checking preference:', prefError.message);
            return;
        }

        if (!enabled) return;

        const { error: insertError } = await supabase.from('notifications').insert({
            user_id: userId,
            workspace_id: workspaceId,
            type,
            title,
            message,
            entity_type: entityType ?? null,
            entity_id: entityId ?? null,
            data: data ?? {},
            scheduled_for: scheduledFor ?? null,
        });

        if (insertError) {
            console.warn('[notificationService] Error inserting notification:', insertError.message);
        }
    } catch (err) {
        console.warn('[notificationService] Unexpected error:', err);
    }
}

export async function notifyRecurrenceStatusChange(
    supabase: SupabaseClient,
    userId: string,
    workspaceId: string,
    ruleId: string,
    ruleName: string,
    newStatus: 'paused' | 'active' | 'canceled'
): Promise<void> {
    const typeMap: Record<string, NotificationType> = {
        paused: 'recurrence_paused',
        active: 'recurrence_processed',
        canceled: 'recurrence_canceled',
    };

    const titleMap: Record<string, string> = {
        paused: 'Recorrência pausada',
        active: 'Recorrência retomada',
        canceled: 'Recorrência cancelada',
    };

    const messageMap: Record<string, string> = {
        paused: `A recorrência "${ruleName}" foi pausada.`,
        active: `A recorrência "${ruleName}" foi retomada.`,
        canceled: `A recorrência "${ruleName}" foi cancelada.`,
    };

    await createNotificationIfEnabled({
        supabase,
        userId,
        workspaceId,
        type: typeMap[newStatus],
        title: titleMap[newStatus],
        message: messageMap[newStatus],
        entityType: 'recurrence_rule',
        entityId: ruleId,
        data: { rule_name: ruleName, new_status: newStatus },
    });
}

export async function notifyTransactionStatusChange(
    supabase: SupabaseClient,
    userId: string,
    workspaceId: string,
    transactionId: string,
    description: string,
    newStatus: string
): Promise<void> {
    await createNotificationIfEnabled({
        supabase,
        userId,
        workspaceId,
        type: 'transaction_status_changed',
        title: 'Status do lançamento alterado',
        message: `O lançamento "${description}" teve seu status atualizado para "${newStatus}".`,
        entityType: 'transaction',
        entityId: transactionId,
        data: { description, new_status: newStatus },
    });
}

export async function notifyInvoiceClosing(
    supabase: SupabaseClient,
    userId: string,
    workspaceId: string,
    cardId: string,
    cardName: string,
    closingDate: string,
    amount: number
): Promise<void> {
    await createNotificationIfEnabled({
        supabase,
        userId,
        workspaceId,
        type: 'invoice_closing',
        title: 'Fatura fechada',
        message: `A fatura do cartão "${cardName}" foi fechada com total de R$ ${amount.toFixed(2)}.`,
        entityType: 'credit_card',
        entityId: cardId,
        data: { card_name: cardName, closing_date: closingDate, amount },
    });
}

export async function checkSubscriptionsAndNotify(
    supabase: SupabaseClient,
    userId: string,
    workspaceId: string,
    entityType: NotificationEntityType,
    entityId: string,
    eventType: NotificationType,
    title: string,
    message: string,
    data?: Record<string, unknown>
): Promise<void> {
    try {
        const { data: subscription, error } = await supabase
            .from('notification_subscriptions')
            .select('notification_types')
            .eq('user_id', userId)
            .eq('workspace_id', workspaceId)
            .eq('entity_type', entityType)
            .eq('entity_id', entityId)
            .maybeSingle();

        if (error || !subscription) return;

        const types: NotificationType[] = subscription.notification_types ?? [];
        if (!types.includes(eventType)) return;

        await createNotificationIfEnabled({
            supabase,
            userId,
            workspaceId,
            type: eventType,
            title,
            message,
            entityType,
            entityId,
            data,
        });
    } catch (err) {
        console.warn('[notificationService] checkSubscriptionsAndNotify error:', err);
    }
}
