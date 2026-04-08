import { Router, Response, NextFunction, RequestHandler } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router({ mergeParams: true });
router.use(requireAuth as RequestHandler);

type H = (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
const h = (fn: H): RequestHandler =>
    (req, res, next) => fn(req as AuthenticatedRequest, res, next).catch(next) as unknown;

/** POST /api/v1/workspaces/:wid/migrations/preview */
router.post('/preview', h(async (req, res, next) => {
    try {
        const { wid } = req.params;
        const { target_workspace_id } = req.body;

        const { data, error } = await req.supabase.rpc('preview_workspace_migration', {
            p_source_workspace_id: wid,
            p_target_workspace_id: target_workspace_id,
            p_user_id: req.user.id,
        });

        if (error) throw error;
        res.json(data);
    } catch (err) { next(err); }
}));

/** POST /api/v1/workspaces/:wid/migrations/execute */
router.post('/execute', h(async (req, res, next) => {
    try {
        const { wid } = req.params;
        const {
            account_ids,
            target_workspace_id,
            migrate_transactions = true,
            migrate_installments = true,
        } = req.body;

        const { data, error } = await req.supabase.rpc('migrate_accounts_to_workspace', {
            p_account_ids: account_ids,
            p_source_workspace_id: wid,
            p_target_workspace_id: target_workspace_id,
            p_user_id: req.user.id,
            p_migrate_transactions: migrate_transactions,
            p_migrate_installments: migrate_installments,
        });

        if (error) throw error;
        res.json(data);
    } catch (err) { next(err); }
}));

/** POST /api/v1/workspaces/:wid/migrations/execute-all */
router.post('/execute-all', h(async (req, res, next) => {
    try {
        const { wid } = req.params;
        const {
            target_workspace_id,
            migrate_transactions = true,
            migrate_installments = true,
            migrate_categories = false,
            migrate_cost_centers = false,
        } = req.body;

        const { data, error } = await req.supabase.rpc('migrate_all_accounts_to_workspace', {
            p_source_workspace_id: wid,
            p_target_workspace_id: target_workspace_id,
            p_user_id: req.user.id,
            p_migrate_transactions: migrate_transactions,
            p_migrate_installments: migrate_installments,
            p_migrate_categories: migrate_categories,
            p_migrate_cost_centers: migrate_cost_centers,
        });

        if (error) throw error;
        res.json(data);
    } catch (err) { next(err); }
}));

/** GET /api/v1/workspaces/:wid/migrations/summary */
router.get('/summary', h(async (req, res, next) => {
    try {
        const { wid } = req.params;

        const [accountsData, transactionsData, categoriesData, costCentersData] = await Promise.all([
            req.supabase.from('accounts').select('id', { count: 'exact', head: true }).eq('workspace_id', wid),
            req.supabase.from('transactions').select('transaction_id', { count: 'exact', head: true }).eq('transaction_workspace_id', wid),
            req.supabase.from('categories').select('category_id', { count: 'exact', head: true }).eq('category_workspace_id', wid),
            req.supabase.from('cost_centers').select('cost_center_id', { count: 'exact', head: true }).eq('cost_center_workspace_id', wid),
        ]);

        res.json({
            accountsCount: accountsData.count || 0,
            transactionsCount: transactionsData.count || 0,
            categoriesCount: categoriesData.count || 0,
            costCentersCount: costCentersData.count || 0,
        });
    } catch (err) { next(err); }
}));

/** GET /api/v1/workspaces/:wid/migrations/accounts */
router.get('/accounts', h(async (req, res, next) => {
    try {
        const { wid } = req.params;
        const { data, error } = await req.supabase
            .from('accounts')
            .select('id, title, type, initial_balance, workspace_id')
            .eq('workspace_id', wid)
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data ?? []);
    } catch (err) { next(err); }
}));

export default router;
