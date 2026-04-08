import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { notifyTransactionStatusChange } from '../lib/notificationService';

const router = Router({ mergeParams: true });
router.use(requireAuth as RequestHandler);

type H = (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
const h = (fn: H): RequestHandler =>
    (req, res, next) => fn(req as AuthenticatedRequest, res, next).catch(next) as unknown;

/**
 * GET /api/v1/workspaces/:wid/transactions
 * Query: page, limit, search, type, startDate, endDate, sort, order,
 *        status, category_id, cost_center_id, credit_card_id, account_id,
 *        amount_min, amount_max, no_category, no_account, description_like,
 *        has_recurrence (true = not null), recurrence_date_start, recurrence_date_end,
 *        installment_group_id, select_fields, parent_recurrence_rule_id, noPagination
 */
router.get('/', h(async (req, res, next) => {
    try {
        const { wid } = req.params;
        const {
            page = '1', limit = '10', search, type,
            startDate, endDate, sort = 'transaction_date', order = 'desc',
            parent_recurrence_rule_id, noPagination,
            status, category_id, cost_center_id, credit_card_id, account_id,
            amount_min, amount_max, no_category, no_account, description_like,
            has_recurrence, recurrence_date_start, recurrence_date_end,
            installment_group_id, select_fields,
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

        // Determine select fields (supports joins via PostgREST syntax)
        const selectExpr = select_fields || '*';
        const shouldPaginate = noPagination !== 'true';

        let query = shouldPaginate
            ? req.supabase
                  .from('transactions')
                  .select(selectExpr, { count: 'exact' })
                  .eq('transaction_workspace_id', wid)
                  .order(sort, { ascending: order === 'asc' })
            : req.supabase
                  .from('transactions')
                  .select(selectExpr)
                  .eq('transaction_workspace_id', wid)
                  .order(sort, { ascending: order === 'asc' });

        // Text filters
        if (search) query = query.ilike('transaction_description', `%${search}%`);
        if (description_like) query = query.ilike('transaction_description', `%${description_like}%`);

        // Type & status
        if (type) query = query.eq('transaction_type', type);
        if (status) {
            const statuses = status.split(',');
            query = statuses.length === 1
                ? query.eq('transaction_status', statuses[0])
                : query.in('transaction_status', statuses);
        }

        // Date range
        if (startDate) query = query.gte('transaction_date', startDate);
        if (endDate) query = query.lte('transaction_date', endDate);

        // Relation filters
        if (category_id) query = query.eq('transaction_category_id', category_id);
        if (cost_center_id) query = query.eq('transaction_cost_center_id', cost_center_id);
        if (credit_card_id) query = query.eq('transaction_card_id', credit_card_id);
        if (account_id) query = query.eq('transaction_bank_id', account_id);
        if (installment_group_id) query = query.eq('installment_group_id', installment_group_id);

        // Amount range
        if (amount_min) { const v = parseFloat(amount_min); if (!isNaN(v)) query = query.gte('transaction_amount', v); }
        if (amount_max) { const v = parseFloat(amount_max); if (!isNaN(v)) query = query.lte('transaction_amount', v); }

        // Null filters
        if (no_category === 'true') query = query.is('transaction_category_id', null);
        if (no_account === 'true') query = query.is('transaction_bank_id', null);

        // Recurrence filters
        if (has_recurrence === 'true') query = query.not('parent_recurrence_rule_id', 'is', null);
        if (recurrence_date_start) query = query.gte('recurrence_instance_date', recurrence_date_start);
        if (recurrence_date_end) query = query.lte('recurrence_instance_date', recurrence_date_end);

        if (shouldPaginate) {
            const pageNum = parseInt(page, 10);
            const limitNum = parseInt(limit, 10);
            const from = (pageNum - 1) * limitNum;
            const to = from + limitNum - 1;
            query = query.range(from, to);

            const { data, error, count } = await query;
            if (error) throw error;
            res.json({ data: data ?? [], total: count ?? 0, page: pageNum, limit: limitNum });
        } else {
            const { data, error } = await query;
            if (error) throw error;
            res.json({ data: data ?? [], total: data?.length ?? 0 });
        }
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
        const body = req.body;

        // Support batch insert when body is an array
        if (Array.isArray(body)) {
            const rows = body.map(row => ({ ...row, transaction_workspace_id: wid }));
            const { data, error } = await req.supabase
                .from('transactions')
                .insert(rows)
                .select();
            if (error) throw error;
            res.status(201).json(data);
        } else {
            const { data, error } = await req.supabase
                .from('transactions')
                .insert({ ...body, transaction_workspace_id: wid })
                .select()
                .single();
            if (error) throw error;
            res.status(201).json(data);
        }
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
