import { apiClient } from '../lib/apiClient';
import {
  generateRecurrences,
  runMaintenanceForWorkspace,
  type GenerationMode,
  type EngineResult,
} from './recurrenceEngine.service';

export type { EngineResult };
export { generateRecurrences, runMaintenanceForWorkspace };

export interface GenerationResult {
  success: boolean;
  transactionsGenerated: number;
  rulesProcessed: number;
  errors: Array<{ ruleId: string; message: string }>;
}

export const generateRecurringTransactions = async (
  workspaceId: string,
): Promise<GenerationResult> => {
  const result = await runMaintenanceForWorkspace(workspaceId);

  return {
    success: result.errors.length === 0,
    transactionsGenerated: result.totalGenerated,
    rulesProcessed: result.rulesProcessed,
    errors: result.errors,
  };
};

export const getRecurrenceRulesByWorkspace = async (
  workspaceId: string,
) => {
  const data = await apiClient!.get<any[]>(`/workspaces/${workspaceId}/recurrence-rules`);
  return data || [];
};

export const getTransactionsByRecurrenceRule = async (
  ruleId: string,
  workspaceId: string,
) => {
  const params = new URLSearchParams({
    parent_recurrence_rule_id: ruleId,
  });
  const result = await apiClient!.get<{ data: any[] }>(`/workspaces/${workspaceId}/transactions?${params}`);
  return result.data || [];
};
