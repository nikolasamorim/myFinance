import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { notifyTransactionStatusChange } from '../lib/notificationService';

const router = Router({ mergeParams: true });
router.use(requireAuth as RequestHandler);

type H = (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
const h = (fn: H): RequestHandler => fn as unknown as RequestHandler;

/**
 * GET /api/v1/workspaces/:wid/transactions
 * Query: page, limit, search, type, startDate, endDate, sort, order
 */
router.get('/', h(async (req, res, next) => {
    try {
        const { wid } = req.params;
        const {
            page = '1', limit = '10', search, type,
            startDate, endDate, sort = 'transaction_date', order = 'desc',
            parent_recurrence_rule_id,
        } = req.query as Record<string, string>;

        // Special filter: return all transactions for a recurrence rule (no pagination)
        if (parent_recurrence_rule_id) {
            const { data, error } = await req.supabase
                .from('transactions')
                .select('*')
                .eq('transaction_workspace_id', wid)
                .eq('parent_recurrence_rule_id', parent_recurrence_rule_id)
                .order('transaction_date', { ascending: true })
                .limit(500);
            if (error) throw error;
            res.json({ data: data ?? [], total: data?.length ?? 0, page: 1, limit: 500 });
            return;
        }

        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const from = (pageNum - 1) * limitNum;
        const to = from + limitNum - 1;

        let query = req.supabase
            .from('transactions')
            .select('*', { count: 'exact' })
            .eq('transaction_workspace_id', wid)
            .order(sort, { ascending: order === 'asc' })
            .range(from, to);

        if (search) query = query.ilike('transaction_description', `%${search}%`);
        if (type) query = query.eq('transaction_type', type);
        if (startDate) query = query.gte('transaction_date', startDate);
        if (endDate) query = query.lte('transaction_date', endDate);

        const { data, error, count } = await query;
        if (error) throw error;

        res.json({ data: data ?? [], total: count ?? 0, page: pageNum, limit: limitNum });
    } catch (err) { next(err); }
}));

/** GET /api/v1/workspaces/:wid/transactions/:id */
router.get('/:id', h(async (req, res, next) => {
    try {
        const { wid, id } = req.params;
        const { data, error } = await req.supabase
            .from('transactions')
            .select('*')
            .eq('transaction_workspace_id', wid)
            .eq('transaction_id', id)
            .single();
        if (error) throw error;
        res.json(data);
    } catch (err) { next(err); }
}));

/** POST /api/v1/workspaces/:wid/transactions */
router.post('/', h(async (req, res, next) => {
    try {
        const { wid } = req.params;
        const { data, error } = await req.supabase
            .from('transactions')
            .insert({ ...req.body, transaction_workspace_id: wid })
            .select()
            .single();
        if (error) throw error;
        res.status(201).json(data);
    } catch (err) { next(err); }
}));

/** PUT /api/v1/workspaces/:wid/transactions/:id */
router.put('/:id', h(async (req, res, next) => {
    try {
        const { wid, id } = req.params;
        const { data, error } = await req.supabase
            .from('transactions')
            .update(req.body)
            .eq('transaction_workspace_id', wid)
            .eq('transaction_id', id)
            .select()
            .single();
        if (error) throw error;
        if (req.body.transaction_status !== undefined) {
            notifyTransactionStatusChange(
                req.supabase,
                req.user.id,
                wid,
                id,
                data.transaction_description ?? id,
                req.body.transaction_status
            );
        }
        res.json(data);
    } catch (err) { next(err); }
}));

/** DELETE /api/v1/workspaces/:wid/transactions/:id */
router.delete('/:id', h(async (req, res, next) => {
    try {
        const { wid, id } = req.params;
        const { error } = await req.supabase
            .from('transactions')
            .delete()
            .eq('transaction_workspace_id', wid)
            .eq('transaction_id', id);
        if (error) throw error;
        res.status(204).send();
    } catch (err) { next(err); }
}));

export default router;
