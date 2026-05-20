import type { Handler } from '@netlify/functions';
import { getSupabaseAdmin } from './_lib/supabase';
import { importarTransacoes } from './_lib/import.service';

/**
 * Netlify Background Function (sufixo `-background`): execução assíncrona, até 15 min.
 * Disparada pelo webhook da Pluggy para fazer o import pesado fora do request síncrono.
 *
 * Body: { connectionId, from?, to?, markInitialSyncDone? }
 */
export const handler: Handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 200, body: JSON.stringify({ received: true }) };
    }

    // Guarda opcional por token compartilhado (defina INTERNAL_FUNCTION_TOKEN para ativar)
    const expected = process.env.INTERNAL_FUNCTION_TOKEN;
    if (expected && event.headers['x-internal-token'] !== expected) {
        console.error('[import-bg] token interno inválido');
        return { statusCode: 401, body: JSON.stringify({ error: 'unauthorized' }) };
    }

    let payload: { connectionId?: string; from?: string; to?: string; markInitialSyncDone?: boolean };
    try {
        payload = JSON.parse(event.body || '{}');
    } catch {
        console.error('[import-bg] body inválido');
        return { statusCode: 200, body: JSON.stringify({ received: true }) };
    }

    const { connectionId, from, to, markInitialSyncDone } = payload;
    if (!connectionId) {
        console.error('[import-bg] connectionId ausente');
        return { statusCode: 200, body: JSON.stringify({ received: true }) };
    }

    const admin = getSupabaseAdmin();
    const { data: connection, error } = await admin
        .from('pluggy_connections')
        .select('*')
        .eq('id', connectionId)
        .maybeSingle();

    if (error || !connection || !connection.pluggy_account_id) {
        console.error('[import-bg] conexão inválida ou sem conta:', connectionId);
        return { statusCode: 200, body: JSON.stringify({ received: true }) };
    }

    try {
        await importarTransacoes(connection, from, to);

        if (markInitialSyncDone && !connection.initial_sync_done) {
            await admin
                .from('pluggy_connections')
                .update({ initial_sync_done: true })
                .eq('id', connection.id);
        }
    } catch (err) {
        console.error('[import-bg] erro no import:', (err as Error).message);
    }

    return { statusCode: 200, body: JSON.stringify({ done: true }) };
};
