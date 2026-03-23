import type { HandlerEvent, HandlerResponse } from '@netlify/functions';
import { getSupabaseAdmin } from './supabase';
import { errorResponse } from './response';

export interface AuthContext {
    userId: string;
    email?: string;
    workspaceId: string;
    jwt: string;
}

/**
 * Autentica o usuário via JWT e valida membership no workspace.
 *
 * workspaceId é extraído de:
 *   - query string `workspace_id` (GET / DELETE)
 *   - body JSON `workspace_id` (POST / PUT / PATCH)
 *
 * Retorna AuthContext em caso de sucesso, ou HandlerResponse de erro.
 */
export async function authenticate(
    event: HandlerEvent,
): Promise<AuthContext | HandlerResponse> {
    const origin = event.headers.origin;

    // 1. Extrair JWT
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return errorResponse(401, 'UNAUTHORIZED', 'Token de autenticação ausente.', origin);
    }

    const jwt = authHeader.substring(7);

    // 2. Validar JWT via Supabase Auth
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.getUser(jwt);

    if (error || !data.user) {
        return errorResponse(401, 'UNAUTHORIZED', 'Sessão inválida ou expirada. Faça login novamente.', origin);
    }

    const userId = data.user.id;
    const email = data.user.email;

    // 3. Extrair workspaceId
    let workspaceId: string | undefined;

    if (event.queryStringParameters?.workspace_id) {
        workspaceId = event.queryStringParameters.workspace_id;
    } else if (event.body) {
        try {
            const body = JSON.parse(event.body);
            workspaceId = body.workspace_id;
        } catch {
            // body não é JSON válido — segue sem workspaceId
        }
    }

    if (!workspaceId) {
        return errorResponse(400, 'VALIDATION_ERROR', 'workspace_id é obrigatório.', origin);
    }

    // 4. Verificar membership no workspace
    const { data: membership, error: memberError } = await admin
        .from('workspace_users')
        .select('workspace_user_user_id')
        .eq('workspace_user_workspace_id', workspaceId)
        .eq('workspace_user_user_id', userId)
        .maybeSingle();

    if (memberError || !membership) {
        return errorResponse(403, 'FORBIDDEN', 'Sem permissão para este workspace.', origin);
    }

    return { userId, email, workspaceId, jwt };
}

/**
 * Type guard: verifica se o resultado do authenticate é um AuthContext (sucesso).
 */
export function isAuthContext(result: AuthContext | HandlerResponse): result is AuthContext {
    return 'userId' in result;
}
