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
  console.log("Testing compute_statement_window directly with live ID...");
  
  const cardId = 'd26d15f0-6086-42b5-a4ff-f0fcae248a73';
  const period = '2026-03';
  
  const { data: windowData, error: windowErr } = await supabase.rpc('compute_statement_window', {
      card_id: cardId,
      anchor_date: `${period}-01`,
  });
  
  if (windowErr) {
      console.error("RPC compute_statement_window Error:", windowErr);
      return;
  }
  
  console.log("Window data:", windowData);
  
  if (!windowData || windowData.length === 0) {
      console.error("No window data returned");
      return;
  }
  
  console.log("Testing ensure_open_statement...");
  const window = windowData[0];
  const { data: statementId, error: ensureErr } = await supabase.rpc('ensure_open_statement', {
      card_id: cardId,
      p_period_start: window.period_start,
  });
  
  if (ensureErr) {
      console.error("RPC ensure_open_statement Error:", ensureErr);
      return;
  }
  
  console.log("Statement ID:", statementId);
  
}

run().catch(console.error);
