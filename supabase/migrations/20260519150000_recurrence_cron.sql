/*
  # Scheduler de manutenção de recorrências (pg_cron + pg_net)

  Contexto (Item 5 do plano de escala): o schema já estava pronto para gerar
  recorrências (coluna next_run_at, índices, e a edge function
  `recurrence-maintenance`), mas NADA a invocava automaticamente. Este job roda
  diariamente e chama a edge function por HTTP.

  A edge function está deployada com verify_jwt=false, então a chamada não exige
  Authorization. A URL do projeto não é secreta (é a URL pública do projeto),
  portanto fica inline — nenhum segredo é versionado aqui.

  Idempotente: remove o job anterior (se houver) antes de reagendar.
*/

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'recurrence-maintenance') THEN
    PERFORM cron.unschedule('recurrence-maintenance');
  END IF;
END $$;

-- Diariamente às 06:00 UTC (03:00 America/Sao_Paulo)
SELECT cron.schedule(
  'recurrence-maintenance',
  '0 6 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://vsaamypohfkmsgvxiwze.supabase.co/functions/v1/recurrence-maintenance',
    body := '{}'::jsonb,
    headers := '{"Content-Type":"application/json"}'::jsonb,
    timeout_milliseconds := 30000
  );
  $cron$
);
