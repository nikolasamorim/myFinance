/*
  # Fix users table trigger column reference

  1. Problem
    - Database trigger on users table is referencing 'visualization_updated_at' column
    - This column doesn't exist on users table, causing all user operations to fail
    - The trigger should reference 'user_updated_at' instead

  2. Solution
    - Drop existing problematic trigger on users table
    - Recreate trigger with correct column reference
    - Ensure trigger function uses proper column name for users table

  3. Security
    - Maintains existing RLS policies
    - No changes to user permissions
*/

-- Drop existing trigger that has wrong column reference
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS trigger_update_users_updated_at ON users;

-- Recreate the trigger with correct column reference
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Ensure the trigger function works correctly for users table
-- The function should set NEW.user_updated_at = now() for users table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle different table types with their respective updated_at columns
  IF TG_TABLE_NAME = 'users' THEN
    NEW.user_updated_at = now();
  ELSIF TG_TABLE_NAME = 'visualizations' THEN
    NEW.visualization_updated_at = now();
  ELSIF TG_TABLE_NAME = 'transactions' THEN
    NEW.transaction_updated_at = now();
  ELSIF TG_TABLE_NAME = 'workspaces' THEN
    NEW.workspace_updated_at = now();
  ELSIF TG_TABLE_NAME = 'categories' THEN
    NEW.category_updated_at = now();
  ELSIF TG_TABLE_NAME = 'people' THEN
    NEW.person_updated_at = now();
  ELSIF TG_TABLE_NAME = 'cost_centers' THEN
    NEW.cost_center_updated_at = now();
  ELSIF TG_TABLE_NAME = 'banks' THEN
    NEW.bank_updated_at = now();
  ELSIF TG_TABLE_NAME = 'credit_cards' THEN
    NEW.credit_card_updated_at = now();
  ELSIF TG_TABLE_NAME = 'brokers' THEN
    NEW.broker_updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;