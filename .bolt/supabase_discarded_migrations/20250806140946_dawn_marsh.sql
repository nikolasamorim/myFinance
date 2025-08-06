@@ .. @@
 /*
   # Add theme column to users table
 
   1. New Columns
     - `theme` (text, default 'light')
       - Stores user's preferred theme (light/dark)
       - Default value: 'light'
       - Constraint: only 'light' or 'dark' values allowed
 
   2. Data Migration
-    - No existing data migration needed as this is a new column
+    - Set all existing users to have 'light' theme as default
 */
 
 -- Add theme column if it doesn't exist
 DO $$
 BEGIN
   IF NOT EXISTS (
     SELECT 1 FROM information_schema.columns
     WHERE table_name = 'users' AND column_name = 'theme'
   ) THEN
     ALTER TABLE users ADD COLUMN theme TEXT DEFAULT 'light';
   END IF;
 END $$;
 
 -- Add constraint to ensure only valid theme values
 DO $$
 BEGIN
   IF NOT EXISTS (
     SELECT 1 FROM information_schema.constraint_column_usage
     WHERE table_name = 'users' AND constraint_name = 'users_theme_check'
   ) THEN
     ALTER TABLE users ADD CONSTRAINT users_theme_check 
     CHECK (theme IN ('light', 'dark'));
   END IF;
-END $$;