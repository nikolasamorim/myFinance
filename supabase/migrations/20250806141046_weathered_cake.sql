/*
  # Add theme column to users table

  1. New Column
    - `theme` (text, default 'light')
      - Stores user's preferred theme setting
      - Accepts values: 'light' or 'dark'
      - Default value: 'light'

  2. Data Migration
    - Set existing users to 'light' theme by default

  3. Constraints
    - Check constraint to ensure only valid theme values
*/

-- Add theme column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme text DEFAULT 'light';

-- Update existing users to have light theme as default
UPDATE users SET theme = 'light' WHERE theme IS NULL;

-- Add constraint to ensure only valid theme values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_theme_check' 
    AND table_name = 'users'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_theme_check 
    CHECK (theme IN ('light', 'dark'));
  END IF;
END $$;