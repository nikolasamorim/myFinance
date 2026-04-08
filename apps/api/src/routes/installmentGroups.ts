import { Router, Response, NextFunction, RequestHandler } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router({ mergeParams: true });
router.use(requireAuth as RequestHandler);

type H = (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
const h = (fn: H): RequestHandler =>
    (req, res, next) => fn(req as AuthenticatedRequest, res, next).catch(next) as unknown;

/** GET /api/v1/workspaces/:wid/installment-groups */
router.get('/', h(async (req, res, next) => {
    try {
        const { wid } = req.params;
        const { data, error } = await req.supabase
            .from('installment_groups')
            .select('*')
            .eq('workspace_id', wid)
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data ?? []);
    } catch (err) { next(err); }
}));

/** GET /api/v1/workspaces/:wid/installment-groups/:id */
router.get('/:id', h(async (req, res, next) => {
    try {
        const { wid, id } = req.params;
        const { data, error } = await req.supabase
            .from('installment_groups')
            .select(`
                *,
                transactions:transactions!installment_group_id(*)
            `)
            .eq('workspace_id', wid)
            .eq('id', id)
            .single();
        if (error) throw error;
        if (!data) { res.status(404).json({ error: 'Not found' }); return; }
        res.json(data);
    } catch (err) { next(err); }
}));

/** POST /api/v1/workspaces/:wid/installment-groups */
router.post('/', h(async (req, res, next) => {
    try {
        const { wid } = req.params;
        const { data, error } = await req.supabase
            .from('installment_groups')
            .insert({ ...req.body, workspace_id: wid })
            .select()
            .single();
        if (error) throw error;
        res.status(201).json(data);
    } catch (err) { next(err); }
}));

/** PUT /api/v1/workspaces/:wid/installment-groups/:id */
router.put('/:id', h(async (req, res, next) => {
    try {
        const { wid, id } = req.params;
        const { data, error } = await req.supabase
            .from('installment_groups')
            .update(req.body)
            .eq('workspace_id', wid)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        res.json(data);
    } catch (err) { next(err); }
}));

/** DELETE /api/v1/workspaces/:wid/installment-groups/:id */
router.delete('/:id', h(async (req, res, next) => {
    try {
        const { wid, id } = req.params;
        const { error } = await req.supabase
            .from('installment_groups')
            .delete()
            .eq('workspace_id', wid)
            .eq('id', id);
        if (error) throw error;
        res.status(204).send();
    } catch (err) { next(err); }
}));

export default router;
