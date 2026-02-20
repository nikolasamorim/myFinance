import { Router, Response, NextFunction, RequestHandler } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router({ mergeParams: true });
router.use(requireAuth as RequestHandler);

type H = (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
const h = (fn: H): RequestHandler => fn as unknown as RequestHandler;

/** GET /api/v1/workspaces/:wid/categories */
router.get('/', h(async (req, res, next) => {
    try {
        const { wid } = req.params;
        const { search, type } = req.query as Record<string, string>;

        let query = req.supabase
            .from('categories')
            .select(`
        category_id, category_workspace_id, category_name, category_type,
        parent_id, sort_order, color, icon, description,
        category_created_at, category_updated_at,
        parent:categories!parent_id(category_name)
      `)
            .eq('category_workspace_id', wid)
            .order('sort_order', { ascending: true });

        if (search) query = query.ilike('category_name', `%${search}%`);
        if (type && type !== 'all') query = query.eq('category_type', type);

        const { data, error } = await query;
        if (error) throw error;

        const mapped = (data ?? []).map((item: any) => ({
            category_id: item.category_id,
            category_workspace_id: item.category_workspace_id,
            category_name: item.category_name,
            category_type: item.category_type,
            parent_id: item.parent_id,
            sort_order: item.sort_order,
            color: item.color,
            icon: item.icon,
            description: item.description,
            parent_name: item.parent?.category_name ?? null,
            category_created_at: item.category_created_at,
            category_updated_at: item.category_updated_at,
        }));
        res.json(mapped);
    } catch (err) { next(err); }
}));

/** POST /api/v1/workspaces/:wid/categories */
router.post('/', h(async (req, res, next) => {
    try {
        const { wid } = req.params;
        const { title, type, parent_id, color, icon, description, sort_order } = req.body;
        if (!title || !type) {
            res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'title e type são obrigatórios.' } });
            return;
        }
        const { data, error } = await req.supabase
            .from('categories')
            .insert([{ category_workspace_id: wid, category_name: title, category_type: type, parent_id: parent_id ?? null, color, icon, description, sort_order: sort_order ?? 0 }])
            .select().single();
        if (error) throw error;
        res.status(201).json(data);
    } catch (err) { next(err); }
}));

/** PUT /api/v1/workspaces/:wid/categories/order */
router.put('/order', h(async (req, res, next) => {
    try {
        const { wid } = req.params;
        const updates: Array<{ id: string; parent_id: string | null; sort_order: number }> = req.body;
        if (!Array.isArray(updates)) {
            res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Body deve ser um array.' } });
            return;
        }
        const promises = updates.map((u) =>
            req.supabase.from('categories').update({ parent_id: u.parent_id, sort_order: u.sort_order }).eq('category_id', u.id).eq('category_workspace_id', wid)
        );
        const results = await Promise.all(promises);
        const errs = results.filter((r) => r.error);
        if (errs.length > 0) throw errs[0].error;
        res.json({ success: true });
    } catch (err) { next(err); }
}));

/** PUT /api/v1/workspaces/:wid/categories/:id */
router.put('/:id', h(async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, type, parent_id, color, icon, description, sort_order } = req.body;
        const upd: Record<string, unknown> = {};
        if (title !== undefined) upd.category_name = title;
        if (type !== undefined) upd.category_type = type;
        if (parent_id !== undefined) upd.parent_id = parent_id;
        if (color !== undefined) upd.color = color;
        if (icon !== undefined) upd.icon = icon;
        if (description !== undefined) upd.description = description;
        if (sort_order !== undefined) upd.sort_order = sort_order;
        const { data, error } = await req.supabase.from('categories').update(upd).eq('category_id', id).select().single();
        if (error) throw error;
        res.json(data);
    } catch (err) { next(err); }
}));

/** DELETE /api/v1/workspaces/:wid/categories/:id */
router.delete('/:id', h(async (req, res, next) => {
    try {
        const { id } = req.params;
        const { error } = await req.supabase.from('categories').delete().eq('category_id', id);
        if (error) throw error;
        res.status(204).send();
    } catch (err) { next(err); }
}));

export default router;
