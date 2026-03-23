/**
 * In-memory token store for authentication.
 *
 * The access_token lives only in this module-level variable — never in
 * localStorage or sessionStorage — so it cannot be stolen via XSS.
 *
 * On page refresh the app calls POST /auth/refresh (httpOnly cookie is sent
 * automatically by the browser) to obtain a fresh access_token.
 */

let _accessToken: string | null = null;

export function getAccessToken(): string | null {
    return _accessToken;
}

export function setAccessToken(token: string | null): void {
    _accessToken = token;
}
