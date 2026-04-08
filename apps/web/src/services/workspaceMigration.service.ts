import { apiClient } from '../lib/apiClient';

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
    targetWorkspaceId: string,
    _userId: string
  ): Promise<MigrationPreview> {
    return apiClient!.post<MigrationPreview>(
      `/workspaces/${sourceWorkspaceId}/migrations/preview`,
      { target_workspace_id: targetWorkspaceId }
    );
  },

  async migrateSpecificAccounts(
    accountIds: string[],
    sourceWorkspaceId: string,
    targetWorkspaceId: string,
    _userId: string,
    options: {
      migrateTransactions?: boolean;
      migrateInstallments?: boolean;
    } = {}
  ): Promise<MigrationResult> {
    const {
      migrateTransactions = true,
      migrateInstallments = true,
    } = options;

    return apiClient!.post<MigrationResult>(
      `/workspaces/${sourceWorkspaceId}/migrations/execute`,
      {
        account_ids: accountIds,
        target_workspace_id: targetWorkspaceId,
        migrate_transactions: migrateTransactions,
        migrate_installments: migrateInstallments,
      }
    );
  },

  async migrateAllAccounts(
    sourceWorkspaceId: string,
    targetWorkspaceId: string,
    _userId: string,
    options: {
      migrateTransactions?: boolean;
      migrateInstallments?: boolean;
      migrateCategories?: boolean;
      migrateCostCenters?: boolean;
    } = {}
  ): Promise<MigrationResult> {
    const {
      migrateTransactions = true,
      migrateInstallments = true,
      migrateCategories = false,
      migrateCostCenters = false,
    } = options;

    return apiClient!.post<MigrationResult>(
      `/workspaces/${sourceWorkspaceId}/migrations/execute-all`,
      {
        target_workspace_id: targetWorkspaceId,
        migrate_transactions: migrateTransactions,
        migrate_installments: migrateInstallments,
        migrate_categories: migrateCategories,
        migrate_cost_centers: migrateCostCenters,
      }
    );
  },

  async getAccountsByWorkspace(workspaceId: string) {
    return apiClient!.get<any[]>(`/workspaces/${workspaceId}/migrations/accounts`);
  },

  async getWorkspaceDataSummary(workspaceId: string) {
    return apiClient!.get<{
      accountsCount: number;
      transactionsCount: number;
      categoriesCount: number;
      costCentersCount: number;
    }>(`/workspaces/${workspaceId}/migrations/summary`);
  },
};
