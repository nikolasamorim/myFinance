/**
 * Gerenciamento de autenticação para o mobile.
 * O token JWT é armazenado em memória durante a sessão.
 * TODO: persistir com expo-secure-store (instalar após ajuste de versão do Expo SDK)
 */

import { apiClient, setAuthToken } from './apiClient';

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export async function login(email: string, password: string): Promise<AuthTokens> {
  const data = await apiClient.post<AuthTokens>('/auth/login', { email, password });
  setAuthToken(data.access_token);
  return data;
}

export async function logout() {
  try {
    await apiClient.post('/auth/logout', {});
  } catch {
    // ignora erro de logout
  }
  setAuthToken(null);
}

export async function refreshToken(token: string): Promise<AuthTokens> {
  const data = await apiClient.post<AuthTokens>('/auth/refresh', { refresh_token: token });
  setAuthToken(data.access_token);
  return data;
}
