import type { Handler } from '@netlify/functions';
import { handlePreflight } from './_lib/cors';
import { jsonResponse, errorResponse } from './_lib/response';
import { authenticate, isAuthContext } from './_lib/auth';
import { getSupabaseAdmin } from './_lib/supabase';
import { getAccount } from './_lib/pluggy.service';

export const handler: Handler = async (event) => {
    const preflight = handlePreflight(event);
    if (preflight) return preflight;

    const origin = event.headers.origin;

    if (event.httpMethod !== 'GET') {
        return errorResponse(405, 'METHOD_NOT_ALLOWED', 'Método não permitido.', origin);
    }

    // Auth
    const authResult = await authenticate(event);
    if (!isAuthContext(authResult)) return authResult;

    const { workspaceId } = authResult;

    try {
        const admin = getSupabaseAdmin();
        const { data: connections, error } = await admin
            .from('pluggy_connections')
            .select('*')
            .eq('workspace_id', workspaceId)
            .neq('status', 'disconnected')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Para cada conexão ativa com pluggy_account_id, buscar saldo atual
        const result = await Promise.all(
            (connections ?? []).map(async (conn: any) => {
                let balance: number | null = null;

                if (conn.pluggy_account_id && conn.status === 'active') {
                    try {
                        const account = await getAccount(conn.pluggy_account_id);
                        balance = account.balance;
                    } catch {
                        // Saldo indisponível — não bloquear resposta
                    }
                }

                return {
                    id: conn.id,
                    institution_name: conn.institution_name,
                    status: conn.status,
                    balance,
                    last_sync_at: conn.last_sync_at,
                    consent_expires_at: conn.consent_expires_at,
                    account_id: conn.account_id,
                    pluggy_item_id: conn.pluggy_item_id,
                    pluggy_account_id: conn.pluggy_account_id,
                    initial_sync_done: conn.initial_sync_done,
                    error_message: conn.error_message,
                    created_at: conn.created_at,
                };
            }),
        );

        return jsonResponse(200, { data: result }, origin);
    } catch (err) {
        console.error('[banking-connections] erro:', (err as Error).message);
        return errorResponse(500, 'SERVER_ERROR', 'Erro ao buscar conexões bancárias.', origin);
    }
};
