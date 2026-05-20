import type { Handler } from '@netlify/functions';
import { getSupabaseAdmin } from './_lib/supabase';
import {
    getAccounts,
    getItem,
} from './_lib/pluggy.service';

// ─── Handler ─────────────────────────────────────────────────────────────────

export const handler: Handler = async (event) => {
    // Sempre 200 — erros são logados, nunca surfaceados
    if (event.httpMethod !== 'POST') {
        return { statusCode: 200, body: JSON.stringify({ received: true }) };
    }

    // Validação por segredo compartilhado: defina WEBHOOK_SECRET e registre a URL de
    // webhook na Pluggy com ?token=<secret> (ou header x-webhook-token). Se WEBHOOK_SECRET
    // não estiver setado, a verificação é pulada (graceful).
    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (webhookSecret) {
        const provided =
            event.queryStringParameters?.token ??
            (event.headers['x-webhook-token'] as string | undefined);
        if (provided !== webhookSecret) {
            console.error('[webhook] token inválido — requisição ignorada');
            return { statusCode: 200, body: JSON.stringify({ received: true }) };
        }
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

    // Atualizar status (rápido — permanece no webhook)
    await admin
        .from('pluggy_connections')
        .update({
            status: 'active',
            last_sync_at: new Date().toISOString(),
            error_message: null,
        })
        .eq('id', connection.id);

    if (!connection.pluggy_account_id) return;

    // Janela de import: 90d no sync inicial; incremental (desde o last_sync_at anterior) depois
    let from: string;
    if (!connection.initial_sync_done) {
        const d = new Date();
        d.setDate(d.getDate() - 90);
        from = d.toISOString().split('T')[0];
    } else {
        const since = connection.last_sync_at
            ? new Date(connection.last_sync_at)
            : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        from = since.toISOString().split('T')[0];
    }

    // Import pesado roda assíncrono na background function
    await triggerBackgroundImport({
        connectionId: connection.id,
        from,
        markInitialSyncDone: !connection.initial_sync_done,
    });
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

    // Importar incrementais (últimos 7 dias) — assíncrono
    const from = new Date();
    from.setDate(from.getDate() - 7);
    await triggerBackgroundImport({
        connectionId: connection.id,
        from: from.toISOString().split('T')[0],
    });
}

// ─── Disparo do import assíncrono (Netlify background function) ────────────────

async function triggerBackgroundImport(payload: {
    connectionId: string;
    from?: string;
    to?: string;
    markInitialSyncDone?: boolean;
}): Promise<void> {
    const base = process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.DEPLOY_URL;
    if (!base) {
        console.error('[webhook] URL do site indisponível — import background não disparado');
        return;
    }
    try {
        await fetch(`${base}/.netlify/functions/banking-import-background`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(process.env.INTERNAL_FUNCTION_TOKEN
                    ? { 'x-internal-token': process.env.INTERNAL_FUNCTION_TOKEN }
                    : {}),
            },
            body: JSON.stringify(payload),
        });
    } catch (err) {
        console.error('[webhook] falha ao disparar import background:', (err as Error).message);
    }
}
