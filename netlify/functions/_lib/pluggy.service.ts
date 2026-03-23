import { getSupabaseAdmin } from './supabase';
import {
    PLUGGY_CLIENT_ID,
    PLUGGY_CLIENT_SECRET,
    PLUGGY_WEBHOOK_URL,
    PLUGGY_API_BASE,
    PLUGGY_CONNECTOR_IDS,
} from './pluggy.constants';

// ─── Tipos internos da Pluggy ────────────────────────────────────────────────

export interface PluggyAccount {
    id: string;
    itemId: string;
    type: string;
    subtype: string;
    name: string;
    balance: number;
    currencyCode: string;
    number: string;
    bankData?: Record<string, unknown>;
}

export interface PluggyTransaction {
    id: string;
    accountId: string;
    date: string;
    description: string;
    amount: number;
    balance: number;
    currencyCode: string;
    type: string;
    category?: string;
    categoryId?: string;
    paymentData?: Record<string, unknown>;
}

interface PluggyPageResponse<T> {
    total: number;
    totalPages: number;
    page: number;
    results: T[];
}

interface PluggyItem {
    id: string;
    connector: {
        id: number;
        name: string;
    };
    status: string;
    statusDetail?: {
        accounts?: { isUpdated: boolean };
        transactions?: { isUpdated: boolean };
    };
    clientUserId?: string;
    createdAt: string;
    updatedAt: string;
    consentExpiresAt?: string;
    error?: {
        code: string;
        message: string;
    };
}

// ─── Helper HTTP interno ─────────────────────────────────────────────────────

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

    // Retry 1x em 401 (API key expirada)
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

// ─── API Key com cache no banco ──────────────────────────────────────────────

export async function getApiKey(): Promise<string> {
    const admin = getSupabaseAdmin();

    // Buscar cache existente (com buffer de 5 min)
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

    // Autenticar na Pluggy
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

    // Upsert singleton
    await admin
        .from('pluggy_api_key_cache')
        .upsert({ id: 1, api_key: apiKey, expires_at: expiresAt }, { onConflict: 'id' });

    return apiKey;
}

// ─── Connect Token ───────────────────────────────────────────────────────────

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

// ─── Item ────────────────────────────────────────────────────────────────────

export async function getItem(itemId: string): Promise<PluggyItem> {
    return pluggyFetch<PluggyItem>('GET', `/items/${itemId}`);
}

export async function deleteItem(itemId: string): Promise<void> {
    await pluggyFetch<unknown>('DELETE', `/items/${itemId}`);
}

// ─── Accounts ────────────────────────────────────────────────────────────────

export async function getAccounts(itemId: string): Promise<PluggyAccount[]> {
    const data = await pluggyFetch<PluggyPageResponse<PluggyAccount>>(
        'GET',
        `/accounts?itemId=${itemId}`,
    );
    return data.results;
}

export async function getAccount(accountId: string): Promise<PluggyAccount> {
    return pluggyFetch<PluggyAccount>('GET', `/accounts/${accountId}`);
}

// ─── Transactions (paginado) ─────────────────────────────────────────────────

export async function getTransactions(
    accountId: string,
    from?: string,
    to?: string,
    page = 1,
): Promise<PluggyPageResponse<PluggyTransaction>> {
    const params = new URLSearchParams({ accountId, page: String(page), pageSize: '500' });
    if (from) params.set('from', from);
    if (to) params.set('to', to);

    return pluggyFetch<PluggyPageResponse<PluggyTransaction>>(
        'GET',
        `/transactions?${params.toString()}`,
    );
}

/**
 * Busca TODAS as transações paginando automaticamente.
 */
export async function getAllTransactions(
    accountId: string,
    from?: string,
    to?: string,
): Promise<PluggyTransaction[]> {
    const all: PluggyTransaction[] = [];
    let page = 1;

    while (true) {
        const res = await getTransactions(accountId, from, to, page);
        all.push(...res.results);
        if (page >= res.totalPages) break;
        page++;
    }

    return all;
}
