import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file and ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set correctly.');
}

// Validate URL format
if (supabaseUrl === 'your_supabase_url_here' || !supabaseUrl.startsWith('https://')) {
  throw new Error('Invalid VITE_SUPABASE_URL. Please set it to your actual Supabase project URL (e.g., https://your-project-id.supabase.co) in your .env file.');
}

if (supabaseAnonKey === 'your_supabase_anon_key_here') {
  throw new Error('Invalid VITE_SUPABASE_ANON_KEY. Please set it to your actual Supabase anonymous key in your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);