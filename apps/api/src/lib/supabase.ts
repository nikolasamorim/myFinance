import { createClient } from '@supabase/supabase-js';

function getConfig() {
    const url = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
        throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
    }

    return {
        url,
        anonKey,
        serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    };
}

/**
 * Returns a Supabase client configured with the user's JWT.
 * This preserves RLS — perfect for all standard user CRUD operations.
 */
export function getSupabaseForUser(jwt: string) {
    const { url, anonKey } = getConfig();
    return createClient(url, anonKey, {
        global: {
            headers: { Authorization: `Bearer ${jwt}` },
        },
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });
}

/**
 * Returns a Supabase client carrying a full user session (access + refresh token).
 * Required for GoTrue operations that read the session internally — e.g.
 * `auth.updateUser` and `auth.mfa.*` — which the header-only client does not satisfy.
 */
export async function getSupabaseWithSession(accessToken: string, refreshToken: string) {
    const { url, anonKey } = getConfig();
    const client = createClient(url, anonKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });
    const { error } = await client.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
    });
    if (error) throw error;
    return client;
}

/**
 * Admin client using service_role key — bypasses RLS.
 * Use ONLY for internal jobs, maintenance, and admin operations.
 * NEVER use for user-originated requests.
 */
export function getSupabaseAdmin() {
    const { url, anonKey, serviceKey } = getConfig();
    return createClient(url, serviceKey || anonKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });
}
