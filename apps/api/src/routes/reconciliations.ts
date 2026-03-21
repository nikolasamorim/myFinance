import { Router, Response, NextFunction, RequestHandler } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router({ mergeParams: true });
router.use(requireAuth as RequestHandler);

type H = (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
const h = (fn: H): RequestHandler => fn as unknown as RequestHandler;

// ─── GET /imported ─────────────────────────────────────────────────────────────
// Lista transações importadas com seu status de conciliação.
// status: 'pending' | 'reconciled' | 'ignored'

router.get('/imported', h(async (req, res, next) => {
    try {
        const { wid } = req.params;
        const { account_id, start_date, end_date, status } = req.query as Record<string, string>;

        let query = req.supabase
            .from('transactions')
            .select('*')
            .eq('transaction_workspace_id', wid)
            .eq('transaction_origin', 'import')
            .order('transaction_date', { ascending: false });

        if (account_id) query = query.eq('transaction_bank_id', account_id);
        if (start_date) query = query.gte('transaction_date', start_date);
        if (end_date) query = query.lte('transaction_date', end_date);
        if (status === 'ignored') query = query.eq('reconciliation_ignored', true);
        if (status === 'pending') query = query.eq('reconciliation_ignored', false);

        const { data: transactions, error } = await query;
        if (error) throw error;

        const txList = transactions ?? [];
        if (txList.length === 0) {
            res.json({ data: [] });
            return;
        }

        // Busca as conciliações existentes para essas transações
        const ids = txList.map((t: any) => t.transaction_id);
        const { data: recs, error: recError } = await req.supabase
            .from('bank_reconciliations')
            .select('*')
            .in('imported_transaction_id', ids);
        if (recError) throw recError;

        const recMap = new Map((recs ?? []).map((r: any) => [r.imported_transaction_id, r]));

        let result = txList.map((t: any) => ({
            transaction: t,
            reconciliation: recMap.get(t.transaction_id) ?? null,
        }));

        // Filtra por status após join
        if (status === 'pending') {
            result = result.filter((r: any) => !r.reconciliation && !r.transaction.reconciliation_ignored);
        } else if (status === 'reconciled') {
            result = result.filter((r: any) => !!r.reconciliation);
        } else if (status === 'ignored') {
            result = result.filter((r: any) => r.transaction.reconciliation_ignored && !r.reconciliation);
        }

        res.json({ data: result });
    } catch (err) { next(err); }
}));

// ─── GET / ─────────────────────────────────────────────────────────────────────
// Lista pares conciliados (aba Conciliados)

router.get('/', h(async (req, res, next) => {
    try {
        const { wid } = req.params;
        const { account_id, start_date, end_date } = req.query as Record<string, string>;

        const { data: recs, error } = await req.supabase
            .from('bank_reconciliations')
            .select('*')
            .eq('workspace_id', wid)
            .order('reconciled_at', { ascending: false });
        if (error) throw error;

        const recList = recs ?? [];
        if (recList.length === 0) {
            res.json({ data: [] });
            return;
        }

        const importedIds = recList.map((r: any) => r.imported_transaction_id);
        const systemIds = recList.map((r: any) => r.system_transaction_id);
        const allIds = [...new Set([...importedIds, ...systemIds])];

        let txQuery = req.supabase
            .from('transactions')
            .select('*')
            .in('transaction_id', allIds);
        if (account_id) txQuery = txQuery.eq('transaction_bank_id', account_id);
        if (start_date) txQuery = txQuery.gte('transaction_date', start_date);
        if (end_date) txQuery = txQuery.lte('transaction_date', end_date);

        const { data: txs, error: txError } = await txQuery;
        if (txError) throw txError;

        const txMap = new Map((txs ?? []).map((t: any) => [t.transaction_id, t]));

        const result = recList
            .map((r: any) => ({
                reconciliation: r,
                imported: txMap.get(r.imported_transaction_id) ?? null,
                system: txMap.get(r.system_transaction_id) ?? null,
            }))
            .filter((r: any) => r.imported && r.system);

        res.json({ data: result });
    } catch (err) { next(err); }
}));

// ─── GET /suggestions/:importedId ─────────────────────────────────────────────
// Sugestões automáticas de lançamentos do sistema para conciliar com o importado

router.get('/suggestions/:importedId', h(async (req, res, next) => {
    try {
        const { wid, importedId } = req.params;

        // Busca a transação importada
        const { data: imported, error: impErr } = await req.supabase
            .from('transactions')
            .select('*')
            .eq('transaction_id', importedId)
            .eq('transaction_workspace_id', wid)
            .single();
        if (impErr) throw impErr;

        const importedAmount: number = imported.transaction_amount;
        const importedDate = new Date(imported.transaction_date);
        const importedAccountId: string | null = imported.transaction_bank_id;

        // IDs já conciliados (para excluir)
        const { data: existingRecs } = await req.supabase
            .from('bank_reconciliations')
            .select('system_transaction_id')
            .eq('workspace_id', wid);
        const usedSystemIds = new Set((existingRecs ?? []).map((r: any) => r.system_transaction_id));

        // Janela de ±7 dias
        const windowStart = new Date(importedDate);
        windowStart.setDate(windowStart.getDate() - 7);
        const windowEnd = new Date(importedDate);
        windowEnd.setDate(windowEnd.getDate() + 7);

        const { data: candidates, error: candErr } = await req.supabase
            .from('transactions')
            .select('*')
            .eq('transaction_workspace_id', wid)
            .neq('transaction_origin', 'import')
            .gte('transaction_date', windowStart.toISOString().split('T')[0])
            .lte('transaction_date', windowEnd.toISOString().split('T')[0])
            .limit(100);
        if (candErr) throw candErr;

        const scored = (candidates ?? [])
            .filter((c: any) => !usedSystemIds.has(c.transaction_id) && c.transaction_id !== importedId)
            .map((c: any) => {
                const candDate = new Date(c.transaction_date);
                const dateDiffDays = Math.abs((candDate.getTime() - importedDate.getTime()) / 86400000);
                const dateScore = Math.max(0, 100 - dateDiffDays * 10);

                const amountDiff = Math.abs(c.transaction_amount - importedAmount);
                const amountScore = importedAmount > 0
                    ? Math.max(0, 100 - (amountDiff / importedAmount) * 100)
                    : (amountDiff === 0 ? 100 : 0);

                const accountScore = importedAccountId && c.transaction_bank_id === importedAccountId ? 20 : 0;

                const score = Math.round(amountScore * 0.6 + dateScore * 0.3 + accountScore * 0.1);
                return { transaction: c, score };
            })
            .filter((s: any) => s.score >= 30)
            .sort((a: any, b: any) => b.score - a.score)
            .slice(0, 5);

        res.json({ data: scored });
    } catch (err) { next(err); }
}));

// ─── GET /candidates ──────────────────────────────────────────────────────────
// Busca lançamentos do sistema para o modal de seleção manual

router.get('/candidates', h(async (req, res, next) => {
    try {
        const { wid } = req.params;
        const {
            search, account_id, start_date, end_date,
            page = '1', limit = '20',
        } = req.query as Record<string, string>;

        // IDs já conciliados para excluir
        const { data: existingRecs } = await req.supabase
            .from('bank_reconciliations')
            .select('system_transaction_id')
            .eq('workspace_id', wid);
        const usedSystemIds = (existingRecs ?? []).map((r: any) => r.system_transaction_id);

        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const from = (pageNum - 1) * limitNum;
        const to = from + limitNum - 1;

        let query = req.supabase
            .from('transactions')
            .select('*', { count: 'exact' })
            .eq('transaction_workspace_id', wid)
            .neq('transaction_origin', 'import')
            .order('transaction_date', { ascending: false })
            .range(from, to);

        if (search) query = query.ilike('transaction_description', `%${search}%`);
        if (account_id) query = query.eq('transaction_bank_id', account_id);
        if (start_date) query = query.gte('transaction_date', start_date);
        if (end_date) query = query.lte('transaction_date', end_date);
        if (usedSystemIds.length > 0) query = query.not('transaction_id', 'in', `(${usedSystemIds.join(',')})`);

        const { data, error, count } = await query;
        if (error) throw error;

        res.json({ data: data ?? [], total: count ?? 0, page: pageNum, limit: limitNum });
    } catch (err) { next(err); }
}));

// ─── GET /summary ─────────────────────────────────────────────────────────────
// Retorna contagem de conciliações pendentes por conta bancária

router.get('/summary', h(async (req, res, next) => {
    try {
        const { wid } = req.params;

        const { data: transactions, error } = await req.supabase
            .from('transactions')
            .select('transaction_id, transaction_bank_id')
            .eq('transaction_workspace_id', wid)
            .eq('transaction_origin', 'import')
            .eq('reconciliation_ignored', false);
        if (error) throw error;

        const txList = transactions ?? [];
        if (txList.length === 0) {
            res.json({ data: [] });
            return;
        }

        const ids = txList.map((t: any) => t.transaction_id);
        const { data: recs } = await req.supabase
            .from('bank_reconciliations')
            .select('imported_transaction_id')
            .in('imported_transaction_id', ids);
        const reconciledIds = new Set((recs ?? []).map((r: any) => r.imported_transaction_id));

        const countByAccount = new Map<string, number>();
        for (const t of txList) {
            if (!reconciledIds.has(t.transaction_id) && t.transaction_bank_id) {
                countByAccount.set(t.transaction_bank_id, (countByAccount.get(t.transaction_bank_id) ?? 0) + 1);
            }
        }

        const data = Array.from(countByAccount.entries()).map(([account_id, pending_count]) => ({
            account_id,
            pending_count,
        }));

        res.json({ data });
    } catch (err) { next(err); }
}));

// ─── POST / ───────────────────────────────────────────────────────────────────
// Concilia um lançamento importado com um do sistema

router.post('/', h(async (req, res, next) => {
    try {
        const { wid } = req.params;
        const { imported_transaction_id, system_transaction_id, notes } = req.body;

        if (!imported_transaction_id || !system_transaction_id) {
            res.status(400).json({ error: { message: 'imported_transaction_id e system_transaction_id são obrigatórios.' } });
            return;
        }

        const { data, error } = await req.supabase
            .from('bank_reconciliations')
            .insert({
                workspace_id: wid,
                imported_transaction_id,
                system_transaction_id,
                reconciled_by_user_id: req.user.id,
                notes: notes ?? null,
            })
            .select()
            .single();
        if (error) throw error;

        res.status(201).json(data);
    } catch (err) { next(err); }
}));

// ─── DELETE /:id ──────────────────────────────────────────────────────────────
// Desconcilia (remove o vínculo)

router.delete('/:id', h(async (req, res, next) => {
    try {
        const { wid, id } = req.params;

        const { error } = await req.supabase
            .from('bank_reconciliations')
            .delete()
            .eq('id', id)
            .eq('workspace_id', wid);
        if (error) throw error;

        res.status(204).send();
    } catch (err) { next(err); }
}));

// ─── PATCH /ignore/:importedId ────────────────────────────────────────────────
// Marca lançamento importado como ignorado

router.patch('/ignore/:importedId', h(async (req, res, next) => {
    try {
        const { wid, importedId } = req.params;

        const { error } = await req.supabase
            .from('transactions')
            .update({ reconciliation_ignored: true })
            .eq('transaction_id', importedId)
            .eq('transaction_workspace_id', wid);
        if (error) throw error;

        res.status(204).send();
    } catch (err) { next(err); }
}));

// ─── PATCH /unignore/:importedId ──────────────────────────────────────────────
// Desmarca o ignorado

router.patch('/unignore/:importedId', h(async (req, res, next) => {
    try {
        const { wid, importedId } = req.params;

        const { error } = await req.supabase
            .from('transactions')
            .update({ reconciliation_ignored: false })
            .eq('transaction_id', importedId)
            .eq('transaction_workspace_id', wid);
        if (error) throw error;

        res.status(204).send();
    } catch (err) { next(err); }
}));

export default router;
