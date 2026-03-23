import type { Handler } from '@netlify/functions';
import { getSupabaseAdmin } from './_lib/supabase';
import {
    getAccounts,
    getAllTransactions,
    getItem,
    type PluggyTransaction,
} from './_lib/pluggy.service';

// ─── Handler ─────────────────────────────────────────────────────────────────

export const handler: Handler = async (event) => {
    // Sempre 200 — erros são logados, nunca surfaceados
    if (event.httpMethod !== 'POST') {
        return { statusCode: 200, body: JSON.stringify({ received: true }) };
    }

    let payload: any;
    try {
        payload = JSON.parse(event.body || '{}');
    } catch {
        console.error('[webhook] body inválido');
        return { statusCode: 200, body: JSON.stringify({ received: true }) };
    }

    const eventType: string = payload.event;

    try {
        switch (eventType) {
            case 'item/created':
                await handleItemCreated(payload);
                break;
            case 'item/updated':
                await handleItemUpdated(payload);
                break;
            case 'item/error':
                await handleItemError(payload);
                break;
            case 'transactions/created':
                await handleTransactionsCreated(payload);
                break;
            default:
                console.log('[webhook] evento ignorado:', eventType);
        }
    } catch (err) {
        console.error(`[webhook] erro ao processar ${eventType}:`, (err as Error).message);
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
};

// ─── item/created ────────────────────────────────────────────────────────────

async function handleItemCreated(payload: any): Promise<void> {
    const admin = getSupabaseAdmin();
    const itemId: string = payload.data?.item?.id;
    if (!itemId) return;

    // Buscar item na Pluggy para obter dados
    const item = await getItem(itemId);

    // Parsear clientUserId → workspaceId:userId
    const clientUserId: string = item.clientUserId || '';
    const [workspaceId, userId] = clientUserId.split(':');
    if (!workspaceId || !userId) {
        console.error('[webhook] clientUserId inválido:', clientUserId);
        return;
    }

    // Inserir conexão
    const { error: insertError } = await admin
        .from('pluggy_connections')
        .insert({
            workspace_id: workspaceId,
            pluggy_item_id: itemId,
            institution_name: item.connector?.name || 'Desconhecida',
            status: 'active',
            created_by: userId,
            consent_expires_at: item.consentExpiresAt || null,
        });

    if (insertError) {
        // Se já existe (UNIQUE), atualizar status
        if (insertError.code === '23505') {
            await admin
                .from('pluggy_connections')
                .update({
                    status: 'active',
                    error_message: null,
                    consent_expires_at: item.consentExpiresAt || null,
                })
                .eq('pluggy_item_id', itemId)
                .eq('workspace_id', workspaceId);
        } else {
            throw insertError;
        }
    }

    // Buscar accounts da Pluggy e salvar pluggy_account_id (primeira conta)
    const accounts = await getAccounts(itemId);
    if (accounts.length > 0) {
        await admin
            .from('pluggy_connections')
            .update({ pluggy_account_id: accounts[0].id })
            .eq('pluggy_item_id', itemId)
            .eq('workspace_id', workspaceId);
    }
}

// ─── item/updated ────────────────────────────────────────────────────────────

async function handleItemUpdated(payload: any): Promise<void> {
    const admin = getSupabaseAdmin();
    const itemId: string = payload.data?.item?.id;
    if (!itemId) return;

    // Buscar conexão local
    const { data: connection, error } = await admin
        .from('pluggy_connections')
        .select('*')
        .eq('pluggy_item_id', itemId)
        .maybeSingle();

    if (error || !connection) {
        console.error('[webhook] conexão não encontrada para item:', itemId);
        return;
    }

    // Atualizar status
    await admin
        .from('pluggy_connections')
        .update({
            status: 'active',
            last_sync_at: new Date().toISOString(),
            error_message: null,
        })
        .eq('id', connection.id);

    // Importar transações
    const pluggyAccountId = connection.pluggy_account_id;
    if (!pluggyAccountId) return;

    if (!connection.initial_sync_done) {
        // Sync inicial: últimos 90 dias
        const from = new Date();
        from.setDate(from.getDate() - 90);
        await importarTransacoes(connection, from.toISOString().split('T')[0]);
    } else {
        // Sync incremental: desde last_sync_at (ou últimos 7 dias como fallback)
        const since = connection.last_sync_at
            ? new Date(connection.last_sync_at)
            : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        await importarTransacoes(connection, since.toISOString().split('T')[0]);
    }

    // Marcar sync inicial como concluído
    if (!connection.initial_sync_done) {
        await admin
            .from('pluggy_connections')
            .update({ initial_sync_done: true })
            .eq('id', connection.id);
    }
}

// ─── item/error ──────────────────────────────────────────────────────────────

async function handleItemError(payload: any): Promise<void> {
    const admin = getSupabaseAdmin();
    const itemId: string = payload.data?.item?.id;
    if (!itemId) return;

    const item = await getItem(itemId).catch(() => null);
    const errorCode = item?.error?.code || payload.data?.error?.code || '';
    const errorMsg = item?.error?.message || payload.data?.error?.message || 'Erro desconhecido';

    const isLoginError = errorCode === 'LOGIN_ERROR' || errorCode === 'INVALID_CREDENTIALS';

    const updateData: Record<string, unknown> = {
        status: isLoginError ? 'login_error' : 'error',
        error_message: errorMsg,
    };

    if (isLoginError) {
        updateData.retry_count = 0;
    }

    // Para outros erros, incrementar retry_count
    if (!isLoginError) {
        const { data: conn } = await admin
            .from('pluggy_connections')
            .select('retry_count')
            .eq('pluggy_item_id', itemId)
            .maybeSingle();
        updateData.retry_count = (conn?.retry_count || 0) + 1;
    }

    await admin
        .from('pluggy_connections')
        .update(updateData)
        .eq('pluggy_item_id', itemId);
}

// ─── transactions/created ────────────────────────────────────────────────────

async function handleTransactionsCreated(payload: any): Promise<void> {
    const admin = getSupabaseAdmin();
    const itemId: string = payload.data?.item?.id || payload.data?.itemId;
    if (!itemId) return;

    const { data: connection } = await admin
        .from('pluggy_connections')
        .select('*')
        .eq('pluggy_item_id', itemId)
        .maybeSingle();

    if (!connection?.pluggy_account_id) return;

    // Importar incrementais (últimos 7 dias como janela segura)
    const from = new Date();
    from.setDate(from.getDate() - 7);
    await importarTransacoes(connection, from.toISOString().split('T')[0]);
}

// ─── Importação de transações ────────────────────────────────────────────────

async function importarTransacoes(
    connection: any,
    from?: string,
    to?: string,
): Promise<void> {
    const admin = getSupabaseAdmin();
    const pluggyAccountId = connection.pluggy_account_id;
    if (!pluggyAccountId) return;

    const today = to || new Date().toISOString().split('T')[0];
    const transactions = await getAllTransactions(pluggyAccountId, from, today);

    if (transactions.length === 0) return;

    // Preparar rows para inserção com idempotência via upsert
    const rows = transactions.map((t: PluggyTransaction) => ({
        transaction_workspace_id: connection.workspace_id,
        transaction_type: t.amount > 0 ? 'income' : 'expense',
        transaction_description: t.description || '',
        transaction_amount: Math.abs(t.amount),
        transaction_date: t.date.split('T')[0],
        transaction_status: 'pending',
        transaction_bank_id: connection.account_id || null,
        transaction_origin: 'api',
        transaction_created_by_user_id: connection.created_by,
        transaction_payment_method: null,
        transaction_cost_center_id: null,
        transaction_category_id: null,
        transaction_card_id: null,
        transaction_person_id: null,
        transaction_recurrence: null,
        recurring: false,
        recurrence_id: null,
        recurrence_rule_id: null,
        recurrence_sequence: null,
        recurrence_instance_date: null,
        parent_recurrence_rule_id: null,
        is_recurrence_generated: false,
        generated_at: null,
        version: null,
        installment_group_id: null,
        installment_number: null,
        installment_total: null,
        import_source: 'open_finance',
        external_id: t.id,
        raw_data: t as unknown as Record<string, unknown>,
    }));

    // Upsert com ignoreDuplicates (idempotência via unique index em external_id)
    const { data: inserted, error: insertErr } = await admin
        .from('transactions')
        .upsert(rows, {
            onConflict: 'transaction_workspace_id,import_source,external_id',
            ignoreDuplicates: true,
        })
        .select('transaction_id');

    if (insertErr) {
        console.error('[webhook] erro ao inserir transações:', insertErr.message);
        return;
    }

    const importedCount = (inserted ?? []).length;
    const skippedCount = transactions.length - importedCount;

    // Registrar import_batch
    await admin
        .from('import_batches')
        .insert({
            workspace_id: connection.workspace_id,
            account_id: connection.account_id || null,
            source: 'open_finance',
            created_by: connection.created_by,
            item_count: importedCount,
            skipped_count: skippedCount,
            status: 'completed',
        });
}
