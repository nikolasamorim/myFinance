/*
  # Add theme preference to users table

  1. Changes
    - Add `theme` column to users table with default 'light'
    - Add constraint to ensure only 'light' or 'dark' values are allowed

  2. Security
    - No changes to RLS policies needed as theme is part of user profile
*/

-- Add theme column to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'theme'
  ) THEN
    ALTER TABLE users ADD COLUMN theme text DEFAULT 'light';
  END IF;
END $$;

-- Add constraint to ensure only valid theme values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_theme_check'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_theme_check 
    CHECK (theme IN ('light', 'dark'));
  END IF;
END $$;