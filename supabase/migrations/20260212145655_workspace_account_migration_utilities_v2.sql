/*
  # Workspace Data Migration Utilities

  ## Summary
  Creates utilities for migrating accounts and related data between workspaces safely.

  ## New Functions
  - `migrate_accounts_to_workspace`: Migrates specific accounts from one workspace to another
  - `migrate_all_user_data_to_workspace`: Migrates all data from one workspace to another for a user

  ## Security
  - Functions use SECURITY DEFINER to bypass RLS temporarily
  - Includes validation checks to ensure user has permission on both workspaces
  - Logs all migrations to activity_logs table

  ## Related Tables Modified
  - accounts: workspace_id updated
  - transactions: workspace_id updated
  - installment_groups: workspace_id updated
  - credit_cards: workspace_id updated (if needed)
  - categories: workspace_id updated (if needed)
  - cost_centers: workspace_id updated (if needed)
*/

-- ============================================================================
-- FUNCTION 1: Migrate specific accounts between workspaces
-- ============================================================================
CREATE OR REPLACE FUNCTION migrate_accounts_to_workspace(
  p_account_ids uuid[],
  p_source_workspace_id uuid,
  p_target_workspace_id uuid,
  p_user_id uuid,
  p_migrate_transactions boolean DEFAULT true,
  p_migrate_installments boolean DEFAULT true
)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_account_id uuid;
  v_migrated_accounts integer := 0;
  v_migrated_transactions integer := 0;
  v_migrated_installments integer := 0;
  v_transaction_count integer := 0;
  v_installment_count integer := 0;
  v_errors text[] := ARRAY[]::text[];
  v_result jsonb;
BEGIN
  -- Validation: Check if user has access to source workspace
  IF NOT EXISTS (
    SELECT 1 FROM workspaces
    WHERE workspace_id = p_source_workspace_id
      AND (workspace_owner_user_id = p_user_id
           OR EXISTS (
             SELECT 1 FROM workspace_users
             WHERE workspace_user_workspace_id = p_source_workspace_id
               AND workspace_user_user_id = p_user_id
           ))
  ) THEN
    RAISE EXCEPTION 'User does not have access to source workspace';
  END IF;

  -- Validation: Check if user has access to target workspace
  IF NOT EXISTS (
    SELECT 1 FROM workspaces
    WHERE workspace_id = p_target_workspace_id
      AND (workspace_owner_user_id = p_user_id
           OR EXISTS (
             SELECT 1 FROM workspace_users
             WHERE workspace_user_workspace_id = p_target_workspace_id
               AND workspace_user_user_id = p_user_id
           ))
  ) THEN
    RAISE EXCEPTION 'User does not have access to target workspace';
  END IF;

  -- Migrate each account
  FOREACH v_account_id IN ARRAY p_account_ids
  LOOP
    BEGIN
      -- Verify account belongs to source workspace
      IF NOT EXISTS (
        SELECT 1 FROM accounts
        WHERE id = v_account_id AND workspace_id = p_source_workspace_id
      ) THEN
        v_errors := array_append(v_errors, 'Account ' || v_account_id || ' not found in source workspace');
        CONTINUE;
      END IF;

      -- Update account workspace_id
      UPDATE accounts
      SET workspace_id = p_target_workspace_id,
          updated_at = now()
      WHERE id = v_account_id;

      v_migrated_accounts := v_migrated_accounts + 1;

      -- Migrate transactions if requested
      IF p_migrate_transactions THEN
        UPDATE transactions
        SET transaction_workspace_id = p_target_workspace_id,
            transaction_updated_at = now()
        WHERE transaction_bank_id = v_account_id
          AND transaction_workspace_id = p_source_workspace_id;

        GET DIAGNOSTICS v_transaction_count = ROW_COUNT;
        v_migrated_transactions := v_migrated_transactions + v_transaction_count;
      END IF;

      -- Migrate installment groups if requested
      IF p_migrate_installments THEN
        UPDATE installment_groups
        SET workspace_id = p_target_workspace_id,
            updated_at = now()
        WHERE account_id = v_account_id
          AND workspace_id = p_source_workspace_id;

        GET DIAGNOSTICS v_installment_count = ROW_COUNT;
        v_migrated_installments := v_migrated_installments + v_installment_count;
      END IF;

      -- Log migration to activity_logs
      INSERT INTO activity_logs (
        user_id,
        workspace_id,
        activity_type,
        entity_table,
        entity_id,
        description,
        metadata
      ) VALUES (
        p_user_id,
        p_target_workspace_id,
        'migrate',
        'accounts',
        v_account_id,
        'Account migrated from workspace ' || p_source_workspace_id || ' to ' || p_target_workspace_id,
        jsonb_build_object(
          'source_workspace_id', p_source_workspace_id,
          'target_workspace_id', p_target_workspace_id,
          'account_id', v_account_id,
          'migrated_transactions', p_migrate_transactions,
          'migrated_installments', p_migrate_installments
        )
      );

    EXCEPTION WHEN OTHERS THEN
      v_errors := array_append(v_errors, 'Error migrating account ' || v_account_id || ': ' || SQLERRM);
    END;
  END LOOP;

  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'migrated_accounts', v_migrated_accounts,
    'migrated_transactions', v_migrated_transactions,
    'migrated_installments', v_migrated_installments,
    'errors', v_errors,
    'timestamp', now()
  );

  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION migrate_accounts_to_workspace TO authenticated;

