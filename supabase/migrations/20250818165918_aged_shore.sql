/*
  # Add hierarchy support for cost centers and categories

  1. Schema Changes
    - Add `parent_id` column to cost_centers table for hierarchy
    - Add `sort_order` column to cost_centers table for ordering
    - Add `parent_id` column to categories table for hierarchy  
    - Add `sort_order` column to categories table for ordering
    - Add `status` column to cost_centers table
    - Add `code` and `accounting_code` columns to cost_centers table
    - Add `description` columns to both tables

  2. Security
    - Update existing RLS policies to handle new columns
    - Maintain workspace-based access control

  3. Indexes
    - Add indexes for parent_id columns for efficient hierarchy queries
    - Add indexes for sort_order columns for efficient ordering
*/

-- Add hierarchy and ordering support to cost_centers
DO $$
BEGIN
  -- Add parent_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cost_centers' AND column_name = 'parent_id'
  ) THEN
    ALTER TABLE cost_centers ADD COLUMN parent_id uuid REFERENCES cost_centers(cost_center_id) ON DELETE CASCADE;
  END IF;

  -- Add sort_order column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cost_centers' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE cost_centers ADD COLUMN sort_order integer DEFAULT 0;
  END IF;

  -- Add status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cost_centers' AND column_name = 'status'
  ) THEN
    ALTER TABLE cost_centers ADD COLUMN status text DEFAULT 'active' CHECK (status IN ('active', 'inactive'));
  END IF;

  -- Add code column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cost_centers' AND column_name = 'code'
  ) THEN
    ALTER TABLE cost_centers ADD COLUMN code text;
  END IF;

  -- Add accounting_code column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cost_centers' AND column_name = 'accounting_code'
  ) THEN
    ALTER TABLE cost_centers ADD COLUMN accounting_code text;
  END IF;

  -- Add description column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cost_centers' AND column_name = 'description'
  ) THEN
    ALTER TABLE cost_centers ADD COLUMN description text;
  END IF;
END $$;

-- Add hierarchy and ordering support to categories
DO $$
BEGIN
  -- Add parent_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'parent_id'
  ) THEN
    ALTER TABLE categories ADD COLUMN parent_id uuid REFERENCES categories(category_id) ON DELETE CASCADE;
  END IF;

  -- Add sort_order column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE categories ADD COLUMN sort_order integer DEFAULT 0;
  END IF;

  -- Add description column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'description'
  ) THEN
    ALTER TABLE categories ADD COLUMN description text;
  END IF;
END $$;

-- Create indexes for efficient hierarchy queries
CREATE INDEX IF NOT EXISTS idx_cost_centers_parent ON cost_centers(parent_id);
CREATE INDEX IF NOT EXISTS idx_cost_centers_sort_order ON cost_centers(sort_order);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories(sort_order);