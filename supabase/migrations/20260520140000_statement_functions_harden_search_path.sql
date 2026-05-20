/*
  # Hardening: search_path fixo nas funções do motor de faturas

  Resolve o lint function_search_path_mutable (advisor de segurança) nas funções
  SECURITY DEFINER do subsistema de faturas. Sem search_path fixo, uma SECURITY
  DEFINER pode resolver objetos por um search_path controlado pelo chamador
  (risco de shadowing/injeção de schema).

  Fixamos search_path = public, pg_temp (pg_temp por último evita que objetos
  temporários sombreiem os de public). As funções referenciam apenas objetos de
  public, então o comportamento não muda. ALTER FUNCTION não altera o corpo.
*/

ALTER FUNCTION public._clamp_day(integer, integer, integer)            SET search_path = public, pg_temp;
ALTER FUNCTION public.compute_statement_window(uuid, date)            SET search_path = public, pg_temp;
ALTER FUNCTION public.recalc_card_balance(uuid)                       SET search_path = public, pg_temp;
ALTER FUNCTION public.recompute_statement_status(uuid)               SET search_path = public, pg_temp;
ALTER FUNCTION public.recalc_statement_amount(uuid)                   SET search_path = public, pg_temp;
ALTER FUNCTION public.ensure_open_statement(uuid, date)               SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_item_from_transaction(uuid)                SET search_path = public, pg_temp;
ALTER FUNCTION public.register_statement_payment(uuid, numeric, date, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.close_statement(uuid)                           SET search_path = public, pg_temp;
ALTER FUNCTION public.move_item_to_next_cycle(uuid)                  SET search_path = public, pg_temp;
ALTER FUNCTION public.backfill_statements_for_card(uuid)             SET search_path = public, pg_temp;
ALTER FUNCTION public.trg_sync_transaction_to_statement()            SET search_path = public, pg_temp;
ALTER FUNCTION public.trg_remove_transaction_from_statement()        SET search_path = public, pg_temp;
