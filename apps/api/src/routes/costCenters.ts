import { Router, Response, NextFunction, RequestHandler } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router({ mergeParams: true });
router.use(requireAuth as RequestHandler);

type H = (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
const h = (fn: H): RequestHandler => fn as unknown as RequestHandler;

/** GET /api/v1/workspaces/:wid/cost-centers */
router.get('/', h(async (req, res, next) => {
    try {
        const { wid } = req.params;
        const { search } = req.query as Record<string, string>;

        let query = req.supabase
            .from('cost_centers')
            .select(`cost_center_id, cost_center_workspace_id, cost_center_name, type, parent_id, sort_order, status, code, accounting_code, color, icon, description, cost_center_created_at, cost_center_updated_at, parent:cost_centers!parent_id(cost_center_name)`)
            .eq('cost_center_workspace_id', wid)
            .order('sort_order', { ascending: true });

        if (search) query = query.ilike('cost_center_name', `%${search}%`);

        const { data, error } = await query;
        if (error) throw error;

        const mapped = (data ?? []).map((item: any) => ({
            id: item.cost_center_id,
            workspace_id: item.cost_center_workspace_id,
            title: item.cost_center_name,
            type: item.type,
            code: item.code,
            parent_id: item.parent_id,
            parent_name: item.parent?.cost_center_name ?? null,
            accounting_code: item.accounting_code,
            status: item.status ?? 'active',
            color: item.color,
            icon: item.icon,
            description: item.description,
            created_at: item.cost_center_created_at,
            updated_at: item.cost_center_updated_at,
        }));
        res.json(mapped);
    } catch (err) { next(err); }
}));

/** POST /api/v1/workspaces/:wid/cost-centers */
router.post('/', h(async (req, res, next) => {
    try {
        const { wid } = req.params;
        const { title, type, code, parent_id, accounting_code, status, color, icon, description, sort_order } = req.body;
        if (!title || !type) {
            res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'title e type são obrigatórios.' } });
            return;
        }
        const { data, error } = await req.supabase
            .from('cost_centers')
            .insert([{ cost_center_workspace_id: wid, cost_center_name: title, type, code, parent_id: parent_id ?? null, accounting_code, status: status ?? 'active', color, icon, description, sort_order: sort_order ?? 0 }])
            .select().single();
        if (error) throw error;
        res.status(201).json(data);
    } catch (err) { next(err); }
}));

/** PUT /api/v1/workspaces/:wid/cost-centers/order */
router.put('/order', h(async (req, res, next) => {
    try {
        const { wid } = req.params;
        const updates: Array<{ id: string; parent_id: string | null; sort_order: number }> = req.body;
        if (!Array.isArray(updates)) {
            res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Body deve ser um array.' } });
            return;
        }
        const promises = updates.map((u) =>
            req.supabase.from('cost_centers').update({ parent_id: u.parent_id, sort_order: u.sort_order }).eq('cost_center_id', u.id).eq('cost_center_workspace_id', wid)
        );
        const results = await Promise.all(promises);
        const errs = results.filter((r) => r.error);
        if (errs.length > 0) throw errs[0].error;
        res.json({ success: true });
    } catch (err) { next(err); }
}));

/** PUT /api/v1/workspaces/:wid/cost-centers/:id */
router.put('/:id', h(async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, type, code, parent_id, accounting_code, status, color, icon, description, sort_order } = req.body;
        const upd: Record<string, unknown> = {};
        if (title !== undefined) upd.cost_center_name = title;
        if (type !== undefined) upd.type = type;
        if (code !== undefined) upd.code = code;
        if (parent_id !== undefined) upd.parent_id = parent_id;
        if (accounting_code !== undefined) upd.accounting_code = accounting_code;
        if (status !== undefined) upd.status = status;
        if (color !== undefined) upd.color = color;
        if (icon !== undefined) upd.icon = icon;
        if (description !== undefined) upd.description = description;
        if (sort_order !== undefined) upd.sort_order = sort_order;
        const { data, error } = await req.supabase.from('cost_centers').update(upd).eq('cost_center_id', id).select().single();
        if (error) throw error;
        res.json(data);
    } catch (err) { next(err); }
}));

/** DELETE /api/v1/workspaces/:wid/cost-centers/:id */
router.delete('/:id', h(async (req, res, next) => {
    try {
        const { id } = req.params;
        const { error } = await req.supabase.from('cost_centers').delete().eq('cost_center_id', id);
        if (error) throw error;
        res.status(204).send();
    } catch (err) { next(err); }
}));

export default router;
