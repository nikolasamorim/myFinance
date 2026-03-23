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
 * Supabase client com JWT do usuário — preserva RLS.
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
 * Admin client com service_role — bypassa RLS.
 * Usar SOMENTE para operações internas (webhook, cache de API key).
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
