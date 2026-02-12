import { supabase } from '../lib/supabase';
import { RecurrenceRule, Transaction } from '../types';
import {
  calculateNextRecurrenceDate,
  formatDateToISO,
  shouldGenerateRecurrence,
  validateRecurrenceRule
} from '../utils/recurrence.utils';

export interface GenerationResult {
  success: boolean;
  transactionsGenerated: number;
  rulesProcessed: number;
  errors: Array<{ ruleId: string; message: string }>;
}

export const generateRecurringTransactions = async (
  workspaceId: string,
  userId: string,
  runDate: Date = new Date()
): Promise<GenerationResult> => {
  const result: GenerationResult = {
    success: true,
    transactionsGenerated: 0,
    rulesProcessed: 0,
    errors: []
  };

  try {
    const eligibleRules = await fetchEligibleRules(workspaceId, userId, runDate);

    for (const rule of eligibleRules) {
      try {
        const generated = await processRecurrenceRule(rule, runDate);
        result.transactionsGenerated += generated;
        result.rulesProcessed += 1;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push({
          ruleId: rule.id,
          message: errorMessage
        });
        await recordRuleError(rule.id, errorMessage);
      }
    }
  } catch (error) {
    result.success = false;
    console.error('Error in generateRecurringTransactions:', error);
  }

  return result;
};

const fetchEligibleRules = async (
  workspaceId: string,
  userId: string,
  runDate: Date
): Promise<RecurrenceRule[]> => {
  const todayISO = formatDateToISO(runDate);

  const { data, error } = await supabase
    .from('recurrence_rules')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('status', 'ACTIVE')
    .lte('next_run_at', todayISO)
    .order('next_run_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch eligible rules: ${error.message}`);
  }

  return (data || []) as RecurrenceRule[];
};

const processRecurrenceRule = async (
  rule: RecurrenceRule,
  runDate: Date
): Promise<number> => {
  let generatedCount = 0;
  let currentDate = new Date(rule.next_run_at!);
  const maxIterations = 100;
  let iterations = 0;

  while (currentDate <= runDate && iterations < maxIterations) {
    iterations++;

    const calculationResult = calculateNextRecurrenceDate(rule, currentDate);

    if (calculationResult.shouldStop) {
      await updateRuleAsCompleted(rule.id, calculationResult.reason);
      break;
    }

    const instanceDate = formatDateToISO(currentDate);
    const transactionCreated = await createRecurringTransaction(
      rule,
      instanceDate,
      rule.generation_count + generatedCount + 1
    );

    if (transactionCreated) {
      generatedCount++;
    }

    currentDate = calculationResult.nextDate;
  }

  if (generatedCount > 0) {
    await updateRuleAfterGeneration(rule, currentDate, generatedCount);
  }

  return generatedCount;
};

const createRecurringTransaction = async (
  rule: RecurrenceRule,
  instanceDate: string,
  sequence: number
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('transactions')
      .insert({
        transaction_workspace_id: rule.workspace_id,
        transaction_user_id: rule.created_by_user_id,
        transaction_type: rule.transaction_type,
        transaction_description: rule.description,
        transaction_amount: rule.amount,
        transaction_date: instanceDate,
        transaction_issue_date: instanceDate,
        transaction_competence_date: instanceDate,
        transaction_payment_method: 'other',
        transaction_is_paid: false,
        transaction_status: 'pending',
        transaction_bank_id: rule.account_id,
        category_id: rule.category_id,
        notes: rule.notes,
        recurrence_instance_date: instanceDate,
        recurrence_sequence: sequence,
        parent_recurrence_rule_id: rule.id,
        is_recurrence_generated: true,
        generated_at: new Date().toISOString(),
        version: 1
      });

    if (error) {
      if (error.code === '23505') {
        console.log(`Transaction already exists for rule ${rule.id} on ${instanceDate} (idempotent)`);
        return false;
      }
      throw error;
    }

    return true;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === '23505') {
      return false;
    }
    throw error;
  }
};

const updateRuleAfterGeneration = async (
  rule: RecurrenceRule,
  nextRunDate: Date,
  generatedCount: number
): Promise<void> => {
  const updates: any = {
    last_generated_at: new Date().toISOString(),
    next_run_at: formatDateToISO(nextRunDate),
    generation_count: rule.generation_count + generatedCount,
    error_count: 0,
    last_error_at: null,
    last_error_message: null,
    updated_at: new Date().toISOString()
  };

  if (rule.repeat_count && updates.generation_count >= rule.repeat_count) {
    updates.status = 'COMPLETED';
    updates.next_run_at = null;
  }

  const { error } = await supabase
    .from('recurrence_rules')
    .update(updates)
    .eq('id', rule.id);

  if (error) {
    throw new Error(`Failed to update rule after generation: ${error.message}`);
  }
};

