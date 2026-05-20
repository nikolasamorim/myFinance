/*
  # Backfill: recurrence_rules.created_by_user_id nulo → owner do workspace

  Contexto (Item 5.1): ao ativar o scheduler (Item 5), descobriu-se que 35 de 67
  regras ativas tinham created_by_user_id NULL. Como transactions.transaction_
  created_by_user_id é NOT NULL, a geração de transações dessas regras falhava.

  Regras criadas via API já preenchem o campo; as nulas são legadas/importadas.
  Atribuímos o owner do workspace como criador — default coerente para o campo
  de auditoria das transações geradas. Verificado: as 35 resolvem para um owner
  válido (sem workspaces órfãos ou sem owner).
*/

UPDATE public.recurrence_rules r
SET created_by_user_id = w.workspace_owner_user_id
FROM public.workspaces w
WHERE r.workspace_id = w.workspace_id
  AND r.created_by_user_id IS NULL
  AND w.workspace_owner_user_id IS NOT NULL;
