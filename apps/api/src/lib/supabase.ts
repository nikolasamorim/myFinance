import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
}

/**
 * Returns a Supabase client configured with the user's JWT.
 * This preserves RLS — perfect for all standard user CRUD operations.
 */
export function getSupabaseForUser(jwt: string) {
    return createClient(supabaseUrl, supabaseAnonKey, {
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
 * Admin client using service_role key — bypasses RLS.
 * Use ONLY for internal jobs, maintenance, and admin operations.
 * NEVER use for user-originated requests.
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey || supabaseAnonKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
    },
});
