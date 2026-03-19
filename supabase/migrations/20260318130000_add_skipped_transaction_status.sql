-- Adiciona o status 'skipped' ao check constraint de transaction_status
-- Permite que ocorrências de recorrência sejam marcadas como "puladas"

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_transaction_status_check;

ALTER TABLE transactions ADD CONSTRAINT transactions_transaction_status_check
  CHECK (transaction_status = ANY (ARRAY['pending'::text, 'received'::text, 'paid'::text, 'skipped'::text]));
