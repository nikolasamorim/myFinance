import { Router, Response, NextFunction, RequestHandler } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
router.use(requireAuth as RequestHandler);

type H = (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
const h = (fn: H): RequestHandler =>
    (req, res, next) => fn(req as AuthenticatedRequest, res, next).catch(next) as unknown;

const USER_FIELDS = [
    'user_id', 'user_name', 'user_email', 'avatar_url', 'tags', 'description',
    'gender', 'birth_date', 'identification_code', 'hometown', 'nationality',
    'languages', 'marital_status', 'permanent_address', 'current_address',
    'two_factor_enabled',
].join(', ');

/** GET /api/v1/users/me */
router.get('/me', h(async (req, res, next) => {
    try {
        const { data, error } = await req.supabase
            .from('users')
            .select(USER_FIELDS)
            .eq('user_id', req.user.id)
            .maybeSingle();

        if (error) {
            console.error('[users/me] Supabase error:', JSON.stringify(error));
            throw error;
        }
        if (!data) {
            res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Perfil não encontrado.' } });
            return;
        }
        res.json(data);
    } catch (err) { next(err); }
}));

/** PUT /api/v1/users/me */
router.put('/me', h(async (req, res, next) => {
    try {
        const allowed = [
            'user_name', 'avatar_url', 'tags', 'description', 'gender', 'birth_date',
            'hometown', 'nationality', 'languages', 'marital_status',
            'permanent_address', 'current_address', 'two_factor_enabled',
        ];

        const updates: Record<string, unknown> = {};
        for (const field of allowed) {
            if (req.body[field] !== undefined) updates[field] = req.body[field];
        }

        const { data, error } = await req.supabase
            .from('users')
            .update(updates)
            .eq('user_id', req.user.id)
            .select(USER_FIELDS)
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) { next(err); }
}));

export default router;
