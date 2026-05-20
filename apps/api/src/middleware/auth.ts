import { Request, Response, NextFunction } from 'express';
import { jwtVerify } from 'jose';
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
 * Shared HS256 secret used by Supabase Auth to sign JWTs (legacy/symmetric keys).
 * When configured, tokens are verified locally — no network round-trip per request.
 * Obtain it in: Supabase Dashboard → Settings → API → JWT Settings → JWT Secret.
 *
 * Note: if the project migrates to asymmetric signing keys (JWKS), local
 * verification here will fail and gracefully fall back to the remote check;
 * switch this to `jose.createRemoteJWKSet(<.well-known/jwks.json>)` at that point.
 */
const jwtSecret = process.env.SUPABASE_JWT_SECRET
    ? new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET)
    : null;

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
    const authReq = req as AuthenticatedRequest;

    // ─── Fast path: verify the signature locally (no round-trip to Auth) ────────
    if (jwtSecret) {
        try {
            const { payload } = await jwtVerify(jwt, jwtSecret, { algorithms: ['HS256'] });
            if (payload.sub) {
                authReq.user = {
                    id: payload.sub,
                    email: typeof payload.email === 'string' ? payload.email : undefined,
                };
                authReq.jwt = jwt;
                authReq.supabase = getSupabaseForUser(jwt);
                next();
                return;
            }
        } catch {
            // Invalid/expired/rotated/asymmetric token: fall through to remote check.
        }
    }

    // ─── Fallback: validate remotely via Supabase Auth ──────────────────────────
    // Also the only path when SUPABASE_JWT_SECRET is not configured.
    try {
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
