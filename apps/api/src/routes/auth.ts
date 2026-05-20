import crypto from 'crypto';
import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { getSupabaseForUser, getSupabaseAdmin, getSupabaseWithSession } from '../lib/supabase';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// ─── Cookie helpers ──────────────────────────────────────────────────────────

const REFRESH_COOKIE = 'refresh_token';
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/api/v1/auth',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};

function setRefreshCookie(res: Response, token: string) {
    res.cookie(REFRESH_COOKIE, token, COOKIE_OPTIONS);
}

function clearRefreshCookie(res: Response) {
    res.clearCookie(REFRESH_COOKIE, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        path: '/api/v1/auth',
    });
}

// ─── POST /auth/login ────────────────────────────────────────────────────────

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password, code } = req.body;
        if (!email || !password) {
            res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: 'Email e senha são obrigatórios.' },
            });
            return;
        }

        const supabase = getSupabaseForUser('');
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            res.status(401).json({
                error: { code: 'UNAUTHORIZED', message: 'Credenciais inválidas.' },
            });
            return;
        }

        // The signed-in client now holds the session in memory, so the MFA helpers
        // below operate on this freshly authenticated user.
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        const mfaRequired = aal?.currentLevel === 'aal1' && aal?.nextLevel === 'aal2';

        let accessToken = data.session?.access_token;
        let refreshToken = data.session?.refresh_token;

        if (mfaRequired) {
            if (!code) {
                // First step: ask the client for the TOTP code. Do not finalize the session.
                res.json({ mfa_required: true });
                return;
            }

            const { data: factorsData } = await supabase.auth.mfa.listFactors();
            const totp = factorsData?.totp?.[0];
            if (!totp) {
                res.status(400).json({
                    error: { code: 'VALIDATION_ERROR', message: 'Nenhum fator 2FA encontrado.' },
                });
                return;
            }

            const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({ factorId: totp.id });
            if (chErr || !challenge) {
                res.status(400).json({
                    error: { code: 'VALIDATION_ERROR', message: 'Falha ao iniciar desafio 2FA.' },
                });
                return;
            }

            const { data: verifyData, error: vErr } = await supabase.auth.mfa.verify({
                factorId: totp.id,
                challengeId: challenge.id,
                code,
            });
            if (vErr || !verifyData) {
                res.status(401).json({
                    error: { code: 'UNAUTHORIZED', message: 'Código 2FA inválido.' },
                });
                return;
            }

            // verify() upgrades the session to AAL2 and issues fresh tokens.
            accessToken = verifyData.access_token;
            refreshToken = verifyData.refresh_token;
        }

        // Set httpOnly cookie with refresh token
        if (refreshToken) {
            setRefreshCookie(res, refreshToken);
        }

        res.json({
            access_token: accessToken,
            refresh_token: refreshToken, // kept for mobile compatibility
            user: {
                id: data.user?.id,
                email: data.user?.email,
                name: data.user?.user_metadata?.name,
            },
        });
    } catch (err) {
        next(err);
    }
});

// ─── POST /auth/register ────────────────────────────────────────────────────

router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password, name } = req.body;
        if (!email || !password || !name) {
            res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: 'Email, senha e nome são obrigatórios.' },
            });
            return;
        }

        const supabase = getSupabaseForUser('');
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { name } },
        });

        if (error) {
            res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: error.message },
            });
            return;
        }

        res.status(201).json({ message: 'Conta criada. Verifique seu email.' });
    } catch (err) {
        next(err);
    }
});

// ─── POST /auth/logout ──────────────────────────────────────────────────────

router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        const jwt = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : '';
        if (jwt) {
            const supabase = getSupabaseForUser(jwt);
            await supabase.auth.signOut();
        }

        // Clear the httpOnly refresh token cookie
        clearRefreshCookie(res);

        res.json({ message: 'Logout realizado.' });
    } catch (err) {
        next(err);
    }
});

// ─── POST /auth/refresh ─────────────────────────────────────────────────────

