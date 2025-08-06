/*
  # Fix visualization trigger column reference

  1. Problem
    - Database trigger or RLS policy references non-existent column `user_updated_at`
    - Should reference `visualization_updated_at` instead
    
  2. Solution
    - Drop and recreate the trigger with correct column reference
    - Ensure the trigger function uses the correct column name
*/

-- Drop the existing trigger if it exists
DROP TRIGGER IF EXISTS update_visualizations_updated_at ON visualizations;
DROP TRIGGER IF EXISTS trigger_update_visualizations_updated_at ON visualizations;

-- Recreate the trigger with correct column reference
CREATE TRIGGER trigger_update_visualizations_updated_at
  BEFORE UPDATE ON visualizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Ensure the function exists and works correctly
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.visualization_updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';