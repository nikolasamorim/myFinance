import { Router, Response, NextFunction, RequestHandler } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { notifyInvoiceClosing } from '../lib/notificationService';

const router = Router({ mergeParams: true });
router.use(requireAuth as RequestHandler);

type H = (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
const h = (fn: H): RequestHandler =>
    (req, res, next) => fn(req as AuthenticatedRequest, res, next).catch(next) as unknown;

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

        // G03: read-only — busca uma fatura existente; nunca cria na leitura.
        const { data: statement, error: fetchErr } = await req.supabase
            .from('card_statements')
            .select(`*, credit_card:credit_cards!inner(credit_card_name, credit_card_limit, current_balance, color, icon)`)
            .eq('credit_card_id', cardId)
            .eq('period_start', window.period_start)
            .maybeSingle();
        if (fetchErr) throw fetchErr;

        if (!statement) {
            // Sem lançamentos ainda para esta janela → fatura sintética (não persistida).
            const { data: card, error: cardErr } = await req.supabase
                .from('credit_cards')
                .select('credit_card_name, credit_card_limit, current_balance, color, icon')
                .eq('credit_card_id', cardId)
                .maybeSingle();
            if (cardErr) throw cardErr;

            res.json({
                id: null,
                workspace_id: wid,
                credit_card_id: cardId,
                period_start: window.period_start,
                period_end: window.period_end,
                due_date: window.due_date,
                statement_amount: 0,
                total_paid: 0,
                min_payment_amount: 0,
                carry_forward_amount: 0,
                status: 'open',
                is_overdue: false,
                credit_card: card,
                payments: [],
                window,
            });
            return;
        }

        // Pagamentos da fatura existente
        const { data: payments, error: paymentsErr } = await req.supabase
            .from('statement_payments')
            .select('*')
            .eq('card_statement_id', statement.id)
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
        const { wid, cardId, statementId } = req.params;

        const { error } = await req.supabase.rpc('close_statement', {
            p_statement_id: statementId,
        });
        if (error) throw error;

        // Fire-and-forget: fetch statement + card info for the notification
        Promise.resolve(
            req.supabase
                .from('card_statements')
                .select('due_date, total_paid, credit_cards(credit_card_name)')
                .eq('id', statementId)
                .maybeSingle()
        ).then(({ data: stmt }) => {
            if (!stmt) return;
            const cardName = (stmt.credit_cards as any)?.credit_card_name ?? cardId;
            notifyInvoiceClosing(
                req.supabase,
                req.user.id,
                wid,
                cardId,
                cardName,
                stmt.due_date,
                stmt.total_paid ?? 0
            );
        }).catch(() => {});

        res.json({ success: true });
    } catch (err) { next(err); }
}));

/** POST /statements/:statementId/payments */
router.post('/:statementId/payments', h(async (req, res, next) => {
    try {
        const { statementId } = req.params;
        const { amount, paid_at, method } = req.body;

        const amountNum = Number(amount);
        const allowedMethods = ['pix', 'boleto', 'ted', 'dda'];
        if (!Number.isFinite(amountNum) || amountNum <= 0) {
            res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'amount deve ser um número positivo.' } });
            return;
        }
        if (!paid_at || Number.isNaN(Date.parse(paid_at))) {
            res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'paid_at deve ser uma data válida (YYYY-MM-DD).' } });
            return;
        }
        if (!method || !allowedMethods.includes(method)) {
            res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'method inválido. Use: pix, boleto, ted ou dda.' } });
            return;
        }

        const { error } = await req.supabase.rpc('register_statement_payment', {
            p_statement_id: statementId,
            amount_param: amountNum,
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
