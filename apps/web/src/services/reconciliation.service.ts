import { apiClient } from '../lib/apiClient';
import type {
  BankReconciliation,
  ReconciliationRow,
  ReconciliationSuggestion,
  ReconcilePayload,
  ReconciliationFilters,
  ImportedTransactionWithStatus,
  Transaction,
} from '@myfinance/shared';

function buildParams(filters: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, val] of Object.entries(filters)) {
    if (val !== undefined && val !== null && val !== '') params.set(key, String(val));
  }
  return params.toString();
}

export const reconciliationService = {
  async getImported(
    workspaceId: string,
    filters: ReconciliationFilters & { status?: 'pending' | 'reconciled' | 'ignored' }
  ): Promise<ImportedTransactionWithStatus[]> {
    const q = buildParams(filters);
    const res = await apiClient!.get<{ data: ImportedTransactionWithStatus[] }>(
      `/workspaces/${workspaceId}/reconciliations/imported${q ? `?${q}` : ''}`
    );
    return res.data;
  },

  async getReconciled(
    workspaceId: string,
    filters: ReconciliationFilters
  ): Promise<ReconciliationRow[]> {
    const q = buildParams(filters);
    const res = await apiClient!.get<{ data: ReconciliationRow[] }>(
      `/workspaces/${workspaceId}/reconciliations${q ? `?${q}` : ''}`
    );
    return res.data;
  },

  async getSuggestions(
    workspaceId: string,
    importedId: string
  ): Promise<ReconciliationSuggestion[]> {
    const res = await apiClient!.get<{ data: ReconciliationSuggestion[] }>(
      `/workspaces/${workspaceId}/reconciliations/suggestions/${importedId}`
    );
    return res.data;
  },

  async searchCandidates(
    workspaceId: string,
    params: ReconciliationFilters & { search?: string; page?: number; limit?: number }
  ): Promise<{ data: Transaction[]; total: number }> {
    const q = buildParams(params);
    return apiClient!.get<{ data: Transaction[]; total: number }>(
      `/workspaces/${workspaceId}/reconciliations/candidates${q ? `?${q}` : ''}`
    );
  },

  async reconcile(
    workspaceId: string,
    payload: ReconcilePayload
  ): Promise<BankReconciliation> {
    return apiClient!.post<BankReconciliation>(
      `/workspaces/${workspaceId}/reconciliations`,
      payload
    );
  },

  async dereconcile(workspaceId: string, reconciliationId: string): Promise<void> {
    return apiClient!.delete(`/workspaces/${workspaceId}/reconciliations/${reconciliationId}`);
  },

  async ignore(workspaceId: string, importedId: string): Promise<void> {
    return apiClient!.patch(`/workspaces/${workspaceId}/reconciliations/ignore/${importedId}`, {});
  },

  async unignore(workspaceId: string, importedId: string): Promise<void> {
    return apiClient!.patch(`/workspaces/${workspaceId}/reconciliations/unignore/${importedId}`, {});
  },

  async getSummary(workspaceId: string): Promise<{ account_id: string; pending_count: number }[]> {
    const res = await apiClient!.get<{ data: { account_id: string; pending_count: number }[] }>(
      `/workspaces/${workspaceId}/reconciliations/summary`
    );
    return res.data ?? [];
  },
};