COMMENT ON FUNCTION migrate_accounts_to_workspace IS 'Migrates specific accounts and optionally their transactions/installments from one workspace to another. Requires user to have access to both workspaces.';

-- ============================================================================
-- FUNCTION 2: Migrate ALL accounts from one workspace to another
-- ============================================================================
CREATE OR REPLACE FUNCTION migrate_all_accounts_to_workspace(
  p_source_workspace_id uuid,
  p_target_workspace_id uuid,
  p_user_id uuid,
  p_migrate_transactions boolean DEFAULT true,
  p_migrate_installments boolean DEFAULT true,
  p_migrate_categories boolean DEFAULT false,
  p_migrate_cost_centers boolean DEFAULT false
)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_account_ids uuid[];
  v_migrated_accounts integer := 0;
  v_migrated_transactions integer := 0;
  v_migrated_installments integer := 0;
  v_migrated_categories integer := 0;
  v_migrated_cost_centers integer := 0;
  v_result jsonb;
BEGIN
  -- Validation: Check if user has access to both workspaces
  IF NOT EXISTS (
    SELECT 1 FROM workspaces
    WHERE workspace_id = p_source_workspace_id
      AND (workspace_owner_user_id = p_user_id
           OR EXISTS (
             SELECT 1 FROM workspace_users
             WHERE workspace_user_workspace_id = p_source_workspace_id
               AND workspace_user_user_id = p_user_id
           ))
  ) THEN
    RAISE EXCEPTION 'User does not have access to source workspace';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM workspaces
    WHERE workspace_id = p_target_workspace_id
      AND (workspace_owner_user_id = p_user_id
           OR EXISTS (
             SELECT 1 FROM workspace_users
             WHERE workspace_user_workspace_id = p_target_workspace_id
               AND workspace_user_user_id = p_user_id
           ))
  ) THEN
    RAISE EXCEPTION 'User does not have access to target workspace';
  END IF;

  -- Get all account IDs from source workspace
  SELECT array_agg(id)
  INTO v_account_ids
  FROM accounts
  WHERE workspace_id = p_source_workspace_id;

  -- If no accounts found, return early
  IF v_account_ids IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'No accounts found in source workspace',
      'migrated_accounts', 0
    );
  END IF;

  -- Migrate categories first (if requested) to maintain referential integrity
  IF p_migrate_categories THEN
    UPDATE categories
    SET category_workspace_id = p_target_workspace_id,
        category_updated_at = now()
    WHERE category_workspace_id = p_source_workspace_id;

    GET DIAGNOSTICS v_migrated_categories = ROW_COUNT;
  END IF;

  -- Migrate cost centers (if requested)
  IF p_migrate_cost_centers THEN
    UPDATE cost_centers
    SET cost_center_workspace_id = p_target_workspace_id,
        cost_center_updated_at = now()
    WHERE cost_center_workspace_id = p_source_workspace_id;

    GET DIAGNOSTICS v_migrated_cost_centers = ROW_COUNT;
  END IF;

  -- Migrate accounts
  UPDATE accounts
  SET workspace_id = p_target_workspace_id,
      updated_at = now()
  WHERE workspace_id = p_source_workspace_id;

  GET DIAGNOSTICS v_migrated_accounts = ROW_COUNT;

  -- Migrate transactions (if requested)
  IF p_migrate_transactions THEN
    UPDATE transactions
    SET transaction_workspace_id = p_target_workspace_id,
        transaction_updated_at = now()
    WHERE transaction_workspace_id = p_source_workspace_id;

    GET DIAGNOSTICS v_migrated_transactions = ROW_COUNT;
  END IF;

  -- Migrate installment groups (if requested)
  IF p_migrate_installments THEN
    UPDATE installment_groups
    SET workspace_id = p_target_workspace_id,
        updated_at = now()
    WHERE workspace_id = p_source_workspace_id;

    GET DIAGNOSTICS v_migrated_installments = ROW_COUNT;
  END IF;

  -- Log migration
  INSERT INTO activity_logs (
    user_id,
    workspace_id,
    activity_type,
    entity_table,
    entity_id,
    description,
    metadata
  ) VALUES (
    p_user_id,
    p_target_workspace_id,
    'migrate_all',
    'workspaces',
    p_source_workspace_id,
    'All data migrated from workspace ' || p_source_workspace_id || ' to ' || p_target_workspace_id,
    jsonb_build_object(
      'source_workspace_id', p_source_workspace_id,
      'target_workspace_id', p_target_workspace_id,
      'migrated_accounts', v_migrated_accounts,
      'migrated_transactions', v_migrated_transactions,
      'migrated_installments', v_migrated_installments,
      'migrated_categories', v_migrated_categories,
      'migrated_cost_centers', v_migrated_cost_centers
    )
  );

  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'migrated_accounts', v_migrated_accounts,
    'migrated_transactions', v_migrated_transactions,
    'migrated_installments', v_migrated_installments,
    'migrated_categories', v_migrated_categories,
    'migrated_cost_centers', v_migrated_cost_centers,
    'timestamp', now()
  );

  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION migrate_all_accounts_to_workspace TO authenticated;