router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Accept refresh token from cookie (web) or body (mobile)
        const refresh_token = req.cookies?.[REFRESH_COOKIE] ?? req.body.refresh_token;

        if (!refresh_token) {
            res.status(401).json({
                error: { code: 'UNAUTHORIZED', message: 'Refresh token ausente.' },
            });
            return;
        }

        const { data, error } = await getSupabaseAdmin().auth.refreshSession({ refresh_token });

        if (error || !data.session) {
            clearRefreshCookie(res);
            res.status(401).json({
                error: { code: 'UNAUTHORIZED', message: 'Refresh token inválido ou expirado.' },
            });
            return;
        }

        // Update the httpOnly cookie with the new refresh token
        setRefreshCookie(res, data.session.refresh_token);

        res.json({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token, // kept for mobile compatibility
            user: {
                id: data.user?.id,
                email: data.user?.email,
                name: data.user?.user_metadata?.name,
            },
        });
    } catch (err) {
        next(err);
    }
});

// ─── GET /auth/me ────────────────────────────────────────────────────────────

router.get('/me', requireAuth as RequestHandler, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authReq = req as AuthenticatedRequest;

        // Fetch full user metadata from Supabase
        const { data, error } = await getSupabaseAdmin().auth.getUser(authReq.jwt);

        if (error || !data.user) {
            res.status(401).json({
                error: { code: 'UNAUTHORIZED', message: 'Não foi possível obter dados do usuário.' },
            });
            return;
        }

        res.json({
            id: data.user.id,
            email: data.user.email,
            name: data.user.user_metadata?.name || data.user.email,
        });
    } catch (err) {
        next(err);
    }
});

// ─── GET /auth/google ────────────────────────────────────────────────────────

router.get('/google', async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseAnonKey) {
            res.status(500).json({
                error: { code: 'SERVER_ERROR', message: 'Configuração do servidor incompleta.' },
            });
            return;
        }

        const apiOrigin = process.env.API_ORIGIN ?? `http://localhost:${process.env.PORT ?? 3001}`;
        const callbackUrl = `${apiOrigin}/api/v1/auth/callback`;

        // Build Supabase OAuth URL directly (implicit flow — no PKCE).
        // Server handles the callback, extracts tokens, and sets httpOnly cookie.
        const oauthUrl = new URL(`${supabaseUrl}/auth/v1/authorize`);
        oauthUrl.searchParams.set('provider', 'google');
        oauthUrl.searchParams.set('redirect_to', callbackUrl);
        oauthUrl.searchParams.set('apikey', supabaseAnonKey);

        res.json({ url: oauthUrl.toString() });
    } catch (err) {
        next(err);
    }
});

// ─── GET /auth/callback ─────────────────────────────────────────────────────
// Supabase redirects here after Google OAuth.
// With the implicit flow, tokens arrive in the URL fragment (#access_token=...).
// But URL fragments are never sent to the server, so Supabase may also send
// them as query params when using `redirect_to`. We handle both approaches:
//   1. If `access_token` and `refresh_token` are in query params → use them directly.
//   2. Otherwise, redirect to the web app and let the frontend extract from fragment.

