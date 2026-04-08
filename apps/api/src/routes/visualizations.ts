import { Router, Response, NextFunction, RequestHandler } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router({ mergeParams: true });
router.use(requireAuth as RequestHandler);

type H = (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
const h = (fn: H): RequestHandler =>
    (req, res, next) => fn(req as AuthenticatedRequest, res, next).catch(next) as unknown;

/** GET /api/v1/workspaces/:wid/visualizations */
router.get('/', h(async (req, res, next) => {
    try {
        const { wid } = req.params;
        const { screen_context } = req.query as Record<string, string>;

        let query = req.supabase
            .from('visualizations')
            .select('*')
            .eq('visualization_workspace_id', wid)
            .eq('visualization_user_id', req.user.id)
            .order('visualization_created_at', { ascending: false });

        if (screen_context) {
            query = query.eq('visualization_screen_context', screen_context);
        }

        const { data, error } = await query;
        if (error) throw error;
        res.json(data ?? []);
    } catch (err) { next(err); }
}));

/** GET /api/v1/workspaces/:wid/visualizations/default */
router.get('/default', h(async (req, res, next) => {
    try {
        const { wid } = req.params;
        const { screen_context } = req.query as Record<string, string>;

        let query = req.supabase
            .from('visualizations')
            .select('*')
            .eq('visualization_workspace_id', wid)
            .eq('visualization_user_id', req.user.id)
            .eq('visualization_is_default', true)
            .limit(1);

        if (screen_context) {
            query = query.eq('visualization_screen_context', screen_context);
        }

        const { data, error } = await query;
        if (error) throw error;
        res.json(data && data.length > 0 ? data[0] : null);
    } catch (err) { next(err); }
}));

/** POST /api/v1/workspaces/:wid/visualizations */
router.post('/', h(async (req, res, next) => {
    try {
        const { wid } = req.params;
        const { data, error } = await req.supabase
            .from('visualizations')
            .insert({
                ...req.body,
                visualization_workspace_id: wid,
                visualization_user_id: req.user.id,
            })
            .select()
            .single();
        if (error) throw error;
        res.status(201).json(data);
    } catch (err) { next(err); }
}));

/** PUT /api/v1/workspaces/:wid/visualizations/:id */
router.put('/:id', h(async (req, res, next) => {
    try {
        const { id } = req.params;
        const { data, error } = await req.supabase
            .from('visualizations')
            .update(req.body)
            .eq('visualization_id', id)
            .eq('visualization_user_id', req.user.id)
            .select()
            .single();
        if (error) throw error;
        res.json(data);
    } catch (err) { next(err); }
}));

/** PUT /api/v1/workspaces/:wid/visualizations/:id/set-default */
router.put('/:id/set-default', h(async (req, res, next) => {
    try {
        const { wid, id } = req.params;
        const { screen_context } = req.body;

        // Remove all defaults for this screen context
        await req.supabase
            .from('visualizations')
            .update({ visualization_is_default: false })
            .eq('visualization_workspace_id', wid)
            .eq('visualization_user_id', req.user.id)
            .eq('visualization_screen_context', screen_context);

        // Set the new default
        const { data, error } = await req.supabase
            .from('visualizations')
            .update({ visualization_is_default: true })
            .eq('visualization_id', id)
            .select()
            .single();
        if (error) throw error;
        res.json(data);
    } catch (err) { next(err); }
}));

/** DELETE /api/v1/workspaces/:wid/visualizations/:id */
router.delete('/:id', h(async (req, res, next) => {
    try {
        const { id } = req.params;
        const { error } = await req.supabase
            .from('visualizations')
            .delete()
            .eq('visualization_id', id)
            .eq('visualization_user_id', req.user.id);
        if (error) throw error;
        res.status(204).send();
    } catch (err) { next(err); }
}));

export default router;
