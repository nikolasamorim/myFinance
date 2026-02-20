import { Router, Request, Response, NextFunction } from 'express';
import { getSupabaseForUser, supabaseAdmin } from '../lib/supabase';

const router = Router();

/**
 * POST /api/v1/auth/login
 * Body: { email, password }
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;
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

        res.json({
            access_token: data.session?.access_token,
            refresh_token: data.session?.refresh_token,
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

/**
 * POST /api/v1/auth/register
 * Body: { email, password, name }
 */
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

/**
 * POST /api/v1/auth/logout
 * Requires Authorization header.
 */
router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        const jwt = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : '';
        if (jwt) {
            const supabase = getSupabaseForUser(jwt);
            await supabase.auth.signOut();
        }
        res.json({ message: 'Logout realizado.' });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/v1/auth/refresh
 * Body: { refresh_token }
 */
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { refresh_token } = req.body;
        if (!refresh_token) {
            res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: 'refresh_token é obrigatório.' },
            });
            return;
        }

        const { data, error } = await supabaseAdmin.auth.refreshSession({ refresh_token });

        if (error || !data.session) {
            res.status(401).json({
                error: { code: 'UNAUTHORIZED', message: 'Refresh token inválido ou expirado.' },
            });
            return;
        }

        res.json({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
        });
    } catch (err) {
        next(err);
    }
});

export default router;
