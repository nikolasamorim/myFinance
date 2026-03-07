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
  const cardId = 'd26d15f0-6086-42b5-a4ff-f0fcae248a73';
  const period = '2026-03';
  const workspaceId = 'af3e1541-641a-4f12-a0d9-8ef9680befd9';

  console.log(`--- DEBUGGING STATEMENTS FOR CARD ${cardId} ---`);

  // 1. Test compute_statement_window
  console.log("Step 1: compute_statement_window...");
  const { data: windowData, error: windowErr } = await supabase.rpc('compute_statement_window', {
      card_id: cardId,
      anchor_date: `${period}-01`,
  });
  
  if (windowErr) {
      console.error("FAILED Step 1:", windowErr);
      return;
  }
  console.log("SUCCESS Step 1:", windowData);

  // 2. Test ensure_open_statement
  console.log("Step 2: ensure_open_statement...");
  const window = windowData[0];
  const { data: statementId, error: ensureErr } = await supabase.rpc('ensure_open_statement', {
      card_id: cardId,
      p_period_start: window.period_start,
  });
  
  if (ensureErr) {
      console.error("FAILED Step 2:", ensureErr);
      return;
  }
  console.log("SUCCESS Step 2, Statement ID:", statementId);

  // 3. Test card_statements fetch (basic)
  console.log("Step 3: Basic fetch from card_statements...");
  const { data: basicStmt, error: basicErr } = await supabase
      .from('card_statements')
      .select('*')
      .eq('id', statementId);

  if (basicErr) {
      console.error("FAILED Step 3 (Basic):", basicErr);
  } else {
      console.log("SUCCESS Step 3 (Basic), Rows found:", basicStmt.length, basicStmt);
  }

  // 4. Test card_statements fetch (with relation)
  console.log("Step 4: Fetching with credit_card join...");
  const { data: statement, error: fetchErr } = await supabase
      .from('card_statements')
      .select(`
        *,
        credit_card:credit_cards (
          credit_card_name,
          credit_card_limit,
          current_balance,
          color,
          icon
        )
      `)
      .eq('id', statementId)
      .maybeSingle();

  if (fetchErr) {
      console.error("FAILED Step 4:", fetchErr);
      return;
  }
  console.log("SUCCESS Step 4:", statement);


  console.log("--- ALL STEPS PASSED LOCALLY ---");
}

run().catch(console.error);