COMMENT ON FUNCTION migrate_all_accounts_to_workspace IS 'Migrates ALL accounts and optionally related data (transactions, categories, cost centers) from one workspace to another. Use with caution!';

-- ============================================================================
-- FUNCTION 3: Get migration preview (dry run)
-- ============================================================================
CREATE OR REPLACE FUNCTION preview_workspace_migration(
  p_source_workspace_id uuid,
  p_target_workspace_id uuid,
  p_user_id uuid
)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_result jsonb;
  v_accounts_count integer;
  v_transactions_count integer;
  v_installments_count integer;
  v_categories_count integer;
  v_cost_centers_count integer;
  v_credit_cards_count integer;
BEGIN
  -- Validation: Check user access
  IF NOT EXISTS (
    SELECT 1 FROM workspaces
    WHERE workspace_id = p_source_workspace_id
      AND (workspace_owner_user_id = p_user_id
           OR EXISTS (
             SELECT 1 FROM workspace_users
             WHERE workspace_user_workspace_id = p_source_workspace_id
               AND workspace_user_user_id = p_user_id
           ))
  ) THEN
    RAISE EXCEPTION 'User does not have access to source workspace';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM workspaces
    WHERE workspace_id = p_target_workspace_id
      AND (workspace_owner_user_id = p_user_id
           OR EXISTS (
             SELECT 1 FROM workspace_users
             WHERE workspace_user_workspace_id = p_target_workspace_id
               AND workspace_user_user_id = p_user_id
           ))
  ) THEN
    RAISE EXCEPTION 'User does not have access to target workspace';
  END IF;

  -- Count records to be migrated
  SELECT COUNT(*) INTO v_accounts_count
  FROM accounts
  WHERE workspace_id = p_source_workspace_id;

  SELECT COUNT(*) INTO v_transactions_count
  FROM transactions
  WHERE transaction_workspace_id = p_source_workspace_id;

  SELECT COUNT(*) INTO v_installments_count
  FROM installment_groups
  WHERE workspace_id = p_source_workspace_id;

  SELECT COUNT(*) INTO v_categories_count
  FROM categories
  WHERE category_workspace_id = p_source_workspace_id;

  SELECT COUNT(*) INTO v_cost_centers_count
  FROM cost_centers
  WHERE cost_center_workspace_id = p_source_workspace_id;

  SELECT COUNT(*) INTO v_credit_cards_count
  FROM credit_cards
  WHERE credit_card_workspace_id = p_source_workspace_id;

  -- Build result
  v_result := jsonb_build_object(
    'source_workspace_id', p_source_workspace_id,
    'target_workspace_id', p_target_workspace_id,
    'accounts_to_migrate', v_accounts_count,
    'transactions_to_migrate', v_transactions_count,
    'installments_to_migrate', v_installments_count,
    'categories_to_migrate', v_categories_count,
    'cost_centers_to_migrate', v_cost_centers_count,
    'credit_cards_to_migrate', v_credit_cards_count,
    'warning', 'This is a preview only. No data has been migrated.',
    'recommendation', CASE
      WHEN v_transactions_count > 0 THEN 'Migration will affect ' || v_transactions_count || ' transactions. Review carefully before proceeding.'
      ELSE 'Safe to proceed with migration.'
    END
  );

  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION preview_workspace_migration TO authenticated;

COMMENT ON FUNCTION preview_workspace_migration IS 'Provides a preview of what would be migrated between workspaces without actually migrating data. Use this before running actual migrations.';
