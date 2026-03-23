import { Router, Response, NextFunction, RequestHandler } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router({ mergeParams: true });
router.use(requireAuth as RequestHandler);

type H = (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
const h = (fn: H): RequestHandler =>
    (req, res, next) => fn(req as AuthenticatedRequest, res, next).catch(next) as unknown;

// ─── Helpers de scoring ───────────────────────────────────────────────────────

/**
 * Similaridade de Jaccard sobre palavras normalizadas.
 * Retorna 0–100.
 */
function descriptionSimilarity(a: string, b: string): number {
    const normalize = (s: string) =>
        s.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')   // remove acentos
            .replace(/[^a-z0-9 ]/g, ' ')
            .split(/\s+/)
            .filter(Boolean);

    const setA = new Set(normalize(a));
    const setB = new Set(normalize(b));
    if (setA.size === 0 || setB.size === 0) return 0;

    let intersection = 0;
    for (const w of setA) {
        if (setB.has(w)) intersection++;
    }
    const union = setA.size + setB.size - intersection;
    return Math.round((intersection / union) * 100);
}

/**
 * Calcula o score de matching entre uma transação importada e um candidato.
 * Retorna null se os tipos forem opostos (receita vs despesa) — candidato descartado.
 *
 * Pesos: valor 55% | data 25% | conta 5% | descrição 15%
 */
function calculateScore(
    imported: Record<string, any>,
    candidate: Record<string, any>,
    importedDate: Date,
): number | null {
    // R7: tipos opostos são descartados (income ≠ expense)
    const typeMismatch =
        (imported.transaction_type === 'income' && candidate.transaction_type === 'expense') ||
        (imported.transaction_type === 'expense' && candidate.transaction_type === 'income');
    if (typeMismatch) return null;

    const importedAmount: number = imported.transaction_amount;

    const candDate = new Date(candidate.transaction_date);
    const dateDiffDays = Math.abs((candDate.getTime() - importedDate.getTime()) / 86400000);
    const dateScore = Math.max(0, 100 - dateDiffDays * 10);

    const amountDiff = Math.abs(candidate.transaction_amount - importedAmount);
    const amountScore = importedAmount > 0
        ? Math.max(0, 100 - (amountDiff / importedAmount) * 100)
        : (amountDiff === 0 ? 100 : 0);

    const accountScore = imported.transaction_bank_id &&
        candidate.transaction_bank_id === imported.transaction_bank_id ? 20 : 0;

    const descScore = descriptionSimilarity(
        imported.transaction_description ?? '',
        candidate.transaction_description ?? '',
    );

    return Math.round(
        amountScore * 0.55 +
        dateScore * 0.25 +
        accountScore * 0.05 +
        descScore * 0.15,
    );
}

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
// Sugestões automáticas de lançamentos do sistema para conciliar com o importado.
//
// Melhorias implementadas:
// - R2: adiciona peso de descrição (Jaccard 15%), redistribui pesos
// - R5: pré-filtra por faixa de valor antes do limit → garante os melhores candidatos
// - R7: descarta candidatos com tipo oposto (receita vs despesa)

router.get('/suggestions/:importedId', h(async (req, res, next) => {
    try {
        const { wid, importedId } = req.params;

        const { data: imported, error: impErr } = await req.supabase
            .from('transactions')
            .select('*')
            .eq('transaction_id', importedId)
            .eq('transaction_workspace_id', wid)
            .single();
        if (impErr) throw impErr;

        const importedAmount: number = imported.transaction_amount;
        const importedDate = new Date(imported.transaction_date);

        // IDs já conciliados (para excluir)
        const { data: existingRecs } = await req.supabase
            .from('bank_reconciliations')
            .select('system_transaction_id')
            .eq('workspace_id', wid);
        const usedSystemIds = new Set((existingRecs ?? []).map((r: any) => r.system_transaction_id));

        // Janela temporal ±7 dias
        const windowStart = new Date(importedDate);
        windowStart.setDate(windowStart.getDate() - 7);
        const windowEnd = new Date(importedDate);
        windowEnd.setDate(windowEnd.getDate() + 7);

        // R5: pré-filtra por faixa de valor (±50% do valor importado) antes de aplicar limit
        // Isso garante que os candidatos mais relevantes não sejam cortados
        const minAmount = importedAmount > 0 ? importedAmount * 0.5 : 0;
        const maxAmount = importedAmount > 0 ? importedAmount * 1.5 : importedAmount + 1;

        let candQuery = req.supabase
            .from('transactions')
            .select('*')
            .eq('transaction_workspace_id', wid)
            .neq('transaction_origin', 'import')
            .gte('transaction_date', windowStart.toISOString().split('T')[0])
            .lte('transaction_date', windowEnd.toISOString().split('T')[0])
            .gte('transaction_amount', minAmount)
            .lte('transaction_amount', maxAmount)
            .limit(500); // limite amplo; scoring e slice final controlam os 5 melhores

        const { data: candidates, error: candErr } = await candQuery;
        if (candErr) throw candErr;

        const scored = (candidates ?? [])
            .filter((c: any) => !usedSystemIds.has(c.transaction_id) && c.transaction_id !== importedId)
            .map((c: any) => {
                const score = calculateScore(imported, c, importedDate);
                if (score === null || score < 30) return null;
                const amountDiff = Math.abs(c.transaction_amount - importedAmount);
                return { transaction: c, score, amount_difference: amountDiff };
            })
            .filter((s): s is NonNullable<typeof s> => s !== null)
            .sort((a, b) => b.score - a.score)
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
// Retorna contagem de pendentes por conta — usa RPC com LEFT JOIN (P3 otimização)

router.get('/summary', h(async (req, res, next) => {
    try {
        const { wid } = req.params;

        const { data, error } = await req.supabase
            .rpc('get_reconciliation_summary', { p_workspace_id: wid });
        if (error) throw error;

        res.json({ data: data ?? [] });
    } catch (err) { next(err); }
}));

// ─── POST /import ──────────────────────────────────────────────────────────────
// Importa um lote de transações OFX com deduplicação via external_id (fitid).
// Cria um registro em import_batches para rastreabilidade.

router.post('/import', h(async (req, res, next) => {
    try {
        const { wid } = req.params;
        const { account_id, transactions, file_name } = req.body as {
            account_id: string;
            transactions: Array<{
                fitid: string;
                date: string;
                description: string;
                amount: number;
                type: 'income' | 'expense';
                category_id?: string | null;
            }>;
            file_name?: string;
        };

        if (!account_id || !Array.isArray(transactions) || transactions.length === 0) {
            res.status(400).json({ error: { message: 'account_id e transactions são obrigatórios.' } });
            return;
        }

        // Cria o batch para rastreabilidade
        const { data: batch, error: batchErr } = await req.supabase
            .from('import_batches')
            .insert({
                workspace_id: wid,
                account_id,
                source: 'ofx',
                created_by: req.user.id,
                item_count: transactions.length,
                status: 'processing',
                file_name: file_name ?? null,
            })
            .select()
            .single();
        if (batchErr) throw batchErr;

        // Monta os rows para upsert
        const rows = transactions.map((t) => ({
            transaction_workspace_id: wid,
            transaction_type: t.type,
            transaction_description: t.description,
            transaction_amount: t.amount,
            transaction_date: t.date,
            transaction_status: t.type === 'income' ? 'received' : 'paid',
            transaction_bank_id: account_id,
            transaction_category_id: t.category_id ?? null,
            transaction_origin: 'import',
            transaction_created_by_user_id: req.user.id,
            transaction_payment_method: null,
            transaction_cost_center_id: null,
            transaction_card_id: null,
            transaction_person_id: null,
            transaction_recurrence: null,
            recurring: false,
            recurrence_id: null,
            recurrence_rule_id: null,
            recurrence_sequence: null,
            recurrence_instance_date: null,
            parent_recurrence_rule_id: null,
            is_recurrence_generated: false,
            generated_at: null,
            version: null,
            installment_group_id: null,
            installment_number: null,
            installment_total: null,
            import_source: 'ofx',
            external_id: t.fitid,
        }));

        // Upsert com ignoreDuplicates: insere novas, ignora as que já existem pelo índice único
        const { data: inserted, error: insertErr } = await req.supabase
            .from('transactions')
            .upsert(rows, {
                onConflict: 'transaction_workspace_id,import_source,external_id',
                ignoreDuplicates: true,
            })
            .select('transaction_id');
        if (insertErr) throw insertErr;

        const importedCount = (inserted ?? []).length;
        const skippedCount = transactions.length - importedCount;

        // Atualiza o batch com os resultados
        await req.supabase
            .from('import_batches')
            .update({
                item_count: importedCount,
                skipped_count: skippedCount,
                status: 'completed',
            })
            .eq('id', batch.id);

        res.status(201).json({
            batch_id: batch.id,
            imported: importedCount,
            skipped: skippedCount,
        });
    } catch (err) { next(err); }
}));

// ─── POST / ───────────────────────────────────────────────────────────────────
// Concilia um lançamento importado com um do sistema.
// Aceita match_score e match_type para auditoria.
// O amount_difference é calculado internamente.

router.post('/', h(async (req, res, next) => {
    try {
        const { wid } = req.params;
        const {
            imported_transaction_id,
            system_transaction_id,
            notes,
            match_score,
            match_type,
        } = req.body;

        if (!imported_transaction_id || !system_transaction_id) {
            res.status(400).json({ error: { message: 'imported_transaction_id e system_transaction_id são obrigatórios.' } });
            return;
        }

        // Calcula amount_difference com base nos valores reais das duas transações
        const [{ data: importedTx }, { data: systemTx }] = await Promise.all([
            req.supabase.from('transactions').select('transaction_amount').eq('transaction_id', imported_transaction_id).single(),
            req.supabase.from('transactions').select('transaction_amount').eq('transaction_id', system_transaction_id).single(),
        ]);

        const amountDifference = importedTx && systemTx
            ? Math.abs((importedTx as any).transaction_amount - (systemTx as any).transaction_amount)
            : null;

        const { data, error } = await req.supabase
            .from('bank_reconciliations')
            .insert({
                workspace_id: wid,
                imported_transaction_id,
                system_transaction_id,
                reconciled_by_user_id: req.user.id,
                notes: notes ?? null,
                match_score: match_score ?? null,
                amount_difference: amountDifference,
                match_type: match_type ?? 'manual',
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
// Marca lançamento importado como ignorado, com motivo opcional.

router.patch('/ignore/:importedId', h(async (req, res, next) => {
    try {
        const { wid, importedId } = req.params;
        const { reason } = req.body as { reason?: string };

        const { error } = await req.supabase
            .from('transactions')
            .update({
                reconciliation_ignored: true,
                ignore_reason: reason ?? null,
            })
            .eq('transaction_id', importedId)
            .eq('transaction_workspace_id', wid);
        if (error) throw error;

        res.status(204).send();
    } catch (err) { next(err); }
}));

// ─── PATCH /unignore/:importedId ──────────────────────────────────────────────
// Desmarca o ignorado e limpa o motivo

router.patch('/unignore/:importedId', h(async (req, res, next) => {
    try {
        const { wid, importedId } = req.params;

        const { error } = await req.supabase
            .from('transactions')
            .update({ reconciliation_ignored: false, ignore_reason: null })
            .eq('transaction_id', importedId)
            .eq('transaction_workspace_id', wid);
        if (error) throw error;

        res.status(204).send();
    } catch (err) { next(err); }
}));

export default router;
