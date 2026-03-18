import { Router, Response, NextFunction, RequestHandler } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { notifyRecurrenceStatusChange } from '../lib/notificationService';

const router = Router({ mergeParams: true });
router.use(requireAuth as RequestHandler);

type H = (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
const h = (fn: H): RequestHandler => fn as unknown as RequestHandler;

function toISO(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

async function triggerGeneration(supabase: any, ruleId: string): Promise<void> {
    await supabase
        .from('recurrence_rules')
        .update({ next_run_at: new Date().toISOString() })
        .eq('id', ruleId);
}

/** GET /api/v1/workspaces/:wid/recurrence-rules */
router.get('/', h(async (req, res, next) => {
    try {
        const { wid } = req.params;
        const { data, error } = await req.supabase
            .from('recurrence_rules')
            .select('*')
            .eq('workspace_id', wid)
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data ?? []);
    } catch (err) { next(err); }
}));

/** GET /api/v1/workspaces/:wid/recurrence-rules/:id */
router.get('/:id', h(async (req, res, next) => {
    try {
        const { wid, id } = req.params;
        const { data, error } = await req.supabase
            .from('recurrence_rules')
            .select('*')
            .eq('id', id)
            .eq('workspace_id', wid)
            .single();
        if (error || !data) { res.status(404).json({ error: 'Not found' }); return; }
        res.json(data);
    } catch (err) { next(err); }
}));

/** POST /api/v1/workspaces/:wid/recurrence-rules */
router.post('/', h(async (req, res, next) => {
    try {
        const { wid } = req.params;
        const { transaction_type, description, amount, start_date, recurrence_type, repeat_count, end_date, due_adjustment, recurrence_day, account_id, category_id, notes } = req.body;
        if (!transaction_type || !description || !start_date || !recurrence_type) {
            res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'transaction_type, description, start_date e recurrence_type são obrigatórios.' } });
            return;
        }
        const { data, error } = await req.supabase
            .from('recurrence_rules')
            .insert([{ workspace_id: wid, created_by_user_id: req.user.id, transaction_type, description, amount, start_date, recurrence_type, repeat_count, end_date, account_id, category_id, notes, due_adjustment: due_adjustment ?? 'none', recurrence_day, status: 'active', generation_count: 0, error_count: 0, timezone: 'America/Sao_Paulo' }])
            .select().single();
        if (error) throw error;
        await triggerGeneration(req.supabase, data.id);
        res.status(201).json(data);
    } catch (err) { next(err); }
}));

/** PUT /api/v1/workspaces/:wid/recurrence-rules/:id */
router.put('/:id', h(async (req, res, next) => {
    try {
        const { id } = req.params;
        const todayISO = toISO(new Date());
        await req.supabase.from('transactions').delete().eq('parent_recurrence_rule_id', id).gte('recurrence_instance_date', todayISO);
        const { data, error } = await req.supabase.from('recurrence_rules').update({ ...req.body, generated_until: null, updated_at: new Date().toISOString() }).eq('id', id).select().single();
        if (error) throw error;
        if (data.status === 'active') await triggerGeneration(req.supabase, id);
        res.json(data);
    } catch (err) { next(err); }
}));

/** DELETE /api/v1/workspaces/:wid/recurrence-rules/:id */
router.delete('/:id', h(async (req, res, next) => {
    try {
        const { id } = req.params;
        const { error } = await req.supabase.from('recurrence_rules').delete().eq('id', id);
        if (error) throw error;
        res.status(204).send();
    } catch (err) { next(err); }
}));

/** POST /api/v1/workspaces/:wid/recurrence-rules/:id/pause */
router.post('/:id/pause', h(async (req, res, next) => {
    try {
        const { wid, id } = req.params;
        const { data, error } = await req.supabase.from('recurrence_rules').update({ status: 'paused', updated_at: new Date().toISOString() }).eq('id', id).select().single();
        if (error) throw error;
        notifyRecurrenceStatusChange(req.supabase, req.user.id, wid, id, data.description ?? id, 'paused');
        res.json(data);
    } catch (err) { next(err); }
}));

/** POST /api/v1/workspaces/:wid/recurrence-rules/:id/resume */
router.post('/:id/resume', h(async (req, res, next) => {
    try {
        const { wid, id } = req.params;
        const { data, error } = await req.supabase.from('recurrence_rules').update({ status: 'active', error_count: 0, last_error_at: null, last_error_message: null, updated_at: new Date().toISOString() }).eq('id', id).select().single();
        if (error) throw error;
        await triggerGeneration(req.supabase, id);
        notifyRecurrenceStatusChange(req.supabase, req.user.id, wid, id, data.description ?? id, 'active');
        res.json(data);
    } catch (err) { next(err); }
}));

/** POST /api/v1/workspaces/:wid/recurrence-rules/:id/cancel */
router.post('/:id/cancel', h(async (req, res, next) => {
    try {
        const { wid, id } = req.params;
        const todayISO = toISO(new Date());
        await req.supabase.from('transactions').delete().eq('parent_recurrence_rule_id', id).gte('recurrence_instance_date', todayISO);
        const { data, error } = await req.supabase.from('recurrence_rules').update({ status: 'canceled', next_run_at: null, updated_at: new Date().toISOString() }).eq('id', id).select().single();
        if (error) throw error;
        notifyRecurrenceStatusChange(req.supabase, req.user.id, wid, id, data.description ?? id, 'canceled');
        res.json(data);
    } catch (err) { next(err); }
}));

export default router;
