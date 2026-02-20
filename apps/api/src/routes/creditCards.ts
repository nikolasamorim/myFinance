import { Router, Response, NextFunction, RequestHandler } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router({ mergeParams: true });
router.use(requireAuth as RequestHandler);

type H = (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
const h = (fn: H): RequestHandler => fn as unknown as RequestHandler;

/** GET /api/v1/workspaces/:wid/credit-cards */
router.get('/', h(async (req, res, next) => {
    try {
        const { wid } = req.params;
        const { search } = req.query as Record<string, string>;

        let query = req.supabase
            .from('credit_cards')
            .select(`credit_card_id, credit_card_workspace_id, credit_card_name, credit_card_limit, current_balance, credit_card_closing_day, credit_card_due_day, color, icon, credit_card_created_at, credit_card_updated_at`)
            .eq('credit_card_workspace_id', wid)
            .order('credit_card_created_at', { ascending: false });

        if (search) query = query.ilike('credit_card_name', `%${search}%`);

        const { data, error } = await query;
        if (error) throw error;

        const mapped = (data ?? []).map((card: any) => ({
            id: card.credit_card_id,
            workspace_id: card.credit_card_workspace_id,
            title: card.credit_card_name,
            flag: 'Visa',
            limit: card.credit_card_limit,
            initial_balance: card.current_balance ?? 0,
            due_day: card.credit_card_due_day,
            closing_day: card.credit_card_closing_day,
            color: card.color,
            icon: card.icon,
            created_at: card.credit_card_created_at,
            updated_at: card.credit_card_updated_at,
        }));
        res.json(mapped);
    } catch (err) { next(err); }
}));

/** POST /api/v1/workspaces/:wid/credit-cards */
router.post('/', h(async (req, res, next) => {
    try {
        const { wid } = req.params;
        const { title, limit, initial_balance, due_day, closing_day, color, icon } = req.body;
        if (!title) {
            res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'title é obrigatório.' } });
            return;
        }
        const { data, error } = await req.supabase
            .from('credit_cards')
            .insert([{ credit_card_workspace_id: wid, credit_card_name: title, credit_card_limit: limit, current_balance: initial_balance ?? 0, credit_card_due_day: due_day, credit_card_closing_day: closing_day, color, icon }])
            .select().single();
        if (error) throw error;
        res.status(201).json(data);
    } catch (err) { next(err); }
}));

/** PUT /api/v1/workspaces/:wid/credit-cards/:id */
router.put('/:id', h(async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, limit, initial_balance, due_day, closing_day, color, icon } = req.body;
        const upd: Record<string, unknown> = {};
        if (title !== undefined) upd.credit_card_name = title;
        if (limit !== undefined) upd.credit_card_limit = limit;
        if (initial_balance !== undefined) upd.current_balance = initial_balance;
        if (due_day !== undefined) upd.credit_card_due_day = due_day;
        if (closing_day !== undefined) upd.credit_card_closing_day = closing_day;
        if (color !== undefined) upd.color = color;
        if (icon !== undefined) upd.icon = icon;
        const { data, error } = await req.supabase.from('credit_cards').update(upd).eq('credit_card_id', id).select().single();
        if (error) throw error;
        res.json(data);
    } catch (err) { next(err); }
}));

/** DELETE /api/v1/workspaces/:wid/credit-cards/:id */
router.delete('/:id', h(async (req, res, next) => {
    try {
        const { id } = req.params;
        const { error } = await req.supabase.from('credit_cards').delete().eq('credit_card_id', id);
        if (error) throw error;
        res.status(204).send();
    } catch (err) { next(err); }
}));

export default router;
