import { Router, Response, NextFunction, RequestHandler } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router({ mergeParams: true });
router.use(requireAuth as RequestHandler);

type H = (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
const h = (fn: H): RequestHandler => fn as unknown as RequestHandler;

/** GET /statements?period=YYYY-MM */
router.get('/', h(async (req, res, next) => {
    try {
        const { wid, cardId } = req.params;
        const { period } = req.query as Record<string, string>;

        if (!period) {
            res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'period é obrigatório (YYYY-MM).' } });
            return;
        }

        // Compute statement window
        const { data: windowData, error: windowErr } = await req.supabase.rpc('compute_statement_window', {
            card_id: cardId,
            anchor_date: `${period}-01`,
        });
        if (windowErr) throw windowErr;
        if (!windowData || windowData.length === 0) throw new Error('Failed to compute statement window');

        const window = windowData[0];

        // Ensure statement exists
        const { data: statementId, error: ensureErr } = await req.supabase.rpc('ensure_open_statement', {
            card_id: cardId,
            p_period_start: window.period_start,
        });
        if (ensureErr) throw ensureErr;

        // Fetch the statement
        const { data: statement, error: fetchErr } = await req.supabase
            .from('card_statements')
            .select(`*, credit_card:credit_cards!inner(credit_card_name, credit_card_limit, current_balance, color, icon)`)
            .eq('id', statementId)
            .single();
        if (fetchErr) throw fetchErr;

        // Fetch payments for this statement
        const { data: payments, error: paymentsErr } = await req.supabase
            .from('statement_payments')
            .select('*')
            .eq('card_statement_id', statementId)
            .order('paid_at', { ascending: false });
        if (paymentsErr) throw paymentsErr;

        res.json({ ...statement, payments: payments || [], window });
    } catch (err) { next(err); }
}));

/** GET /statements/:statementId/items?type=&search= */
router.get('/:statementId/items', h(async (req, res, next) => {
    try {
        const { statementId } = req.params;
        const { type, search } = req.query as Record<string, string>;

        let query = req.supabase
            .from('statement_items')
            .select(`*, category:categories(category_name), cost_center:cost_centers(cost_center_name)`)
            .eq('card_statement_id', statementId)
            .order('occurred_at', { ascending: false });

        if (type && type !== 'all') query = query.eq('type', type);
        if (search) query = query.ilike('description', `%${search}%`);

        const { data, error } = await query;
        if (error) throw error;

        res.json(data || []);
    } catch (err) { next(err); }
}));

/** POST /statements/:statementId/close */
router.post('/:statementId/close', h(async (req, res, next) => {
    try {
        const { statementId } = req.params;

        const { error } = await req.supabase.rpc('close_statement', {
            p_statement_id: statementId,
        });
        if (error) throw error;

        res.json({ success: true });
    } catch (err) { next(err); }
}));

/** POST /statements/:statementId/payments */
router.post('/:statementId/payments', h(async (req, res, next) => {
    try {
        const { statementId } = req.params;
        const { amount, paid_at, method } = req.body;

        if (!amount || !paid_at || !method) {
            res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'amount, paid_at e method são obrigatórios.' } });
            return;
        }

        const { error } = await req.supabase.rpc('register_statement_payment', {
            p_statement_id: statementId,
            amount_param: amount,
            paid_at_param: paid_at,
            method_param: method,
        });
        if (error) throw error;

        res.json({ success: true });
    } catch (err) { next(err); }
}));

/** POST /statements/items/:itemId/move-next */
router.post('/items/:itemId/move-next', h(async (req, res, next) => {
    try {
        const { itemId } = req.params;

        const { error } = await req.supabase.rpc('move_item_to_next_cycle', {
            p_item_id: itemId,
        });
        if (error) throw error;

        res.json({ success: true });
    } catch (err) { next(err); }
}));

export default router;
