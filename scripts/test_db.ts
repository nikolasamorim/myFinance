import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing supabase credentials in env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  console.log("Checking if card_statements exists...");
  const { data, error } = await supabase.from('card_statements').select('id').limit(1);
  
  if (error) {
    console.error("Error querying card_statements:", error);
  } else {
    console.log("card_statements exists! Data:", data);
  }
}

run().catch(console.error);