router.get('/callback', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:5173';

        const accessToken = req.query.access_token as string | undefined;
        const refreshToken = req.query.refresh_token as string | undefined;

        if (accessToken && refreshToken) {
            // Tokens came as query params — set cookie and redirect
            setRefreshCookie(res, refreshToken);
            res.redirect(`${webOrigin}/auth/callback#access_token=${accessToken}`);
            return;
        }

        // No tokens in query params — check for error
        const errorParam = req.query.error as string | undefined;
        const errorDescription = req.query.error_description as string | undefined;
        if (errorParam) {
            res.redirect(`${webOrigin}/auth/callback?error=${encodeURIComponent(errorDescription || errorParam)}`);
            return;
        }

        // Supabase may redirect with tokens only in the fragment (implicit flow).
        // The server can't read fragments, so serve a minimal HTML page that
        // extracts them and posts back to /auth/callback/exchange.
        // A nonce is used to allow the inline script under Helmet's CSP.
        const nonce = crypto.randomBytes(16).toString('base64');
        res.setHeader(
            'Content-Security-Policy',
            `default-src 'none'; script-src 'nonce-${nonce}'; connect-src 'self'`,
        );
        res.send(`<!DOCTYPE html>
<html><head><title>Authenticating...</title></head>
<body><script nonce="${nonce}">
(function() {
    var hash = window.location.hash.substring(1);
    var params = new URLSearchParams(hash);
    var at = params.get('access_token');
    var rt = params.get('refresh_token');
    if (at && rt) {
        // Post tokens to the exchange endpoint so the server can set the cookie
        fetch('${apiOriginFromReq(req)}/api/v1/auth/callback/exchange', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ access_token: at, refresh_token: rt })
        }).then(function(r) {
            if (!r.ok) throw new Error('exchange failed');
            return r.json();
          }).then(function(data) {
            window.location.replace(data.redirect);
          }).catch(function() {
            window.location.replace('${webOrigin}/auth/callback?error=exchange_failed');
          });
    } else {
        window.location.replace('${webOrigin}/auth/callback?error=missing_tokens');
    }
})();
</script></body></html>`);
    } catch (err) {
        next(err);
    }
});

// Helper to get the API origin from the incoming request
function apiOriginFromReq(req: Request): string {
    if (process.env.API_ORIGIN) return process.env.API_ORIGIN;
    const proto = req.get('x-forwarded-proto') || req.protocol;
    const host = req.get('host') || `localhost:${process.env.PORT ?? 3001}`;
    return `${proto}://${host}`;
}

// ─── POST /auth/callback/exchange ───────────────────────────────────────────
// Receives tokens from the implicit flow HTML page and sets the httpOnly cookie.

router.post('/callback/exchange', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:5173';
        const { access_token, refresh_token } = req.body;

        if (!access_token || !refresh_token) {
            res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: 'Tokens ausentes.' },
            });
            return;
        }

        // Set the refresh token as httpOnly cookie
        setRefreshCookie(res, refresh_token);

        res.json({
            redirect: `${webOrigin}/auth/callback#access_token=${access_token}`,
        });
    } catch (err) {
        next(err);
    }
});

// ─── POST /auth/change-password ──────────────────────────────────────────────

router.post('/change-password', requireAuth as RequestHandler, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const { currentPassword, newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: 'Nova senha deve ter pelo menos 6 caracteres.' },
            });
            return;
        }
        if (!currentPassword) {
            res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: 'Senha atual é obrigatória.' },
            });
            return;
        }

        let email = authReq.user.email;
        if (!email) {
            const { data } = await getSupabaseAdmin().auth.admin.getUserById(authReq.user.id);
            email = data.user?.email;
        }
        if (!email) {
            res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: 'Não foi possível identificar o e-mail da conta.' },
            });
            return;
        }

        // Re-authenticate: confirm the current password before allowing the change.
        const { error: signInError } = await getSupabaseForUser('').auth.signInWithPassword({
            email,
            password: currentPassword,
        });
        if (signInError) {
            res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: 'Senha atual incorreta.' },
            });
            return;
        }

        const { error } = await getSupabaseAdmin().auth.admin.updateUserById(authReq.user.id, {
            password: newPassword,
        });

        if (error) {
            res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: error.message },
            });
            return;
        }

        res.json({ message: 'Senha alterada com sucesso.' });
    } catch (err) {
        next(err);
    }
});

// ─── POST /auth/change-email ─────────────────────────────────────────────────

router.post('/change-email', requireAuth as RequestHandler, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const { newEmail } = req.body;

        if (!newEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newEmail)) {
            res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: 'E-mail inválido.' },
            });
            return;
        }

        const refreshToken = req.cookies?.[REFRESH_COOKIE] ?? req.body.refresh_token;
        if (!refreshToken) {
            res.status(401).json({
                error: { code: 'UNAUTHORIZED', message: 'Sessão inválida. Faça login novamente.' },
            });
            return;
        }

        const client = await getSupabaseWithSession(authReq.jwt, refreshToken);
        const { error } = await client.auth.updateUser({ email: newEmail });

        if (error) {
            res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: error.message },
            });
            return;
        }

        res.json({ message: 'Enviamos um e-mail de confirmação. A troca será efetivada após a confirmação.' });
    } catch (err) {
        next(err);
    }
});

