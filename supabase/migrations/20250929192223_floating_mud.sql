@@ .. @@
 -- Function to ensure an open statement exists for a given period
 CREATE OR REPLACE FUNCTION ensure_open_statement(
   p_workspace_id uuid,
   p_credit_card_id uuid,
-  period_start date,
-  period_end date
+  p_period_start date,
+  p_period_end date
 ) RETURNS uuid AS $$
 DECLARE
   statement_id uuid;
@@ .. @@
   -- Check if statement already exists
   SELECT id INTO statement_id
   FROM card_statements
   WHERE credit_card_id = p_credit_card_id
-    AND period_start = ensure_open_statement.period_start
-    AND period_end = ensure_open_statement.period_end;
+    AND card_statements.period_start = p_period_start
+    AND card_statements.period_end = p_period_end;
   
   -- If not found, create new statement
   IF statement_id IS NULL THEN
@@ .. @@
     INSERT INTO card_statements (
       workspace_id,
       credit_card_id,
       period_start,
       period_end,
       due_date,
       status
     ) VALUES (
       p_workspace_id,
       p_credit_card_id,
-      ensure_open_statement.period_start,
-      ensure_open_statement.period_end,
-      ensure_open_statement.period_end + INTERVAL '10 days', -- Default 10 days after period end
+      p_period_start,
+      p_period_end,
+      p_period_end + INTERVAL '10 days', -- Default 10 days after period end
       'open'
     ) RETURNING id INTO statement_id;