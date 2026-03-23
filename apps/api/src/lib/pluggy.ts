import { getSupabaseAdmin } from './supabase';

// Credenciais — mesmos valores de netlify/functions/_lib/pluggy.constants.ts
const PLUGGY_CLIENT_ID = process.env.PLUGGY_CLIENT_ID ?? '335f8e72-ccff-4c70-93e1-563d762bab10';
const PLUGGY_CLIENT_SECRET = process.env.PLUGGY_CLIENT_SECRET ?? 'a2866860-f581-426e-9e92-84fcd50c968e';
const PLUGGY_WEBHOOK_URL = process.env.PLUGGY_WEBHOOK_URL ?? 'https://azami-app.netlify.app/.netlify/functions/banking-webhook';
const PLUGGY_API_BASE = 'https://api.pluggy.ai';

// IDs de conectores permitidos — em trial, use "0" (Pluggy Bank sandbox).
// Em produção, remova a variável para liberar todos os conectores.
const PLUGGY_CONNECTOR_IDS: number[] | undefined = process.env.PLUGGY_CONNECTOR_IDS
    ? process.env.PLUGGY_CONNECTOR_IDS.split(',').map((id) => Number(id.trim()))
    : undefined;

// ─── Tipos ──────────────────────────────────────────────────────────────────

export interface PluggyAccount {
    id: string;
    itemId: string;
    type: string;
    subtype: string;
    name: string;
    balance: number;
    currencyCode: string;
    number: string;
}

// ─── HTTP helper ────────────────────────────────────────────────────────────

async function pluggyFetch<T>(
    method: string,
    path: string,
    body?: unknown,
    retrying = false,
): Promise<T> {
    const apiKey = await getApiKey();

    const res = await fetch(`${PLUGGY_API_BASE}${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': apiKey,
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401 && !retrying) {
        await clearApiKeyCache();
        return pluggyFetch<T>(method, path, body, true);
    }

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Pluggy API ${method} ${path} → ${res.status}: ${text}`);
    }

    return res.json() as Promise<T>;
}

async function clearApiKeyCache(): Promise<void> {
    const admin = getSupabaseAdmin();
    await admin.from('pluggy_api_key_cache').delete().eq('id', 1);
}

// ─── API Key com cache no banco ─────────────────────────────────────────────

async function getApiKey(): Promise<string> {
    const admin = getSupabaseAdmin();

    const { data } = await admin
        .from('pluggy_api_key_cache')
        .select('api_key, expires_at')
        .eq('id', 1)
        .maybeSingle();

    if (data) {
        const expiresAt = new Date(data.expires_at);
        const buffer = new Date(Date.now() + 5 * 60 * 1000);
        if (expiresAt > buffer) {
            return data.api_key;
        }
    }

    const res = await fetch(`${PLUGGY_API_BASE}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            clientId: PLUGGY_CLIENT_ID,
            clientSecret: PLUGGY_CLIENT_SECRET,
        }),
    });

    if (!res.ok) {
        throw new Error(`Pluggy auth failed: ${res.status}`);
    }

    const { apiKey } = (await res.json()) as { apiKey: string };
    const expiresAt = new Date(Date.now() + 110 * 60 * 1000).toISOString();

    await admin
        .from('pluggy_api_key_cache')
        .upsert({ id: 1, api_key: apiKey, expires_at: expiresAt }, { onConflict: 'id' });

    return apiKey;
}

// ─── Métodos públicos ───────────────────────────────────────────────────────

export async function createConnectToken(params: {
    workspaceId: string;
    userId: string;
    itemId?: string;
}): Promise<{ accessToken: string }> {
    const payload: Record<string, unknown> = {
        clientUserId: `${params.workspaceId}:${params.userId}`,
        webhookUrl: PLUGGY_WEBHOOK_URL,
        avoidDuplicates: true,
    };

    if (params.itemId) {
        payload.itemId = params.itemId;
    }

    if (PLUGGY_CONNECTOR_IDS) {
        payload.connectorIds = PLUGGY_CONNECTOR_IDS;
    }

    return pluggyFetch<{ accessToken: string }>('POST', '/connect_token', payload);
}

export async function getAccount(accountId: string): Promise<PluggyAccount> {
    return pluggyFetch<PluggyAccount>('GET', `/accounts/${accountId}`);
}

export async function deleteItem(itemId: string): Promise<void> {
    await pluggyFetch<unknown>('DELETE', `/items/${itemId}`);
}
