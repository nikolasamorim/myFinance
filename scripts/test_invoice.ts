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
  console.log("Checking for open statements RPC...");
  
  // Try to find a credit card to test with
  const { data: cards, error: cardsError } = await supabase.from('credit_cards').select('credit_card_id').limit(1);
  if (cardsError) {
    console.error("Failed to query cards", cardsError);
    return;
  }
  
  console.log("Cards found:", cards);
  if (cards && cards.length > 0) {
    const cardId = cards[0].credit_card_id;
    console.log(`Testing compute_statement_window for card ${cardId}`);
    
    const { data: window, error: windowErr } = await supabase.rpc('compute_statement_window', {
      card_id: cardId,
      anchor_date: '2026-03-01'
    });
    
    if (windowErr) {
      console.error("RPC Error:", windowErr);
    } else {
      console.log("Window computed:", window);
    }
  } else {
    console.log("No credit cards found, cannot test RPC directly with live data.");
  }
}

run().catch(console.error);