// ─── 2FA (TOTP via Supabase MFA) ──────────────────────────────────────────────

/** Builds a session-scoped client from the request, or sends 401 and returns null. */
async function sessionClientOr401(req: Request, res: Response) {
    const authReq = req as AuthenticatedRequest;
    const refreshToken = req.cookies?.[REFRESH_COOKIE] ?? req.body?.refresh_token;
    if (!refreshToken) {
        res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'Sessão inválida. Faça login novamente.' },
        });
        return null;
    }
    return getSupabaseWithSession(authReq.jwt, refreshToken);
}

/** POST /auth/2fa/enroll — start TOTP enrollment, returns QR code + secret. */
router.post('/2fa/enroll', requireAuth as RequestHandler, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const client = await sessionClientOr401(req, res);
        if (!client) return;

        // Drop any leftover unverified TOTP factors to avoid duplicates piling up.
        const { data: factors } = await client.auth.mfa.listFactors();
        const stale = (factors?.all ?? []).filter(f => f.factor_type === 'totp' && f.status !== 'verified');
        for (const f of stale) {
            await client.auth.mfa.unenroll({ factorId: f.id });
        }

        const { data, error } = await client.auth.mfa.enroll({ factorType: 'totp' });
        if (error || !data) {
            res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: error?.message ?? 'Falha ao iniciar 2FA.' },
            });
            return;
        }

        res.json({
            factor_id: data.id,
            qr_code: data.totp.qr_code,
            secret: data.totp.secret,
            uri: data.totp.uri,
        });
    } catch (err) {
        next(err);
    }
});

/** POST /auth/2fa/verify — confirm the TOTP code and activate 2FA. */
router.post('/2fa/verify', requireAuth as RequestHandler, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const { factor_id, code } = req.body;
        if (!factor_id || !code) {
            res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: 'Fator e código são obrigatórios.' },
            });
            return;
        }

        const client = await sessionClientOr401(req, res);
        if (!client) return;

        const { data: challenge, error: chErr } = await client.auth.mfa.challenge({ factorId: factor_id });
        if (chErr || !challenge) {
            res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: 'Falha ao iniciar desafio 2FA.' },
            });
            return;
        }

        const { data: verifyData, error: vErr } = await client.auth.mfa.verify({
            factorId: factor_id,
            challengeId: challenge.id,
            code,
        });
        if (vErr || !verifyData) {
            res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: 'Código inválido.' },
            });
            return;
        }

        await getSupabaseAdmin()
            .from('users')
            .update({ two_factor_enabled: true })
            .eq('user_id', authReq.user.id);

        // verify() rotates the session to AAL2 — propagate the new tokens so the
        // browser's refresh cookie and in-memory access token stay valid.
        if (verifyData.refresh_token) {
            setRefreshCookie(res, verifyData.refresh_token);
        }

        res.json({
            message: '2FA ativado com sucesso.',
            access_token: verifyData.access_token,
        });
    } catch (err) {
        next(err);
    }
});

/** POST /auth/2fa/disable — remove all TOTP factors and turn off 2FA. */
router.post('/2fa/disable', requireAuth as RequestHandler, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const client = await sessionClientOr401(req, res);
        if (!client) return;

        const { data: factors } = await client.auth.mfa.listFactors();
        const totpFactors = (factors?.all ?? []).filter(f => f.factor_type === 'totp');
        for (const f of totpFactors) {
            await client.auth.mfa.unenroll({ factorId: f.id });
        }

        await getSupabaseAdmin()
            .from('users')
            .update({ two_factor_enabled: false })
            .eq('user_id', authReq.user.id);

        res.json({ message: '2FA desativado.' });
    } catch (err) {
        next(err);
    }
});

export default router;
