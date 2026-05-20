import { Router, Response, NextFunction, RequestHandler } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router({ mergeParams: true });
router.use(requireAuth as RequestHandler);

type H = (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
const h = (fn: H): RequestHandler =>
    (req, res, next) => fn(req as AuthenticatedRequest, res, next).catch(next) as unknown;

const toISODate = (d: Date) => d.toISOString().split('T')[0];

function getPeriodRange(period?: string, customStart?: string, customEnd?: string) {
    if (!period || period === 'all') return {};
    if (period === 'custom') return (customStart && customEnd) ? { start: customStart, end: customEnd } : {};
    const now = new Date();
    let s: Date, e: Date;
    switch (period) {
        case 'current_month': s = new Date(now.getFullYear(), now.getMonth(), 1); e = new Date(now.getFullYear(), now.getMonth() + 1, 0); break;
        case 'last_month': s = new Date(now.getFullYear(), now.getMonth() - 1, 1); e = new Date(now.getFullYear(), now.getMonth(), 0); break;
        case 'current_year': s = new Date(now.getFullYear(), 0, 1); e = new Date(now.getFullYear(), 11, 31); break;
        default: return {};
    }
    return { start: toISODate(s), end: toISODate(e) };
}

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const TX_SELECT = `*, accounts:transaction_bank_id(id,title,color,icon), categories:transaction_category_id(category_id,category_name,color,icon), credit_cards:transaction_card_id(credit_card_id,credit_card_name,color,icon), cost_centers:transaction_cost_center_id(cost_center_id,cost_center_name,color,icon)`;

/** GET /api/v1/workspaces/:wid/dashboard */
router.get('/', h(async (req, res, next) => {
    try {
        const { wid } = req.params;
        const { period, search, startDate, endDate, status, type, accountId, categoryId, costCenterId, creditCardId } = req.query as Record<string, string>;

        const { start, end } = getPeriodRange(period, startDate, endDate);
        const statusArr = status ? status.split(',') : null;
        const typeArr = type ? type.split(',') : null;

        // ─── Agregações no banco (não puxa todas as linhas) ───────────────────────
        const { data: summaryData, error: rpcError } = await req.supabase.rpc('dashboard_summary', {
            p_workspace_id: wid,
            p_start: start ?? null,
            p_end: end ?? null,
            p_search: search ?? null,
            p_status: statusArr,
            p_type: typeArr,
            p_account: accountId ?? null,
            p_category: categoryId ?? null,
            p_cost_center: costCenterId ?? null,
            p_credit_card: creditCardId ?? null,
        });
        if (rpcError) throw rpcError;

        const summary = summaryData?.summary ?? {
            balancePaid: 0,
            income: { paid: 0, unpaid: 0 },
            expenses: { paid: 0, unpaid: 0 },
            invested: { paid: 0, unpaid: 0 },
        };
        const paidSummary = summaryData?.paidSummary ?? { currentBalance: 0, totalIncome: 0, totalExpenses: 0, totalDebts: 0 };
        const monthlyBreakdown: Record<string, any> = summaryData?.monthlyBreakdown ?? {};

        // ─── Transações recentes (limitadas a 50, com joins) — mesmos filtros ─────
        let q = req.supabase
            .from('transactions')
            .select(TX_SELECT)
            .eq('transaction_workspace_id', wid)
            .order('transaction_date', { ascending: false })
            .limit(50);

        if (search) q = q.ilike('transaction_description', `%${search}%`);
        if (start && end) q = q.gte('transaction_date', start).lte('transaction_date', end);
        if (statusArr) q = q.in('transaction_status', statusArr);
        if (typeArr) q = q.in('transaction_type', typeArr);
        if (accountId) q = q.eq('transaction_bank_id', accountId);
        if (categoryId) q = q.eq('transaction_category_id', categoryId);
        if (costCenterId) q = q.eq('transaction_cost_center_id', costCenterId);
        if (creditCardId) q = q.eq('transaction_card_id', creditCardId);

        const { data: recent, error: recentError } = await q;
        if (recentError) throw recentError;

        const recentTransactions = (recent ?? []).map((t: any) => ({
            ...t,
            transaction_account: t.accounts?.title ?? null,
            transaction_account_color: t.accounts?.color ?? null,
            transaction_account_icon: t.accounts?.icon ?? null,
            transaction_category_name: t.categories?.category_name ?? null,
            transaction_category_color: t.categories?.color ?? null,
            transaction_category_icon: t.categories?.icon ?? null,
            transaction_card_name: t.credit_cards?.credit_card_name ?? null,
            transaction_card_color: t.credit_cards?.color ?? null,
            transaction_card_icon: t.credit_cards?.icon ?? null,
            transaction_cost_center_name: t.cost_centers?.cost_center_name ?? null,
            transaction_cost_center_color: t.cost_centers?.color ?? null,
            transaction_cost_center_icon: t.cost_centers?.icon ?? null,
        }));

        // ─── monthlyComparison: últimos 12 meses derivados do monthlyBreakdown ────
        const now = new Date();
        const monthlyComparison = Array.from({ length: 12 }, (_, i) => {
            const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
            const k = monthKey(d);
            const m = monthlyBreakdown[k] ?? { income: 0, expense: 0 };
            return { month: d.toLocaleDateString('pt-BR', { month: 'short' }), income: m.income, expenses: m.expense };
        });

        res.json({
            paidSummary,
            summary,
            monthlyBreakdown,
            monthlyComparison,
            recentTransactions,
        });
    } catch (err) { next(err); }
}));

export default router;
