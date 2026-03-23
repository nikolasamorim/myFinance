import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { setAccessToken } from '../lib/authTokens';
import { authFetch } from '../lib/apiClient';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: { id: string; email: string; name: string };
}

interface RefreshResponse {
  access_token: string;
  refresh_token: string;
  user: { id: string; email: string; name: string };
}

interface MeResponse {
  id: string;
  email: string;
  name: string;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // ─── Silent refresh on mount (replaces supabase.auth.getSession) ───────────

  useEffect(() => {
    let cancelled = false;

    const silentRefresh = async () => {
      try {
        // Skip silent refresh on the OAuth callback page — the AuthCallback
        // component handles hydration itself and running both concurrently
        // causes a race condition where silentRefresh may clear auth state.
        if (window.location.pathname === '/auth/callback') {
          setLoading(false);
          return;
        }

        // Try to refresh using the httpOnly cookie.
        // Use raw fetch to avoid noisy console errors when there is no cookie (expected on login page).
        const API_URL = import.meta.env.VITE_API_URL as string;
        const response = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });

        if (cancelled) return;

        if (response.ok) {
          const data: RefreshResponse = await response.json();
          setAccessToken(data.access_token);
          setUser({
            id: data.user.id,
            email: data.user.email || '',
            name: data.user.name || data.user.email || '',
          });
          setIsAuthenticated(true);
        } else {
          // No valid refresh token — user is not authenticated (expected on login page)
          setAccessToken(null);
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch {
        // Network error
        if (!cancelled) {
          setAccessToken(null);
          setUser(null);
          setIsAuthenticated(false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    silentRefresh();

    return () => {
      cancelled = true;
    };
  }, []);

  // ─── Login ─────────────────────────────────────────────────────────────────

  const login = useCallback(async (email: string, password: string) => {
    const data = await authFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    setAccessToken(data.access_token);
    setUser({
      id: data.user.id,
      email: data.user.email || '',
      name: data.user.name || data.user.email || '',
    });
    setIsAuthenticated(true);
  }, []);

  // ─── Register ──────────────────────────────────────────────────────────────

  const register = useCallback(async (email: string, password: string, name: string) => {
    await authFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    // Registration doesn't auto-login — user must verify email first
  }, []);

  // ─── Logout ────────────────────────────────────────────────────────────────

  const logout = useCallback(async () => {
    try {
      await authFetch('/auth/logout', { method: 'POST' });
    } catch {
      // Even if the API call fails, clear local state
    }
    setAccessToken(null);
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  // ─── Google OAuth ──────────────────────────────────────────────────────────

  const loginWithGoogle = useCallback(async () => {
    const data = await authFetch<{ url: string }>('/auth/google');
    if (data?.url) {
      window.location.href = data.url;
    }
  }, []);

  // ─── Hydrate from OAuth callback ──────────────────────────────────────────

  const hydrateFromToken = useCallback(async (accessToken: string) => {
    setAccessToken(accessToken);
    try {
      const me = await authFetch<MeResponse>('/auth/me');
      setUser({
        id: me.id,
        email: me.email || '',
        name: me.name || me.email || '',
      });
      setIsAuthenticated(true);
    } catch {
      setAccessToken(null);
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);

  const value: AuthContextType & { hydrateFromToken: (token: string) => Promise<void> } = {
    user,
    isAuthenticated,
    loading,
    login,
    register,
    logout,
    loginWithGoogle,
    hydrateFromToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Extended hook that includes hydrateFromToken (used by AuthCallback page).
 */
export function useAuthInternal() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthInternal must be used within an AuthProvider');
  }
  return context as AuthContextType & { hydrateFromToken: (token: string) => Promise<void> };
}
