import { supabase } from '../lib/supabase';

export interface MigrationPreview {
  source_workspace_id: string;
  target_workspace_id: string;
  accounts_to_migrate: number;
  transactions_to_migrate: number;
  installments_to_migrate: number;
  categories_to_migrate: number;
  cost_centers_to_migrate: number;
  credit_cards_to_migrate: number;
  warning: string;
  recommendation: string;
}

export interface MigrationResult {
  success: boolean;
  migrated_accounts: number;
  migrated_transactions: number;
  migrated_installments: number;
  migrated_categories?: number;
  migrated_cost_centers?: number;
  errors?: string[];
  message?: string;
  timestamp: string;
}

export const workspaceMigrationService = {
  async previewMigration(
    sourceWorkspaceId: string,
    targetWorkspaceId: string
  ): Promise<MigrationPreview> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase.rpc('preview_workspace_migration', {
      p_source_workspace_id: sourceWorkspaceId,
      p_target_workspace_id: targetWorkspaceId,
      p_user_id: user.id,
    });

    if (error) {
      console.error('Error previewing migration:', error);
      throw new Error(`Failed to preview migration: ${error.message}`);
    }

    return data as MigrationPreview;
  },

  async migrateSpecificAccounts(
    accountIds: string[],
    sourceWorkspaceId: string,
    targetWorkspaceId: string,
    options: {
      migrateTransactions?: boolean;
      migrateInstallments?: boolean;
    } = {}
  ): Promise<MigrationResult> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const {
      migrateTransactions = true,
      migrateInstallments = true,
    } = options;

    const { data, error } = await supabase.rpc('migrate_accounts_to_workspace', {
      p_account_ids: accountIds,
      p_source_workspace_id: sourceWorkspaceId,
      p_target_workspace_id: targetWorkspaceId,
      p_user_id: user.id,
      p_migrate_transactions: migrateTransactions,
      p_migrate_installments: migrateInstallments,
    });

    if (error) {
      console.error('Error migrating accounts:', error);
      throw new Error(`Failed to migrate accounts: ${error.message}`);
    }

    return data as MigrationResult;
  },

  async migrateAllAccounts(
    sourceWorkspaceId: string,
    targetWorkspaceId: string,
    options: {
      migrateTransactions?: boolean;
      migrateInstallments?: boolean;
      migrateCategories?: boolean;
      migrateCostCenters?: boolean;
    } = {}
  ): Promise<MigrationResult> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const {
      migrateTransactions = true,
      migrateInstallments = true,
      migrateCategories = false,
      migrateCostCenters = false,
    } = options;

    const { data, error } = await supabase.rpc('migrate_all_accounts_to_workspace', {
      p_source_workspace_id: sourceWorkspaceId,
      p_target_workspace_id: targetWorkspaceId,
      p_user_id: user.id,
      p_migrate_transactions: migrateTransactions,
      p_migrate_installments: migrateInstallments,
      p_migrate_categories: migrateCategories,
      p_migrate_cost_centers: migrateCostCenters,
    });

    if (error) {
      console.error('Error migrating all accounts:', error);
      throw new Error(`Failed to migrate all accounts: ${error.message}`);
    }

    return data as MigrationResult;
  },

  async getAccountsByWorkspace(workspaceId: string) {
    const { data, error } = await supabase
      .from('accounts')
      .select('id, title, type, initial_balance, workspace_id')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching accounts:', error);
      throw new Error(`Failed to fetch accounts: ${error.message}`);
    }

    return data || [];
  },

  async getWorkspaceDataSummary(workspaceId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const [accountsData, transactionsData, categoriesData, costCentersData] = await Promise.all([
      supabase.from('accounts').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
      supabase.from('transactions').select('transaction_id', { count: 'exact', head: true }).eq('transaction_workspace_id', workspaceId),
      supabase.from('categories').select('category_id', { count: 'exact', head: true }).eq('category_workspace_id', workspaceId),
      supabase.from('cost_centers').select('cost_center_id', { count: 'exact', head: true }).eq('cost_center_workspace_id', workspaceId),
    ]);

    return {
      accountsCount: accountsData.count || 0,
      transactionsCount: transactionsData.count || 0,
      categoriesCount: categoriesData.count || 0,
      costCentersCount: costCentersData.count || 0,
    };
  },
};
