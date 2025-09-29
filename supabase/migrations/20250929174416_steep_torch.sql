@@ .. @@
 ALTER TABLE statement_payments ENABLE ROW LEVEL SECURITY;
 
 CREATE POLICY "Users can access statement payments in their workspaces" ON statement_payments FOR ALL TO authenticated USING (workspace_id IN (SELECT workspace_user_workspace_id FROM workspace_users WHERE workspace_user_user_id = uid()));
+
+-- RPC Functions
+CREATE OR REPLACE FUNCTION compute_statement_window(card_id uuid, anchor_date date)
+RETURNS TABLE(period_start date, period_end date, due_date date)
+LANGUAGE plpgsql
+AS $$
+DECLARE
+    closing_day integer;
+    due_day integer;
+    period_start_date date;
+    period_end_date date;
+    due_date_result date;
+BEGIN
+    SELECT credit_card_closing_day, credit_card_due_day 
+    INTO closing_day, due_day
+    FROM credit_cards 
+    WHERE credit_card_id = card_id;
+    
+    IF closing_day IS NULL OR due_day IS NULL THEN
+        RAISE EXCEPTION 'Credit card not found or missing closing/due days';
+    END IF;
+    
+    -- Calculate period start (previous month's closing day + 1)
+    IF EXTRACT(DAY FROM anchor_date) <= closing_day THEN
+        period_start_date := date_trunc('month', anchor_date - interval '1 month') + (closing_day || ' days')::interval + interval '1 day';
+    ELSE
+        period_start_date := date_trunc('month', anchor_date) + (closing_day || ' days')::interval + interval '1 day';
+    END IF;
+    
+    -- Calculate period end (current month's closing day)
+    period_end_date := period_start_date + interval '1 month' - interval '1 day';
+    
+    -- Calculate due date (next month's due day)
+    due_date_result := date_trunc('month', period_end_date + interval '1 month') + (due_day - 1 || ' days')::interval;
+    
+    RETURN QUERY SELECT period_start_date, period_end_date, due_date_result;
+END;
+$$;
+
+CREATE OR REPLACE FUNCTION ensure_open_statement(card_id uuid, period_start date)
+RETURNS uuid
+LANGUAGE plpgsql
+AS $$
+DECLARE
+    statement_id uuid;
+    workspace_id_val uuid;
+    period_end_val date;
+    due_date_val date;
+    opening_balance_val numeric(14,2) := 0;
+    prev_statement_amount numeric(14,2) := 0;
+    prev_payments_total numeric(14,2) := 0;
+BEGIN
+    SELECT credit_card_workspace_id INTO workspace_id_val
+    FROM credit_cards WHERE credit_card_id = card_id;
+    
+    -- Check if statement already exists
+    SELECT id INTO statement_id
+    FROM card_statements
+    WHERE credit_card_id = card_id AND period_start = period_start;
+    
+    IF statement_id IS NOT NULL THEN
+        RETURN statement_id;
+    END IF;
+    
+    -- Compute window for period_end and due_date
+    SELECT cw.period_end, cw.due_date INTO period_end_val, due_date_val
+    FROM compute_statement_window(card_id, period_start) cw;
+    
+    -- Calculate opening balance from previous statement
+    SELECT COALESCE(cs.statement_amount, 0), COALESCE(cs.payments_total, 0)
+    INTO prev_statement_amount, prev_payments_total
+    FROM card_statements cs
+    WHERE cs.credit_card_id = card_id 
+    AND cs.period_end < period_start
+    ORDER BY cs.period_end DESC
+    LIMIT 1;
+    
+    opening_balance_val := prev_statement_amount - prev_payments_total;
+    
+    -- Create new statement
+    INSERT INTO card_statements (
+        workspace_id, credit_card_id, period_start, period_end, due_date, 
+        opening_balance, status
+    ) VALUES (
+        workspace_id_val, card_id, period_start, period_end_val, due_date_val,
+        opening_balance_val, 'open'
+    ) RETURNING id INTO statement_id;
+    
+    RETURN statement_id;
+END;
+$$;
+
+CREATE OR REPLACE FUNCTION sync_item_from_transaction(transaction_id uuid)
+RETURNS void
+LANGUAGE plpgsql
+AS $$
+DECLARE
+    tx_record record;
+    statement_id uuid;
+    existing_item_id uuid;
+    item_type text;
+BEGIN
+    SELECT t.*, cc.credit_card_workspace_id
+    INTO tx_record
+    FROM transactions t
+    LEFT JOIN credit_cards cc ON t.transaction_card_id = cc.credit_card_id
+    WHERE t.transaction_id = sync_item_from_transaction.transaction_id;
+    
+    IF tx_record.payment_method != 'credit_card' OR tx_record.transaction_card_id IS NULL THEN
+        RETURN;
+    END IF;
+    
+    -- Compute window and ensure statement
+    SELECT ensure_open_statement(tx_record.transaction_card_id, 
+        (SELECT period_start FROM compute_statement_window(tx_record.transaction_card_id, tx_record.transaction_date) LIMIT 1)
+    ) INTO statement_id;
+    
+    -- Check for existing item
+    SELECT id INTO existing_item_id
+    FROM statement_items
+    WHERE transaction_id = sync_item_from_transaction.transaction_id;
+    
+    -- Determine item type
+    IF tx_record.installment_number IS NOT NULL THEN
+        item_type := 'installment';
+    ELSE
+        item_type := 'purchase';
+    END IF;
+    
+    IF existing_item_id IS NULL THEN
+        -- Create new item
+        INSERT INTO statement_items (
+            workspace_id, card_statement_id, credit_card_id, transaction_id,
+            type, occurred_at, description, amount, category_id, cost_center_id
+        ) VALUES (
+            tx_record.credit_card_workspace_id, statement_id, tx_record.transaction_card_id,
+            tx_record.transaction_id, item_type, tx_record.transaction_date,
+            tx_record.transaction_description, tx_record.transaction_amount,
+            tx_record.transaction_category_id, tx_record.transaction_cost_center_id
+        );
+    ELSE
+        -- Update existing item
+        UPDATE statement_items SET
+            occurred_at = tx_record.transaction_date,
+            description = tx_record.transaction_description,
+            amount = tx_record.transaction_amount,
+            category_id = tx_record.transaction_category_id,
+            cost_center_id = tx_record.transaction_cost_center_id
+        WHERE id = existing_item_id;
+    END IF;
+END;
+$$;
+
+CREATE OR REPLACE FUNCTION close_statement(statement_id uuid)
+RETURNS void
+LANGUAGE plpgsql
+AS $$
+DECLARE
+    purchases_sum numeric(14,2) := 0;
+    installments_sum numeric(14,2) := 0;
+    refunds_sum numeric(14,2) := 0;
+    payments_sum numeric(14,2) := 0;
+    opening_bal numeric(14,2);
+    statement_amt numeric(14,2);
+    min_payment numeric(14,2);
+BEGIN
+    -- Get opening balance
+    SELECT opening_balance INTO opening_bal
+    FROM card_statements WHERE id = statement_id;
+    
+    -- Calculate totals by type
+    SELECT 
+        COALESCE(SUM(CASE WHEN type = 'purchase' THEN amount ELSE 0 END), 0),
+        COALESCE(SUM(CASE WHEN type = 'installment' THEN amount ELSE 0 END), 0),
+        COALESCE(SUM(CASE WHEN type = 'refund' THEN ABS(amount) ELSE 0 END), 0),
+        COALESCE(SUM(CASE WHEN type = 'payment' THEN ABS(amount) ELSE 0 END), 0)
+    INTO purchases_sum, installments_sum, refunds_sum, payments_sum
+    FROM statement_items
+    WHERE card_statement_id = statement_id;
+    
+    statement_amt := opening_bal + purchases_sum + installments_sum - refunds_sum - payments_sum;
+    min_payment := LEAST(statement_amt, GREATEST(0.15 * (purchases_sum + installments_sum), 20));
+    
+    UPDATE card_statements SET
+        purchases_total = purchases_sum,
+        installments_total = installments_sum,
+        refunds_total = refunds_sum,
+        payments_total = payments_sum,
+        statement_amount = statement_amt,
+        min_payment_amount = min_payment,
+        status = 'closed',
+        closed_at = now()
+    WHERE id = statement_id;
+END;
+$$;
+
+CREATE OR REPLACE FUNCTION register_statement_payment(statement_id uuid, amount_param numeric, paid_at_param date, method_param text)
+RETURNS void
+LANGUAGE plpgsql
+AS $$
+DECLARE
+    workspace_id_val uuid;
+    card_id_val uuid;
+    new_payments_total numeric(14,2);
+    current_statement_amount numeric(14,2);
+    due_date_val date;
+BEGIN
+    SELECT workspace_id, credit_card_id, payments_total, statement_amount, due_date
+    INTO workspace_id_val, card_id_val, new_payments_total, current_statement_amount, due_date_val
+    FROM card_statements WHERE id = statement_id;
+    
+    -- Insert payment record
+    INSERT INTO statement_payments (workspace_id, card_statement_id, amount, paid_at, method)
+    VALUES (workspace_id_val, statement_id, amount_param, paid_at_param, method_param);
+    
+    -- Insert payment item (negative amount)
+    INSERT INTO statement_items (workspace_id, card_statement_id, credit_card_id, type, occurred_at, description, amount)
+    VALUES (workspace_id_val, statement_id, card_id_val, 'payment', paid_at_param, 'Payment - ' || method_param, -amount_param);
+    
+    -- Update statement totals and status
+    new_payments_total := new_payments_total + amount_param;
+    
+    UPDATE card_statements SET
+        payments_total = new_payments_total,
+        status = CASE 
+            WHEN new_payments_total >= current_statement_amount THEN 'paid_full'
+            WHEN new_payments_total > 0 THEN 'paid_partial'
+            ELSE status
+        END,
+        is_overdue = CASE 
+            WHEN CURRENT_DATE > due_date_val AND (current_statement_amount - new_payments_total) > 0 THEN true
+            ELSE is_overdue
+        END,
+        paid_at = CASE 
+            WHEN new_payments_total >= current_statement_amount THEN paid_at_param
+            ELSE paid_at
+        END
+    WHERE id = statement_id;
+END;
+$$;
+
+CREATE OR REPLACE FUNCTION move_item_to_next_cycle(statement_item_id uuid)
+RETURNS void
+LANGUAGE plpgsql
+AS $$
+DECLARE
+    item_record record;
+    next_statement_id uuid;
+    next_period_start date;
+BEGIN
+    SELECT si.*, cs.status as statement_status
+    INTO item_record
+    FROM statement_items si
+    JOIN card_statements cs ON si.card_statement_id = cs.id
+    WHERE si.id = statement_item_id;
+    
+    IF item_record.statement_status != 'open' THEN
+        RAISE EXCEPTION 'Can only move items from open statements';
+    END IF;
+    
+    -- Calculate next period start (add 1 month)
+    SELECT period_start + interval '1 month' INTO next_period_start
+    FROM card_statements WHERE id = item_record.card_statement_id;
+    
+    -- Ensure next statement exists
+    SELECT ensure_open_statement(item_record.credit_card_id, next_period_start) INTO next_statement_id;
+    
+    -- Move the item
+    UPDATE statement_items SET
+        card_statement_id = next_statement_id
+    WHERE id = statement_item_id;
+END;
+$$;