import type { Handler } from '@netlify/functions';
import { handlePreflight } from './_lib/cors';
import { jsonResponse, errorResponse } from './_lib/response';
import { authenticate, isAuthContext } from './_lib/auth';
import { getSupabaseAdmin } from './_lib/supabase';
import { deleteItem } from './_lib/pluggy.service';

export const handler: Handler = async (event) => {
    const preflight = handlePreflight(event);
    if (preflight) return preflight;

    const origin = event.headers.origin;

    if (event.httpMethod !== 'DELETE') {
        return errorResponse(405, 'METHOD_NOT_ALLOWED', 'Método não permitido.', origin);
    }

    // Auth
    const authResult = await authenticate(event);
    if (!isAuthContext(authResult)) return authResult;

    const { workspaceId } = authResult;
    const connectionId = event.queryStringParameters?.connection_id;

    if (!connectionId) {
        return errorResponse(400, 'VALIDATION_ERROR', 'connection_id é obrigatório.', origin);
    }

    try {
        const admin = getSupabaseAdmin();

        // Buscar conexão e validar que pertence ao workspace
        const { data: connection, error } = await admin
            .from('pluggy_connections')
            .select('*')
            .eq('id', connectionId)
            .eq('workspace_id', workspaceId)
            .maybeSingle();

        if (error) throw error;
        if (!connection) {
            return errorResponse(404, 'NOT_FOUND', 'Conexão não encontrada.', origin);
        }

        // Deletar item na Pluggy (ignora erro se já deletado)
        try {
            await deleteItem(connection.pluggy_item_id);
        } catch (err) {
            console.error('[banking-disconnect] erro ao deletar item na Pluggy:', (err as Error).message);
        }

        // Atualizar status para desconectado (NÃO deletar transações)
        await admin
            .from('pluggy_connections')
            .update({ status: 'disconnected' })
            .eq('id', connectionId);

        return jsonResponse(204, null, origin);
    } catch (err) {
        console.error('[banking-disconnect] erro:', (err as Error).message);
        return errorResponse(500, 'SERVER_ERROR', 'Erro ao desconectar conta bancária.', origin);
    }
};
