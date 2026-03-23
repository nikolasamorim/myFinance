import { Router, Response, NextFunction, RequestHandler } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { createConnectToken, getAccount, deleteItem } from '../lib/pluggy';

const router = Router();
router.use(requireAuth as RequestHandler);

type H = (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
const h = (fn: H): RequestHandler =>
    (req, res, next) => fn(req as AuthenticatedRequest, res, next).catch(next) as unknown;

// ─── POST /api/v1/banking/connect-token ─────────────────────────────────────

router.post('/connect-token', h(async (req, res) => {
    const { workspace_id, itemId } = req.body;

    if (!workspace_id) {
        res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'workspace_id é obrigatório.' } });
        return;
    }

    // Verificar membro do workspace via RLS (req.supabase tem JWT do usuário)
    const { data: member } = await req.supabase
        .from('workspace_users')
        .select('workspace_user_user_id')
        .eq('workspace_user_workspace_id', workspace_id)
        .eq('workspace_user_user_id', req.user.id)
        .maybeSingle();

    if (!member) {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Sem acesso a este workspace.' } });
        return;
    }

    const result = await createConnectToken({
        workspaceId: workspace_id,
        userId: req.user.id,
        itemId,
    });

    res.json(result);
}));

// ─── GET /api/v1/banking/connections ────────────────────────────────────────

router.get('/connections', h(async (req, res) => {
    const workspaceId = req.query.workspace_id as string;

    if (!workspaceId) {
        res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'workspace_id é obrigatório.' } });
        return;
    }

    const { data: connections, error } = await req.supabase
        .from('pluggy_connections')
        .select('*')
        .eq('workspace_id', workspaceId)
        .neq('status', 'disconnected')
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    // Buscar saldo atualizado da Pluggy para conexões ativas
    const result = await Promise.all(
        (connections ?? []).map(async (conn) => {
            let balance: number | null = null;
            if (conn.status === 'active' && conn.pluggy_account_id) {
                try {
                    const acc = await getAccount(conn.pluggy_account_id);
                    balance = acc.balance;
                } catch {
                    // Ignora erro de saldo
                }
            }
            return { ...conn, balance };
        }),
    );

    res.json({ data: result });
}));

// ─── DELETE /api/v1/banking/disconnect ──────────────────────────────────────

router.delete('/disconnect', h(async (req, res) => {
    const workspaceId = req.query.workspace_id as string;
    const connectionId = req.query.connection_id as string;

    if (!workspaceId || !connectionId) {
        res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'workspace_id e connection_id são obrigatórios.' } });
        return;
    }

    const { data: connection, error } = await req.supabase
        .from('pluggy_connections')
        .select('*')
        .eq('id', connectionId)
        .eq('workspace_id', workspaceId)
        .maybeSingle();

    if (error) throw new Error(error.message);
    if (!connection) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Conexão não encontrada.' } });
        return;
    }

    try {
        await deleteItem(connection.pluggy_item_id);
    } catch (err) {
        console.error('[banking/disconnect] erro ao deletar item na Pluggy:', (err as Error).message);
    }

    await req.supabase
        .from('pluggy_connections')
        .update({ status: 'disconnected' })
        .eq('id', connectionId);

    res.status(204).send();
}));

export default router;
