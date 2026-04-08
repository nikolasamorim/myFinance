import { Router, Response, NextFunction, RequestHandler } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router({ mergeParams: true });
router.use(requireAuth as RequestHandler);

type H = (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
const h = (fn: H): RequestHandler =>
    (req, res, next) => fn(req as AuthenticatedRequest, res, next).catch(next) as unknown;

/** GET /api/v1/workspaces/:wid/activity-logs */
router.get('/', h(async (req, res, next) => {
    try {
        const { wid } = req.params;
        const {
            page = '1', limit = '20',
            action, entity_type, date_from, date_to, search,
        } = req.query as Record<string, string>;

        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const from = (pageNum - 1) * limitNum;
        const to = from + limitNum - 1;

        let query = req.supabase
            .from('activity_logs')
            .select('id, user_id, workspace_id, action, entity_type, entity_id, changes, description, created_at')
            .eq('workspace_id', wid)
            .order('created_at', { ascending: false })
            .range(from, to);

        if (action && action !== 'all') query = query.eq('action', action);
        if (entity_type && entity_type !== 'all') query = query.eq('entity_type', entity_type);
        if (date_from) query = query.gte('created_at', date_from);
        if (date_to) query = query.lte('created_at', date_to + 'T23:59:59.999Z');
        if (search) query = query.ilike('description', `%${search}%`);

        const { data, error } = await query;
        if (error) throw error;

        res.json({
            data: data ?? [],
            hasMore: (data?.length ?? 0) === limitNum,
        });
    } catch (err) { next(err); }
}));

/** POST /api/v1/workspaces/:wid/activity-logs */
router.post('/', h(async (req, res, next) => {
    try {
        const { wid } = req.params;
        const { data, error } = await req.supabase
            .from('activity_logs')
            .insert({
                ...req.body,
                workspace_id: wid,
                user_id: req.user.id,
            })
            .select()
            .single();
        if (error) throw error;
        res.status(201).json(data);
    } catch (err) { next(err); }
}));

export default router;
