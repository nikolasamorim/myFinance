import { supabase } from '../lib/supabase';
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
  const { data, error } = await supabase
    .from('recurrence_rules')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch recurrence rules: ${error.message}`);
  return data || [];
};

export const getTransactionsByRecurrenceRule = async (
  ruleId: string,
) => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('parent_recurrence_rule_id', ruleId)
    .order('recurrence_instance_date', { ascending: true });

  if (error) throw new Error(`Failed to fetch transactions for rule: ${error.message}`);
  return data || [];
};
