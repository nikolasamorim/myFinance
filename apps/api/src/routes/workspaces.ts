import { Router, Response, NextFunction, RequestHandler } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
router.use(requireAuth as RequestHandler);

type H = (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
const h = (fn: H): RequestHandler => fn as unknown as RequestHandler;

/** GET /api/v1/workspaces */
router.get('/', h(async (req, res, next) => {
    try {
        const { data, error } = await req.supabase
            .from('workspaces')
            .select('*')
            .eq('workspace_owner_user_id', req.user.id)
            .order('workspace_created_at', { ascending: false });
        if (error) throw error;
        res.json(data ?? []);
    } catch (err) { next(err); }
}));

/** POST /api/v1/workspaces */
router.post('/', h(async (req, res, next) => {
    try {
        const { workspace_name, workspace_type = 'personal' } = req.body;
        if (!workspace_name) {
            res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'workspace_name é obrigatório.' } });
            return;
        }
        const { data, error } = await req.supabase
            .from('workspaces')
            .insert({ workspace_name, workspace_type, workspace_owner_user_id: req.user.id })
            .select()
            .single();
        if (error) throw error;
        res.status(201).json(data);
    } catch (err) { next(err); }
}));

/** PUT /api/v1/workspaces/:id */
router.put('/:id', h(async (req, res, next) => {
    try {
        const { id } = req.params;
        const { workspace_name, workspace_icon } = req.body;
        const { data, error } = await req.supabase
            .from('workspaces')
            .update({ workspace_name, workspace_icon })
            .eq('workspace_id', id)
            .select()
            .single();
        if (error) throw error;
        res.json(data);
    } catch (err) { next(err); }
}));

/** DELETE /api/v1/workspaces/:id */
router.delete('/:id', h(async (req, res, next) => {
    try {
        const { id } = req.params;
        const { error } = await req.supabase.from('workspaces').delete().eq('workspace_id', id);
        if (error) throw error;
        res.status(204).send();
    } catch (err) { next(err); }
}));

export default router;
