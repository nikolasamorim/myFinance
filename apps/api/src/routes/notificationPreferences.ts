import { Router, Response, NextFunction, RequestHandler } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router({ mergeParams: true });
router.use(requireAuth as RequestHandler);

type H = (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
const h = (fn: H): RequestHandler => fn as unknown as RequestHandler;

/** GET /api/v1/workspaces/:wid/notification-preferences */
router.get('/', h(async (req, res, next) => {
    try {
        const { wid } = req.params;

        const { data, error } = await req.supabase
            .from('notification_preferences')
            .select('*')
            .eq('workspace_id', wid)
            .eq('user_id', req.user.id)
            .order('notification_type');

        if (error) throw error;
        res.json(data ?? []);
    } catch (err) { next(err); }
}));

/** PUT /api/v1/workspaces/:wid/notification-preferences
 * Upsert preferences in bulk. Body: array of { notification_type, enabled, advance_days? }
 */
router.put('/', h(async (req, res, next) => {
    try {
        const { wid } = req.params;
        const prefs = req.body as Array<{
            notification_type: string;
            enabled: boolean;
            advance_days?: number | null;
        }>;

        if (!Array.isArray(prefs) || prefs.length === 0) {
            res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Body deve ser um array de preferências.' } });
            return;
        }

        const rows = prefs.map(p => ({
            user_id: req.user.id,
            workspace_id: wid,
            notification_type: p.notification_type,
            enabled: p.enabled,
            advance_days: p.advance_days ?? null,
        }));

        const { data, error } = await req.supabase
            .from('notification_preferences')
            .upsert(rows, { onConflict: 'user_id,workspace_id,notification_type' })
            .select();

        if (error) throw error;
        res.json(data ?? []);
    } catch (err) { next(err); }
}));

/** GET /api/v1/workspaces/:wid/notification-preferences/subscriptions */
router.get('/subscriptions', h(async (req, res, next) => {
    try {
        const { wid } = req.params;
        const { entity_type } = req.query as Record<string, string>;

        let query = req.supabase
            .from('notification_subscriptions')
            .select('*')
            .eq('workspace_id', wid)
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });

        if (entity_type) query = query.eq('entity_type', entity_type);

        const { data, error } = await query;
        if (error) throw error;
        res.json(data ?? []);
    } catch (err) { next(err); }
}));

/** POST /api/v1/workspaces/:wid/notification-preferences/subscriptions */
router.post('/subscriptions', h(async (req, res, next) => {
    try {
        const { wid } = req.params;
        const { entity_type, entity_id, notification_types } = req.body;

        if (!entity_type || !entity_id || !Array.isArray(notification_types)) {
            res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: 'entity_type, entity_id e notification_types são obrigatórios.' },
            });
            return;
        }

        const { data, error } = await req.supabase
            .from('notification_subscriptions')
            .upsert({
                user_id: req.user.id,
                workspace_id: wid,
                entity_type,
                entity_id,
                notification_types,
            }, { onConflict: 'user_id,workspace_id,entity_type,entity_id' })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (err) { next(err); }
}));

/** DELETE /api/v1/workspaces/:wid/notification-preferences/subscriptions/:id */
router.delete('/subscriptions/:id', h(async (req, res, next) => {
    try {
        const { wid, id } = req.params;

        const { error } = await req.supabase
            .from('notification_subscriptions')
            .delete()
            .eq('id', id)
            .eq('workspace_id', wid)
            .eq('user_id', req.user.id);

        if (error) throw error;
        res.status(204).send();
    } catch (err) { next(err); }
}));

export default router;
