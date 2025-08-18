/*
  # Fix categories table trigger

  1. Updates
    - Update the trigger function to use correct column name `category_updated_at`
    - Ensure the trigger works with the actual table schema

  2. Changes
    - Drop existing trigger that references incorrect column name
    - Create new trigger with correct column reference
*/

-- Drop existing triggers that might be using wrong column names
DROP TRIGGER IF EXISTS trigger_update_categories_updated_at ON categories;
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;

-- Create a specific trigger function for categories table
CREATE OR REPLACE FUNCTION update_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.category_updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create the trigger using the correct function
CREATE TRIGGER trigger_update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_categories_updated_at();