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
const isPaid = (t: any) => t.transaction_status === 'paid' || t.transaction_status === 'received';
const sum = (arr: any[]) => arr.reduce((a: number, t: any) => a + Number(t.transaction_amount || 0), 0);

/** GET /api/v1/workspaces/:wid/dashboard */
router.get('/', h(async (req, res, next) => {
    try {
        const { wid } = req.params;
        const { period, search, startDate, endDate, status, type, accountId, categoryId, costCenterId, creditCardId } = req.query as Record<string, string>;

        let query = req.supabase
            .from('transactions')
            .select(`*, accounts:transaction_bank_id(id,title,color,icon), categories:transaction_category_id(category_id,category_name,color,icon), credit_cards:transaction_card_id(credit_card_id,credit_card_name,color,icon), cost_centers:transaction_cost_center_id(cost_center_id,cost_center_name,color,icon)`)
            .eq('transaction_workspace_id', wid)
            .order('transaction_date', { ascending: false });

        if (search) query = query.ilike('transaction_description', `%${search}%`);
        const { start, end } = getPeriodRange(period, startDate, endDate);
        if (start && end) query = query.gte('transaction_date', start).lte('transaction_date', end);
        if (status) query = query.in('transaction_status', status.split(','));
        if (type) query = query.in('transaction_type', type.split(','));
        if (accountId) query = query.eq('transaction_bank_id', accountId);
        if (categoryId) query = query.eq('transaction_category_id', categoryId);
        if (costCenterId) query = query.eq('transaction_cost_center_id', costCenterId);
        if (creditCardId) query = query.eq('transaction_card_id', creditCardId);

        const { data: transactions, error } = await query;
        if (error) throw error;

        const all = (transactions ?? []).map((t: any) => ({
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

        const paid = all.filter(isPaid);
        const unpaid = all.filter((t: any) => !isPaid(t));

        const paidIncome = sum(paid.filter((t: any) => t.transaction_type === 'income'));
        const paidExpenses = sum(paid.filter((t: any) => t.transaction_type === 'expense'));
        const paidInvested = sum(paid.filter((t: any) => t.transaction_type === 'investment' || t.transaction_type === 'debt'));
        const unpaidIncome = sum(unpaid.filter((t: any) => t.transaction_type === 'income'));
        const unpaidExpenses = sum(unpaid.filter((t: any) => t.transaction_type === 'expense'));
        const unpaidInvested = sum(unpaid.filter((t: any) => t.transaction_type === 'investment' || t.transaction_type === 'debt'));

        const monthlyBreakdown: Record<string, any> = {};
        for (const t of all) {
            const k = monthKey(new Date(t.transaction_date));
            if (!monthlyBreakdown[k]) monthlyBreakdown[k] = { income: 0, expense: 0, debtIn: 0, debtOut: 0 };
            const amt = Number(t.transaction_amount);
            if (t.transaction_type === 'income') monthlyBreakdown[k].income += amt;
            else if (t.transaction_type === 'expense') monthlyBreakdown[k].expense += amt;
        }

        const now = new Date();
        const monthlyComparison = Array.from({ length: 12 }, (_, i) => {
            const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
            const k = monthKey(d);
            const m = monthlyBreakdown[k] ?? { income: 0, expense: 0 };
            return { month: d.toLocaleDateString('pt-BR', { month: 'short' }), income: m.income, expenses: m.expense };
        });

        res.json({
            paidSummary: { currentBalance: paidIncome - paidExpenses, totalIncome: paidIncome, totalExpenses: paidExpenses, totalDebts: paidInvested },
            summary: {
                balancePaid: paidIncome - paidExpenses,
                income: { paid: paidIncome, unpaid: unpaidIncome },
                expenses: { paid: paidExpenses, unpaid: unpaidExpenses },
                invested: { paid: paidInvested, unpaid: unpaidInvested },
            },
            monthlyBreakdown,
            monthlyComparison,
            recentTransactions: all.slice(0, 50),
        });
    } catch (err) { next(err); }
}));

export default router;
