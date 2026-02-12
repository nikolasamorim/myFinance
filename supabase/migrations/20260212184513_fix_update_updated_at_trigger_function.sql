/*
  # Fix update_updated_at_column() trigger function

  ## Problem
  The shared function `update_updated_at_column()` references `NEW.workspace_updated_at`,
  but only the `workspaces` table has that column. All other tables use `updated_at`.
  This causes: "record 'new' has no field 'workspace_updated_at'" on UPDATE
  for recurrence_rules, transactions, accounts, and every other table using this trigger.

  ## Changes

  1. Fix `update_updated_at_column()` to set `NEW.updated_at = now()` (the standard column)
  2. Create dedicated `update_workspace_updated_at_column()` for the `workspaces` table
  3. Reassign workspaces triggers to use the dedicated function
  4. Add `updated_at` column to tables that are missing it but have the trigger attached:
     - banks, brokers, cost_centers, people, users, visualizations
  5. Remove duplicate triggers (many tables had two identical triggers)

  ## Tables affected
  - workspaces: trigger reassigned to dedicated function
  - banks, brokers, cost_centers, people, users, visualizations: added updated_at column
  - All tables: duplicate triggers removed

  ## Security
  - No RLS changes
  - No policy changes
*/

-- Step 1: Create dedicated function for workspaces
CREATE OR REPLACE FUNCTION public.update_workspace_updated_at_column()
  RETURNS trigger
  LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.workspace_updated_at = now();
    RETURN NEW;
END;
$function$;

-- Step 2: Fix the shared function to use the standard updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
  RETURNS trigger
  LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

-- Step 3: Reassign workspaces triggers to the dedicated function
-- Drop both duplicate triggers on workspaces
DROP TRIGGER IF EXISTS trigger_update_workspaces_updated_at ON public.workspaces;
DROP TRIGGER IF EXISTS update_workspaces_updated_at ON public.workspaces;

-- Create single trigger using the dedicated function
CREATE TRIGGER trigger_update_workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION update_workspace_updated_at_column();

-- Step 4: Add updated_at column to tables missing it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'banks' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.banks ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'brokers' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.brokers ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cost_centers' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.cost_centers ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'people' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.people ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.users ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'visualizations' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.visualizations ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Step 5: Remove duplicate triggers on all tables (keep only the trigger_update_* variant)
DROP TRIGGER IF EXISTS update_people_updated_at ON public.people;
DROP TRIGGER IF EXISTS update_cost_centers_updated_at ON public.cost_centers;
DROP TRIGGER IF EXISTS update_banks_updated_at ON public.banks;
DROP TRIGGER IF EXISTS update_brokers_updated_at ON public.brokers;
DROP TRIGGER IF EXISTS update_credit_cards_updated_at ON public.credit_cards;
DROP TRIGGER IF EXISTS update_transactions_updated_at ON public.transactions;
DROP TRIGGER IF EXISTS update_credit_cards_updated_at_trigger ON public.credit_cards;
