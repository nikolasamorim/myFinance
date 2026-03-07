import { Request, Response, NextFunction } from 'express';
import { getSupabaseForUser, getSupabaseAdmin } from '../lib/supabase';

export interface AuthenticatedRequest extends Request {
    user: {
        id: string;
        email?: string;
    };
    supabase: ReturnType<typeof getSupabaseForUser>;
    jwt: string;
}

/**
 * Middleware that validates the Bearer JWT and attaches:
 * - req.user: the authenticated user object
 * - req.supabase: a Supabase client scoped to this user's JWT (RLS active)
 * - req.jwt: the raw token string
 */
export async function requireAuth(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
            error: {
                code: 'UNAUTHORIZED',
                message: 'Token de autenticação ausente.',
            },
        });
        return;
    }

    const jwt = authHeader.substring(7);

    try {
        // Validate the JWT by fetching the user via Supabase Auth
        const { data, error } = await getSupabaseAdmin().auth.getUser(jwt);

        if (error || !data.user) {
            res.status(401).json({
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Sessão inválida ou expirada. Faça login novamente.',
                },
            });
            return;
        }

        // Attach user context and scoped supabase client to the request
        const authReq = req as AuthenticatedRequest;
        authReq.user = {
            id: data.user.id,
            email: data.user.email,
        };
        authReq.jwt = jwt;
        authReq.supabase = getSupabaseForUser(jwt);

        next();
    } catch (err) {
        res.status(500).json({
            error: {
                code: 'SERVER_ERROR',
                message: 'Erro interno ao verificar autenticação.',
            },
        });
    }
}
