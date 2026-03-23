import type { Handler } from '@netlify/functions';
import { handlePreflight } from './_lib/cors';
import { jsonResponse, errorResponse } from './_lib/response';
import { authenticate, isAuthContext } from './_lib/auth';
import { createConnectToken } from './_lib/pluggy.service';

export const handler: Handler = async (event) => {
    const preflight = handlePreflight(event);
    if (preflight) return preflight;

    const origin = event.headers.origin;

    if (event.httpMethod !== 'POST') {
        return errorResponse(405, 'METHOD_NOT_ALLOWED', 'Método não permitido.', origin);
    }

    // Auth
    const authResult = await authenticate(event);
    if (!isAuthContext(authResult)) return authResult;

    const { workspaceId, userId } = authResult;

    // Body opcional: { itemId } para reconexão
    let itemId: string | undefined;
    if (event.body) {
        try {
            const body = JSON.parse(event.body);
            itemId = body.itemId || body.item_id;
        } catch {
            // ignora body inválido
        }
    }

    try {
        const result = await createConnectToken({ workspaceId, userId, itemId });
        return jsonResponse(200, result, origin);
    } catch (err) {
        console.error('[banking-connect-token] erro ao criar connect token:', (err as Error).message);
        return errorResponse(500, 'SERVER_ERROR', 'Erro ao gerar token de conexão.', origin);
    }
};
