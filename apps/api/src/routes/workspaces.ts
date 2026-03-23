import { Router, Response, NextFunction, RequestHandler } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { getSupabaseAdmin } from '../lib/supabase';

const router = Router();
router.use(requireAuth as RequestHandler);

type H = (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
const h = (fn: H): RequestHandler =>
    (req, res, next) => fn(req as AuthenticatedRequest, res, next).catch(next) as unknown;

/** GET /api/v1/workspaces — owned + member workspaces */
router.get('/', h(async (req, res, next) => {
    try {
        const { data: owned, error: ownedErr } = await req.supabase
            .from('workspaces')
            .select('*')
            .eq('workspace_owner_user_id', req.user.id)
            .order('workspace_created_at', { ascending: false });
        if (ownedErr) throw ownedErr;

        const { data: memberRows, error: memberErr } = await req.supabase
            .from('workspace_users')
            .select('workspace_user_workspace_id')
            .eq('workspace_user_user_id', req.user.id);
        if (memberErr) throw memberErr;

        let memberWorkspaces: any[] = [];
        const memberIds = (memberRows ?? []).map((r: any) => r.workspace_user_workspace_id);
        if (memberIds.length > 0) {
            const { data, error } = await req.supabase
                .from('workspaces')
                .select('*')
                .in('workspace_id', memberIds);
            if (error) throw error;
            memberWorkspaces = data ?? [];
        }

        const all = [...(owned ?? []), ...memberWorkspaces];
        const unique = Array.from(new Map(all.map((w: any) => [w.workspace_id, w])).values());
        res.json(unique);
    } catch (err) { next(err); }
}));

/** POST /api/v1/workspaces */
router.post('/', h(async (req, res, next) => {
    try {
        const { workspace_name, workspace_type = 'personal' } = req.body;
        if (!workspace_name) {
            res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'workspace_name é obrigatório.' } });
            return;
        }
        const { data, error } = await req.supabase
            .from('workspaces')
            .insert({ workspace_name, workspace_type, workspace_owner_user_id: req.user.id })
            .select()
            .single();
        if (error) throw error;
        res.status(201).json(data);
    } catch (err) { next(err); }
}));

/** PUT /api/v1/workspaces/:id */
router.put('/:id', h(async (req, res, next) => {
    try {
        const { id } = req.params;
        const { workspace_name, workspace_icon } = req.body;
        const { data, error } = await req.supabase
            .from('workspaces')
            .update({ workspace_name, workspace_icon })
            .eq('workspace_id', id)
            .select()
            .single();
        if (error) throw error;
        res.json(data);
    } catch (err) { next(err); }
}));

/** DELETE /api/v1/workspaces/:id */
router.delete('/:id', h(async (req, res, next) => {
    try {
        const { id } = req.params;
        const { error } = await req.supabase.from('workspaces').delete().eq('workspace_id', id);
        if (error) throw error;
        res.status(204).send();
    } catch (err) { next(err); }
}));

// ─── Members ──────────────────────────────────────────────────────────────────

/** GET /api/v1/workspaces/:wid/members */
router.get('/:wid/members', h(async (req, res, next) => {
    try {
        const { wid } = req.params;
        const admin = getSupabaseAdmin();

        // Fetch workspace to get owner
        const { data: workspace, error: wsErr } = await req.supabase
            .from('workspaces')
            .select('workspace_owner_user_id, workspace_created_at')
            .eq('workspace_id', wid)
            .single();
        if (wsErr) throw wsErr;

        // Fetch all member rows
        const { data: memberRows, error: memberErr } = await admin
            .from('workspace_users')
            .select('workspace_user_user_id, role, joined_at')
            .eq('workspace_user_workspace_id', wid);
        if (memberErr) throw memberErr;

        // Collect all user IDs (owner + members)
        const allUserIds = [
            workspace.workspace_owner_user_id,
            ...(memberRows ?? []).map((r: any) => r.workspace_user_user_id),
        ];
        const uniqueUserIds = [...new Set(allUserIds)];

        // Fetch user profiles via admin client
        const { data: users, error: usersErr } = await admin
            .from('users')
            .select('user_id, user_name, user_email')
            .in('user_id', uniqueUserIds);
        if (usersErr) throw usersErr;

        const userMap = new Map((users ?? []).map((u: any) => [u.user_id, u]));

        // Build owner entry
        const ownerUser = userMap.get(workspace.workspace_owner_user_id);
        const members = [
            {
                workspace_id: wid,
                user_id: workspace.workspace_owner_user_id,
                role: 'owner',
                name: ownerUser?.user_name ?? '',
                email: ownerUser?.user_email ?? '',
                joined_at: workspace.workspace_created_at,
            },
            ...(memberRows ?? []).map((r: any) => {
                const u = userMap.get(r.workspace_user_user_id);
                return {
                    workspace_id: wid,
                    user_id: r.workspace_user_user_id,
                    role: r.role,
                    name: u?.user_name ?? '',
                    email: u?.user_email ?? '',
                    joined_at: r.joined_at,
                };
            }),
        ];

        res.json(members);
    } catch (err) { next(err); }
}));

/** POST /api/v1/workspaces/:wid/members — stub */
router.post('/:wid/members', h(async (_req, res) => {
    res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Convites de membros estarão disponíveis em breve.' } });
}));

/** DELETE /api/v1/workspaces/:wid/members/:uid — stub */
router.delete('/:wid/members/:uid', h(async (_req, res) => {
    res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Remoção de membros estará disponível em breve.' } });
}));

// ─── Teams ────────────────────────────────────────────────────────────────────

/** GET /api/v1/workspaces/:wid/teams */
router.get('/:wid/teams', h(async (req, res, next) => {
    try {
        const { wid } = req.params;
        const { data, error } = await req.supabase
            .from('teams')
            .select('*')
            .eq('workspace_id', wid)
            .order('created_at', { ascending: true });
        if (error) throw error;
        res.json(data ?? []);
    } catch (err) { next(err); }
}));

/** POST /api/v1/workspaces/:wid/teams */
router.post('/:wid/teams', h(async (req, res, next) => {
    try {
        const { wid } = req.params;
        const { name } = req.body;
        if (!name) {
            res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'name é obrigatório.' } });
            return;
        }
        const { data, error } = await req.supabase
            .from('teams')
            .insert({ workspace_id: wid, name, created_by: req.user.id })
            .select()
            .single();
        if (error) throw error;
        res.status(201).json(data);
    } catch (err) { next(err); }
}));

/** DELETE /api/v1/workspaces/:wid/teams/:tid */
router.delete('/:wid/teams/:tid', h(async (req, res, next) => {
    try {
        const { tid } = req.params;
        const { error } = await req.supabase.from('teams').delete().eq('team_id', tid);
        if (error) throw error;
        res.status(204).send();
    } catch (err) { next(err); }
}));

export default router;
