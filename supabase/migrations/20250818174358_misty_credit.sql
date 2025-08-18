/*
  # Add color and icon fields to organizer modules

  1. Schema Updates
    - Add `color` and `icon` fields to credit_cards table
    - Add `color` and `icon` fields to accounts table  
    - Add `color` and `icon` fields to categories table
    - Add `color` and `icon` fields to cost_centers table
    - Add `current_balance` field to credit_cards table for wallet view

  2. Field Details
    - `color`: text field for hex color codes (e.g., #3B82F6)
    - `icon`: text field for icon names from Lucide React
    - `current_balance`: numeric field for credit card current balance
*/

-- Add color and icon fields to credit_cards
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'credit_cards' AND column_name = 'color'
  ) THEN
    ALTER TABLE credit_cards ADD COLUMN color text DEFAULT '#6366F1';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'credit_cards' AND column_name = 'icon'
  ) THEN
    ALTER TABLE credit_cards ADD COLUMN icon text DEFAULT 'CreditCard';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'credit_cards' AND column_name = 'current_balance'
  ) THEN
    ALTER TABLE credit_cards ADD COLUMN current_balance numeric(15,2) DEFAULT 0;
  END IF;
END $$;

-- Add color and icon fields to accounts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accounts' AND column_name = 'color'
  ) THEN
    ALTER TABLE accounts ADD COLUMN color text DEFAULT '#10B981';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accounts' AND column_name = 'icon'
  ) THEN
    ALTER TABLE accounts ADD COLUMN icon text DEFAULT 'Wallet';
  END IF;
END $$;

-- Add color and icon fields to categories
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'color'
  ) THEN
    ALTER TABLE categories ADD COLUMN color text DEFAULT '#F59E0B';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'icon'
  ) THEN
    ALTER TABLE categories ADD COLUMN icon text DEFAULT 'Tag';
  END IF;
END $$;

-- Add color and icon fields to cost_centers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cost_centers' AND column_name = 'color'
  ) THEN
    ALTER TABLE cost_centers ADD COLUMN color text DEFAULT '#8B5CF6';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cost_centers' AND column_name = 'icon'
  ) THEN
    ALTER TABLE cost_centers ADD COLUMN icon text DEFAULT 'Target';
  END IF;
END $$;