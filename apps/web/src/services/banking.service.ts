import { getAccessToken } from '../lib/authTokens';
import type { PluggyConnectionWithBalance } from '@myfinance/shared';

// Dev local: usa Express API em VITE_API_URL (ex: http://localhost:3001/api/v1/banking)
// Produção: /banking/* é redirecionado para Netlify Functions via netlify.toml
const API_URL = import.meta.env.VITE_API_URL as string | undefined;
const BANKING_BASE = API_URL ? `${API_URL}/banking` : '/banking';

function getAuthToken(): string {
    const token = getAccessToken();
    if (!token) throw new Error('Usuário não autenticado');
    return token;
}

async function bankingFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = getAuthToken();

    const response = await fetch(`${BANKING_BASE}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            ...options.headers,
        },
    });

    if (response.status === 204) return undefined as T;

    const isJson = response.headers.get('content-type')?.includes('application/json');
    if (!response.ok) {
        const body = isJson ? await response.json().catch(() => ({})) : {};
        throw new Error(body?.error?.message ?? `HTTP ${response.status}`);
    }

    return response.json() as Promise<T>;
}

export const bankingService = {
    async getConnectToken(workspaceId: string, itemId?: string): Promise<{ accessToken: string }> {
        return bankingFetch('/connect-token', {
            method: 'POST',
            body: JSON.stringify({ workspace_id: workspaceId, ...(itemId ? { itemId } : {}) }),
        });
    },

    async getConnections(workspaceId: string): Promise<{ data: PluggyConnectionWithBalance[] }> {
        return bankingFetch(`/connections?workspace_id=${workspaceId}`);
    },

    async disconnect(workspaceId: string, connectionId: string): Promise<void> {
        return bankingFetch(`/disconnect?workspace_id=${workspaceId}&connection_id=${connectionId}`, {
            method: 'DELETE',
        });
    },
};