const updateRuleAsCompleted = async (ruleId: string, reason?: string): Promise<void> => {
  const { error } = await supabase
    .from('recurrence_rules')
    .update({
      status: 'COMPLETED',
      next_run_at: null,
      last_error_message: reason || 'Rule completed',
      updated_at: new Date().toISOString()
    })
    .eq('id', ruleId);

  if (error) {
    throw new Error(`Failed to mark rule as completed: ${error.message}`);
  }
};

const recordRuleError = async (ruleId: string, errorMessage: string): Promise<void> => {
  const { data: currentRule } = await supabase
    .from('recurrence_rules')
    .select('error_count')
    .eq('id', ruleId)
    .single();

  const newErrorCount = (currentRule?.error_count || 0) + 1;
  const updates: any = {
    error_count: newErrorCount,
    last_error_at: new Date().toISOString(),
    last_error_message: errorMessage,
    updated_at: new Date().toISOString()
  };

  if (newErrorCount >= 10) {
    updates.status = 'ERROR';
    updates.next_run_at = null;
  }

  await supabase
    .from('recurrence_rules')
    .update(updates)
    .eq('id', ruleId);
};

export const createRecurrenceRule = async (
  ruleData: Partial<RecurrenceRule>
): Promise<{ success: boolean; rule?: RecurrenceRule; errors?: string[] }> => {
  const validation = validateRecurrenceRule(ruleData);

  if (!validation.valid) {
    return {
      success: false,
      errors: validation.errors
    };
  }

  const nextRunAt = ruleData.start_date;

  const { data, error } = await supabase
    .from('recurrence_rules')
    .insert({
      ...ruleData,
      next_run_at: nextRunAt,
      generation_count: 0,
      error_count: 0,
      status: 'ACTIVE',
      timezone: ruleData.timezone || 'UTC',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    return {
      success: false,
      errors: [error.message]
    };
  }

  return {
    success: true,
    rule: data as RecurrenceRule
  };
};

export const updateRecurrenceRule = async (
  ruleId: string,
  updates: Partial<RecurrenceRule>,
  affectFutureOnly: boolean = true
): Promise<{ success: boolean; errors?: string[] }> => {
  const validation = validateRecurrenceRule(updates);

  if (!validation.valid) {
    return {
      success: false,
      errors: validation.errors
    };
  }

  if (affectFutureOnly) {
    const today = formatDateToISO(new Date());
    await supabase
      .from('transactions')
      .delete()
      .eq('parent_recurrence_rule_id', ruleId)
      .gte('recurrence_instance_date', today);
  }

  const { error } = await supabase
    .from('recurrence_rules')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', ruleId);

  if (error) {
    return {
      success: false,
      errors: [error.message]
    };
  }

  return { success: true };
};

export const cancelRecurrenceRule = async (
  ruleId: string,
  deleteFutureTransactions: boolean = true
): Promise<{ success: boolean; errors?: string[] }> => {
  if (deleteFutureTransactions) {
    const today = formatDateToISO(new Date());
    await supabase
      .from('transactions')
      .delete()
      .eq('parent_recurrence_rule_id', ruleId)
      .gte('recurrence_instance_date', today);
  }

  const { error } = await supabase
    .from('recurrence_rules')
    .update({
      status: 'INACTIVE',
      next_run_at: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', ruleId);

  if (error) {
    return {
      success: false,
      errors: [error.message]
    };
  }

  return { success: true };
};

export const pauseRecurrenceRule = async (ruleId: string): Promise<{ success: boolean; errors?: string[] }> => {
  const { error } = await supabase
    .from('recurrence_rules')
    .update({
      status: 'PAUSED',
      updated_at: new Date().toISOString()
    })
    .eq('id', ruleId);

  if (error) {
    return {
      success: false,
      errors: [error.message]
    };
  }

  return { success: true };
};

export const resumeRecurrenceRule = async (ruleId: string): Promise<{ success: boolean; errors?: string[] }> => {
  const { data: rule } = await supabase
    .from('recurrence_rules')
    .select('*')
    .eq('id', ruleId)
    .single();

  if (!rule) {
    return {
      success: false,
      errors: ['Rule not found']
    };
  }

  const today = new Date();
  const nextRunDate = calculateNextRecurrenceDate(rule as RecurrenceRule, today);

  const { error } = await supabase
    .from('recurrence_rules')
    .update({
      status: 'ACTIVE',
      next_run_at: formatDateToISO(nextRunDate.nextDate),
      updated_at: new Date().toISOString()
    })
    .eq('id', ruleId);

  if (error) {
    return {
      success: false,
      errors: [error.message]
    };
  }

  return { success: true };
};

export const getRecurrenceRulesByWorkspace = async (
  workspaceId: string,
  userId: string
): Promise<RecurrenceRule[]> => {
  const { data, error } = await supabase
    .from('recurrence_rules')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch recurrence rules: ${error.message}`);
  }

  return (data || []) as RecurrenceRule[];
};

export const getTransactionsByRecurrenceRule = async (
  ruleId: string
): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('parent_recurrence_rule_id', ruleId)
    .order('recurrence_instance_date', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch transactions for rule: ${error.message}`);
  }

  return (data || []) as Transaction[];
};
