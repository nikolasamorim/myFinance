import { Router, Response, NextFunction, RequestHandler } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router({ mergeParams: true });
router.use(requireAuth as RequestHandler);

type H = (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
const h = (fn: H): RequestHandler =>
    (req, res, next) => fn(req as AuthenticatedRequest, res, next).catch(next) as unknown;

/** GET /api/v1/workspaces/:wid/accounts */
router.get('/', h(async (req, res, next) => {
    try {
        const { wid } = req.params;
        const { search, type } = req.query as Record<string, string>;

        let query = req.supabase
            .from('accounts')
            .select('id, workspace_id, title, type, initial_balance, opened_at, cost_center_id, color, icon, description, parent_id, created_at, updated_at')
            .eq('workspace_id', wid)
            .order('created_at', { ascending: false });

        if (search) query = query.ilike('title', `%${search}%`);
        if (type && type !== 'all') query = query.eq('type', type);

        const { data, error } = await query;
        if (error) throw error;
        res.json(data ?? []);
    } catch (err) { next(err); }
}));

/** POST /api/v1/workspaces/:wid/accounts */
router.post('/', h(async (req, res, next) => {
    try {
        const { wid } = req.params;
        const { title, type, initial_balance, opened_at, cost_center_id, color, icon, description, parent_id } = req.body;
        if (!title || !type) {
            res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'title e type são obrigatórios.' } });
            return;
        }
        const { data, error } = await req.supabase
            .from('accounts')
            .insert([{ workspace_id: wid, title, type, initial_balance, opened_at, cost_center_id, color, icon, description, parent_id: parent_id || null }])
            .select().single();
        if (error) throw error;
        res.status(201).json(data);
    } catch (err) { next(err); }
}));

/** PUT /api/v1/workspaces/:wid/accounts/:id */
router.put('/:id', h(async (req, res, next) => {
    try {
        const { id } = req.params;
        const { data, error } = await req.supabase
            .from('accounts').update(req.body).eq('id', id).select().single();
        if (error) throw error;
        res.json(data);
    } catch (err) { next(err); }
}));

/** DELETE /api/v1/workspaces/:wid/accounts/:id */
router.delete('/:id', h(async (req, res, next) => {
    try {
        const { id } = req.params;
        const { error } = await req.supabase.from('accounts').delete().eq('id', id);
        if (error) throw error;
        res.status(204).send();
    } catch (err) { next(err); }
}));

export default router;
