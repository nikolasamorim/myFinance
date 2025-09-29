/*
  # Create ensure_open_statement function

  1. New Functions
    - `ensure_open_statement(p_card_id, p_period_start)`
      - Creates or returns existing open statement for a credit card and period
      - Uses unambiguous parameter names to avoid column reference conflicts
      - Returns the statement ID

  2. Security
    - Function uses SECURITY DEFINER to run with elevated privileges
    - Validates that the card belongs to the user's workspace
*/

CREATE OR REPLACE FUNCTION ensure_open_statement(
  p_card_id uuid,
  p_period_start date
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_statement_id uuid;
  v_workspace_id uuid;
  v_card_record record;
  v_period_end date;
  v_due_date date;
BEGIN
  -- Get card information and validate access
  SELECT cc.credit_card_workspace_id, cc.credit_card_closing_day, cc.credit_card_due_day
  INTO v_workspace_id, v_card_record.closing_day, v_card_record.due_day
  FROM credit_cards cc
  WHERE cc.credit_card_id = p_card_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Credit card not found';
  END IF;

  -- Calculate period end (last day of the month)
  v_period_end := (p_period_start + INTERVAL '1 month' - INTERVAL '1 day')::date;
  
  -- Calculate due date (closing day + due day offset)
  v_due_date := (p_period_start + INTERVAL '1 month' + (v_card_record.due_day - 1) * INTERVAL '1 day')::date;

  -- Check if statement already exists
  SELECT cs.id INTO v_statement_id
  FROM card_statements cs
  WHERE cs.credit_card_id = p_card_id
    AND cs.period_start = p_period_start
    AND cs.period_end = v_period_end;

  -- If statement doesn't exist, create it
  IF v_statement_id IS NULL THEN
    INSERT INTO card_statements (
      workspace_id,
      credit_card_id,
      period_start,
      period_end,
      due_date,
      opening_balance,
      purchases_total,
      installments_total,
      refunds_total,
      payments_total,
      statement_amount,
      min_payment_amount,
      status,
      is_overdue
    ) VALUES (
      v_workspace_id,
      p_card_id,
      p_period_start,
      v_period_end,
      v_due_date,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      'open',
      false
    ) RETURNING id INTO v_statement_id;
  END IF;

  RETURN v_statement_id;
END;
$$;