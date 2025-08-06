/*
  # Add theme column to users table

  1. Changes
    - Add `theme` column to `users` table
    - Set default value to 'light'
    - Add constraint to ensure only valid theme values

  2. Security
    - No RLS changes needed as users table already has proper policies
*/

-- Add theme column to users table
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
END $$;