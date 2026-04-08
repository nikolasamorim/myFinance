import { apiClient } from '../lib/apiClient';

export type GenerationMode = 'on_save' | 'on_edit' | 'maintenance';

export interface EngineResult {
  success: boolean;
  generated: number;
  skippedDuplicates: number;
  ruleCompleted: boolean;
  error?: string;
}

/**
 * Trigger recurrence generation for a specific rule via the backend API.
 */
export async function generateRecurrences(
  ruleId: string,
  mode: GenerationMode,
  userId?: string,
  workspaceId?: string
): Promise<EngineResult> {
  // workspaceId is needed for the API call; if not provided, try to infer
  // from the calling context. The caller should always provide it.
  if (!workspaceId) {
    // Fallback: this shouldn't happen in normal flow
    console.warn('generateRecurrences called without workspaceId');
    return {
      success: false,
      generated: 0,
      skippedDuplicates: 0,
      ruleCompleted: false,
      error: 'workspaceId is required',
    };
  }

  return apiClient!.post<EngineResult>(
    `/workspaces/${workspaceId}/recurrence-rules/${ruleId}/generate`,
    { mode }
  );
}

/**
 * Run maintenance for all active recurrence rules in a workspace.
 */
export async function runMaintenanceForWorkspace(workspaceId: string): Promise<{
  rulesProcessed: number;
  totalGenerated: number;
  errors: Array<{ ruleId: string; message: string }>;
}> {
  return apiClient!.post<{
    rulesProcessed: number;
    totalGenerated: number;
    errors: Array<{ ruleId: string; message: string }>;
  }>(`/workspaces/${workspaceId}/recurrence-rules/maintenance`, {});
}
