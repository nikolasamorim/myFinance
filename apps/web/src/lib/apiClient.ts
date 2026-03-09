/**
 * API Client para myFinance
 *
 * Quando VITE_API_URL estiver definida, usa a API REST.
 * Se não estiver definida, retorna null e o código cai no fallback Supabase direto.
 *
 * Uso:
 *   const api = getApiClient();
 *   if (api) {
 *     return api.get('/workspaces/:wid/accounts');
 *   }
 *   // fallback: supabase direto
 */

import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL as string | undefined;

async function getAuthToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
}

async function apiFetch<T>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const token = await getAuthToken();

    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });

    const isJson = response.headers.get('content-type')?.includes('application/json');

    if (!response.ok) {
        const body = isJson ? await response.json().catch(() => ({})) : {};
        const msg = body?.error?.message ?? `HTTP ${response.status}`;
        throw new Error(msg);
    }

    if (response.status === 204) return undefined as T;

    if (!isJson) {
        throw new Error(`Resposta inesperada do servidor (não é JSON). Verifique se VITE_API_URL está configurada corretamente.`);
    }

    return response.json() as Promise<T>;
}

export const apiClient = API_URL
    ? {
        get: <T>(path: string) => apiFetch<T>(path),
        post: <T>(path: string, body: unknown) =>
            apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }),
        put: <T>(path: string, body: unknown) =>
            apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
        delete: (path: string) => apiFetch<void>(path, { method: 'DELETE' }),
    }
    : null;

/**
 * Returns true if the app is configured to use the API backend.
 * Use this to toggle between apiClient and direct Supabase calls.
 */
export const hasApiBackend = Boolean(API_URL);
