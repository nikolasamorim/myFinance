import type { Handler } from '@netlify/functions';
import { handlePreflight } from './_lib/cors';
import { jsonResponse, errorResponse } from './_lib/response';
import { authenticate, isAuthContext } from './_lib/auth';
import { getSupabaseForUser } from './_lib/supabase';

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

    const { workspaceId, jwt } = authResult;
    const params = event.queryStringParameters || {};

    const accountId = params.account_id;
    const from = params.from;
    const to = params.to;
    const page = parseInt(params.page || '1', 10);
    const pageSize = parseInt(params.pageSize || '20', 10);

    if (!accountId) {
        return errorResponse(400, 'VALIDATION_ERROR', 'account_id é obrigatório.', origin);
    }

    try {
        const supabase = getSupabaseForUser(jwt);

        const rangeFrom = (page - 1) * pageSize;
        const rangeTo = rangeFrom + pageSize - 1;

        let query = supabase
            .from('transactions')
            .select('*', { count: 'exact' })
            .eq('transaction_workspace_id', workspaceId)
            .eq('transaction_bank_id', accountId)
            .eq('import_source', 'open_finance')
            .order('transaction_date', { ascending: false })
            .range(rangeFrom, rangeTo);

        if (from) query = query.gte('transaction_date', from);
        if (to) query = query.lte('transaction_date', to);

        const { data, error, count } = await query;
        if (error) throw error;

        return jsonResponse(200, {
            data: data ?? [],
            total: count ?? 0,
            page,
            pageSize,
        }, origin);
    } catch (err) {
        console.error('[banking-transactions] erro:', (err as Error).message);
        return errorResponse(500, 'SERVER_ERROR', 'Erro ao buscar transações bancárias.', origin);
    }
};
