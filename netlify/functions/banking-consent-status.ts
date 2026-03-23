import type { Handler } from '@netlify/functions';
import { handlePreflight } from './_lib/cors';
import { jsonResponse, errorResponse } from './_lib/response';
import { authenticate, isAuthContext } from './_lib/auth';
import { getSupabaseAdmin } from './_lib/supabase';

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

        // Conexões ativas com consentimento próximo de expirar (< 30 dias)
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        const { data, error } = await admin
            .from('pluggy_connections')
            .select('id, institution_name, status, consent_expires_at, last_sync_at, pluggy_item_id, account_id')
            .eq('workspace_id', workspaceId)
            .eq('status', 'active')
            .not('consent_expires_at', 'is', null)
            .lte('consent_expires_at', thirtyDaysFromNow.toISOString())
            .order('consent_expires_at', { ascending: true });

        if (error) throw error;

        return jsonResponse(200, { data: data ?? [] }, origin);
    } catch (err) {
        console.error('[banking-consent-status] erro:', (err as Error).message);
        return errorResponse(500, 'SERVER_ERROR', 'Erro ao verificar status de consentimento.', origin);
    }
};
