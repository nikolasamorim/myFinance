import { Router, Response, NextFunction, RequestHandler } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router({ mergeParams: true });
router.use(requireAuth as RequestHandler);

type H = (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
const h = (fn: H): RequestHandler =>
    (req, res, next) => fn(req as AuthenticatedRequest, res, next).catch(next) as unknown;

/** GET /api/v1/workspaces/:wid/notifications/count/unread */
router.get('/count/unread', h(async (req, res, next) => {
    try {
        const { wid } = req.params;

        const { count, error } = await req.supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('workspace_id', wid)
            .eq('user_id', req.user.id)
            .eq('is_read', false)
            .eq('is_dismissed', false);

        if (error) throw error;
        res.json({ count: count ?? 0 });
    } catch (err) { next(err); }
}));

/** PATCH /api/v1/workspaces/:wid/notifications/read-all */
router.patch('/read-all', h(async (req, res, next) => {
    try {
        const { wid } = req.params;

        const { error } = await req.supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('workspace_id', wid)
            .eq('user_id', req.user.id)
            .eq('is_dismissed', false);

        if (error) throw error;
        res.json({ success: true });
    } catch (err) { next(err); }
}));

/** GET /api/v1/workspaces/:wid/notifications */
router.get('/', h(async (req, res, next) => {
    try {
        const { wid } = req.params;
        const {
            page = '1',
            limit = '20',
            unread_only,
            type,
            entity_type,
        } = req.query as Record<string, string>;

        const pageNum = Math.max(1, parseInt(page, 10));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
        const offset = (pageNum - 1) * limitNum;

        let query = req.supabase
            .from('notifications')
            .select('*', { count: 'exact' })
            .eq('workspace_id', wid)
            .eq('user_id', req.user.id)
            .eq('is_dismissed', false)
            .order('created_at', { ascending: false })
            .range(offset, offset + limitNum - 1);

        if (unread_only === 'true') query = query.eq('is_read', false);
        if (type) query = query.eq('type', type);
        if (entity_type) query = query.eq('entity_type', entity_type);

        const { data, error, count } = await query;
        if (error) throw error;

        res.json({
            data: data ?? [],
            total: count ?? 0,
            page: pageNum,
            limit: limitNum,
        });
    } catch (err) { next(err); }
}));

/** PATCH /api/v1/workspaces/:wid/notifications/:id/read */
router.patch('/:id/read', h(async (req, res, next) => {
    try {
        const { wid, id } = req.params;

        const { data, error } = await req.supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id)
            .eq('workspace_id', wid)
            .eq('user_id', req.user.id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) { next(err); }
}));

/** DELETE /api/v1/workspaces/:wid/notifications/:id */
router.delete('/:id', h(async (req, res, next) => {
    try {
        const { wid, id } = req.params;

        const { error } = await req.supabase
            .from('notifications')
            .update({ is_dismissed: true })
            .eq('id', id)
            .eq('workspace_id', wid)
            .eq('user_id', req.user.id);

        if (error) throw error;
        res.status(204).send();
    } catch (err) { next(err); }
}));

export default router;
