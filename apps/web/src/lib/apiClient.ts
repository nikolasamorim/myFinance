/**
 * API Client para myFinance
 *
 * Usa token in-memory (nunca localStorage) para autenticação.
 * Inclui interceptor automático de 401 com refresh via httpOnly cookie.
 */

import { getAccessToken, setAccessToken } from './authTokens';

const API_URL = import.meta.env.VITE_API_URL as string | undefined;

// ─── Token Refresh Mutex ─────────────────────────────────────────────────────
// Prevents multiple concurrent refresh calls when several requests hit 401.

let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
    if (refreshPromise) return refreshPromise;

    refreshPromise = (async () => {
        try {
            const response = await fetch(`${API_URL}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', // sends httpOnly cookie
            });

            if (!response.ok) {
                setAccessToken(null);
                return false;
            }

            const data = await response.json();
            setAccessToken(data.access_token);
            return true;
        } catch {
            setAccessToken(null);
            return false;
        } finally {
            refreshPromise = null;
        }
    })();

    return refreshPromise;
}

// ─── Core fetch ──────────────────────────────────────────────────────────────

async function apiFetch<T>(
    path: string,
    options: RequestInit = {},
    _isRetry = false
): Promise<T> {
    const token = getAccessToken();
    const isAuthEndpoint = path.startsWith('/auth/');

    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        credentials: isAuthEndpoint ? 'include' : 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });

    // Auto-refresh on 401 (only once per request)
    if (response.status === 401 && !_isRetry && !isAuthEndpoint) {
        const refreshed = await tryRefreshToken();
        if (refreshed) {
            return apiFetch<T>(path, options, true);
        }
        // Refresh failed — redirect to login
        window.location.href = '/login';
        throw new Error('Sessão expirada. Redirecionando para login.');
    }

    const isJson = response.headers.get('content-type')?.includes('application/json');

    if (!response.ok) {
        const body = isJson ? await response.json().catch(() => ({})) : {};
        const msg = body?.error?.message ?? `HTTP ${response.status}`;
        throw new Error(msg);
    }

    if (response.status === 204) return undefined as T;

    if (!isJson) {
        throw new Error(
            'Resposta inesperada do servidor (não é JSON). Verifique se VITE_API_URL está configurada corretamente.'
        );
    }

    return response.json() as Promise<T>;
}

// ─── Auth-specific fetch (always includes credentials) ───────────────────────

export async function authFetch<T>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const token = getAccessToken();

    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        credentials: 'include',
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
    if (!isJson) return undefined as T;

    return response.json() as Promise<T>;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export const apiClient = API_URL
    ? {
          get: <T>(path: string) => apiFetch<T>(path),
          post: <T>(path: string, body: unknown) =>
              apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }),
          put: <T>(path: string, body: unknown) =>
              apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
          patch: <T>(path: string, body: unknown) =>
              apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
          delete: (path: string) => apiFetch<void>(path, { method: 'DELETE' }),
      }
    : null;

/**
 * Returns true if the app is configured to use the API backend.
 */
export const hasApiBackend = Boolean(API_URL);
