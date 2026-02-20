import { supabase } from '../lib/supabase';

const MAX_INSERTIONS_PER_RUN = 500;
const HORIZON_MONTHS = 6;

export type GenerationMode = 'on_save' | 'on_edit' | 'maintenance';

export interface EngineResult {
  success: boolean;
  generated: number;
  skippedDuplicates: number;
  ruleCompleted: boolean;
  error?: string;
}

interface RuleRow {
  id: string;
  workspace_id: string;
  created_by_user_id: string | null;
  transaction_type: string;
  description: string;
  amount: number | null;
  start_date: string;
  recurrence_type: string;
  recurrence_day: string | null;
  repeat_count: number | null;
  end_date: string | null;
  due_adjustment: string | null;
  status: string;
  generation_count: number;
  generated_until: string | null;
  account_id: string | null;
  category_id: string | null;
  notes: string | null;
}

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
  return result;
}

function getHorizonDate(): Date {
  return addMonths(new Date(), HORIZON_MONTHS);
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function applyDueAdjustment(
  year: number,
  month: number,
  targetDay: number,
  adjustment: string | null
): number {
  const maxDay = getDaysInMonth(year, month);
  if (targetDay <= maxDay) return targetDay;

  switch (adjustment) {
    case 'previous_business_day':
      return maxDay;
    case 'next_business_day':
      return 1;
    default:
      return maxDay;
  }
}

function computeOccurrenceDates(rule: RuleRow, fromDate: Date, horizon: Date): string[] {
  const dates: string[] = [];
  const startDate = parseLocalDate(rule.start_date);
  const endDate = rule.end_date ? parseLocalDate(rule.end_date) : null;
  const effectiveEnd = endDate && endDate < horizon ? endDate : horizon;
  const recurrenceDay = rule.recurrence_day ? parseInt(rule.recurrence_day, 10) : startDate.getDate();

  let current: Date;

  switch (rule.recurrence_type) {
    case 'daily': {
      current = new Date(fromDate);
      while (current <= effectiveEnd && dates.length < MAX_INSERTIONS_PER_RUN) {
        if (current >= startDate) {
          dates.push(toISO(current));
        }
        current = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1);
      }
      break;
    }

    case 'weekly': {
      const targetDow = recurrenceDay % 7;
      current = new Date(fromDate);
      const dayDiff = (targetDow - current.getDay() + 7) % 7;
      if (dayDiff > 0) {
        current = new Date(current.getFullYear(), current.getMonth(), current.getDate() + dayDiff);
      }
      while (current <= effectiveEnd && dates.length < MAX_INSERTIONS_PER_RUN) {
        if (current >= startDate) {
          dates.push(toISO(current));
        }
        current = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 7);
      }
      break;
    }

    case 'monthly': {
      let y = fromDate.getFullYear();
      let m = fromDate.getMonth();
      const fromDay = fromDate.getDate();
      const adjustedFromDay = applyDueAdjustment(y, m, recurrenceDay, rule.due_adjustment);
      if (fromDay > adjustedFromDay) {
        m += 1;
        if (m > 11) { m = 0; y += 1; }
      }

      while (dates.length < MAX_INSERTIONS_PER_RUN) {
        const actualDay = applyDueAdjustment(y, m, recurrenceDay, rule.due_adjustment);
        const d = new Date(y, m, actualDay);
        if (d > effectiveEnd) break;
        if (d >= startDate) {
          dates.push(toISO(d));
        }
        m += 1;
        if (m > 11) { m = 0; y += 1; }
      }
      break;
    }

    case 'yearly': {
      const startMonth = startDate.getMonth();
      const startDay = startDate.getDate();
      let y = fromDate.getFullYear();
      if (
        fromDate.getMonth() > startMonth ||
        (fromDate.getMonth() === startMonth && fromDate.getDate() > startDay)
      ) {
        y += 1;
      }

      while (dates.length < MAX_INSERTIONS_PER_RUN) {
        const actualDay = applyDueAdjustment(y, startMonth, startDay, rule.due_adjustment);
        const d = new Date(y, startMonth, actualDay);
        if (d > effectiveEnd) break;
        if (d >= startDate) {
          dates.push(toISO(d));
        }
        y += 1;
      }
      break;
    }

    default:
      break;
  }

  if (rule.repeat_count && rule.repeat_count > 0) {
    const alreadyGenerated = rule.generation_count || 0;
    const remaining = rule.repeat_count - alreadyGenerated;
    if (remaining <= 0) return [];
    return dates.slice(0, remaining);
  }

  return dates;
}

async function fetchRule(ruleId: string): Promise<RuleRow | null> {
  const { data, error } = await supabase
    .from('recurrence_rules')
    .select('*')
    .eq('id', ruleId)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch rule: ${error.message}`);
  return data as RuleRow | null;
}

async function getExistingCount(ruleId: string): Promise<number> {
  const { count, error } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('parent_recurrence_rule_id', ruleId);

  if (error) throw new Error(`Failed to count existing transactions: ${error.message}`);
  return count || 0;
}

async function insertTransactionBatch(
  rule: RuleRow,
  dates: string[],
  startSequence: number
): Promise<{ inserted: number; duplicates: number }> {
  if (dates.length === 0) return { inserted: 0, duplicates: 0 };

  const { data: { user } } = await supabase.auth.getUser();
  const userId = rule.created_by_user_id || user?.id;

  const rows = dates.map((date, i) => ({
    transaction_workspace_id: rule.workspace_id,
    transaction_created_by_user_id: userId,
    transaction_type: rule.transaction_type,
    transaction_description: rule.description,
    transaction_amount: rule.amount || 0,
    transaction_date: date,
    transaction_bank_id: rule.account_id,
    transaction_category_id: rule.category_id,
    transaction_status: 'pending',
    transaction_origin: 'recurring',
    parent_recurrence_rule_id: rule.id,
    recurrence_instance_date: date,
    recurrence_sequence: startSequence + i + 1,
    is_recurrence_generated: true,
    generated_at: new Date().toISOString(),
  }));

  let inserted = 0;
  let duplicates = 0;
  const BATCH_SIZE = 50;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from('transactions')
      .upsert(batch, {
        onConflict: 'parent_recurrence_rule_id,recurrence_instance_date',
        ignoreDuplicates: true,
      })
      .select('transaction_id');

    if (error) {
      if (error.code === '23505') {
        duplicates += batch.length;
        continue;
      }
      throw new Error(`Batch insert failed: ${error.message}`);
    }

    inserted += data?.length || 0;
    duplicates += batch.length - (data?.length || 0);
  }

  return { inserted, duplicates };
}

async function updateRuleAfterGeneration(
  ruleId: string,
  generatedCount: number,
  lastDate: string,
  ruleCompleted: boolean
): Promise<void> {
  const updates: Record<string, unknown> = {
    generated_until: lastDate,
    last_generated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    error_count: 0,
    last_error_at: null,
    last_error_message: null,
  };

  if (generatedCount > 0) {
    const { data: current } = await supabase
      .from('recurrence_rules')
      .select('generation_count')
      .eq('id', ruleId)
      .maybeSingle();

    updates.generation_count = (current?.generation_count || 0) + generatedCount;
  }

  if (ruleCompleted) {
    updates.status = 'completed';
    updates.next_run_at = null;
  }

  const { error } = await supabase
    .from('recurrence_rules')
    .update(updates)
    .eq('id', ruleId);

  if (error) throw new Error(`Failed to update rule: ${error.message}`);
}

async function recordError(ruleId: string, message: string): Promise<void> {
  const { data: current } = await supabase
    .from('recurrence_rules')
    .select('error_count')
    .eq('id', ruleId)
    .maybeSingle();

  const newCount = (current?.error_count || 0) + 1;
  const updates: Record<string, unknown> = {
    error_count: newCount,
    last_error_at: new Date().toISOString(),
    last_error_message: message,
    updated_at: new Date().toISOString(),
  };

  if (newCount >= 10) {
    updates.status = 'error';
    updates.next_run_at = null;
  }

  await supabase
    .from('recurrence_rules')
    .update(updates)
    .eq('id', ruleId);
}

export async function generateRecurrences(
  ruleId: string,
  mode: GenerationMode
): Promise<EngineResult> {
  const result: EngineResult = {
    success: false,
    generated: 0,
    skippedDuplicates: 0,
    ruleCompleted: false,
  };

  try {
    const rule = await fetchRule(ruleId);
    if (!rule) {
      result.error = 'Rule not found';
      return result;
    }

    if (rule.status !== 'active') {
      result.error = `Rule status is '${rule.status}', skipping`;
      result.success = true;
      return result;
    }

    const today = new Date();
    const horizon = getHorizonDate();

    let fromDate: Date;

    switch (mode) {
      case 'on_save': {
        fromDate = parseLocalDate(rule.start_date);
        break;
      }
      case 'on_edit': {
        const todayISO = toISO(today);
        fromDate = parseLocalDate(todayISO);
        break;
      }
      case 'maintenance': {
        if (rule.generated_until) {
          const genUntil = parseLocalDate(rule.generated_until);
          fromDate = new Date(genUntil.getFullYear(), genUntil.getMonth(), genUntil.getDate() + 1);
        } else {
          fromDate = parseLocalDate(rule.start_date);
        }
        break;
      }
    }

    const dates = computeOccurrenceDates(rule, fromDate, horizon);

    if (dates.length === 0) {
      const isCompleted = checkIfRuleCompleted(rule, horizon);
      if (isCompleted) {
        await updateRuleAfterGeneration(ruleId, 0, rule.generated_until || rule.start_date, true);
        result.ruleCompleted = true;
      }
      result.success = true;
      return result;
    }

    const existingCount = await getExistingCount(ruleId);
    const { inserted, duplicates } = await insertTransactionBatch(rule, dates, existingCount);

    result.generated = inserted;
    result.skippedDuplicates = duplicates;

    const lastDate = dates[dates.length - 1];
    const totalAfter = existingCount + inserted;
    const isCompleted = rule.repeat_count
      ? totalAfter >= rule.repeat_count
      : rule.end_date
        ? parseLocalDate(lastDate) >= parseLocalDate(rule.end_date)
        : false;

    result.ruleCompleted = isCompleted;
    await updateRuleAfterGeneration(ruleId, inserted, lastDate, isCompleted);

    result.success = true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    result.error = msg;
    await recordError(ruleId, msg).catch(() => {});
  }

  return result;
}

function checkIfRuleCompleted(rule: RuleRow, horizon: Date): boolean {
  if (rule.repeat_count && (rule.generation_count || 0) >= rule.repeat_count) {
    return true;
  }
  if (rule.end_date) {
    const endDate = parseLocalDate(rule.end_date);
    if (endDate <= horizon && rule.generated_until) {
      const genUntil = parseLocalDate(rule.generated_until);
      return genUntil >= endDate;
    }
  }
  return false;
}

export async function runMaintenanceForWorkspace(workspaceId: string): Promise<{
  rulesProcessed: number;
  totalGenerated: number;
  errors: Array<{ ruleId: string; message: string }>;
}> {
  const horizonISO = toISO(getHorizonDate());

  const { data: rules, error } = await supabase
    .from('recurrence_rules')
    .select('id, generated_until')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')
    .or(`generated_until.is.null,generated_until.lt.${horizonISO}`);

  if (error) throw new Error(`Failed to fetch rules for maintenance: ${error.message}`);

  const results = {
    rulesProcessed: 0,
    totalGenerated: 0,
    errors: [] as Array<{ ruleId: string; message: string }>,
  };

  for (const rule of rules || []) {
    const res = await generateRecurrences(rule.id, 'maintenance');
    results.rulesProcessed += 1;
    results.totalGenerated += res.generated;
    if (!res.success && res.error) {
      results.errors.push({ ruleId: rule.id, message: res.error });
    }
  }

  return results;
}

export async function runGlobalMaintenance(): Promise<{
  workspacesProcessed: number;
  totalGenerated: number;
  errors: Array<{ ruleId: string; message: string }>;
}> {
  const horizonISO = toISO(getHorizonDate());

  const { data: workspaceIds, error } = await supabase
    .from('recurrence_rules')
    .select('workspace_id')
    .eq('status', 'active')
    .or(`generated_until.is.null,generated_until.lt.${horizonISO}`);

  if (error) throw new Error(`Failed to fetch workspaces: ${error.message}`);

  const uniqueIds = [...new Set((workspaceIds || []).map(r => r.workspace_id))];

  const results = {
    workspacesProcessed: 0,
    totalGenerated: 0,
    errors: [] as Array<{ ruleId: string; message: string }>,
  };

  for (const wsId of uniqueIds) {
    const res = await runMaintenanceForWorkspace(wsId);
    results.workspacesProcessed += 1;
    results.totalGenerated += res.totalGenerated;
    results.errors.push(...res.errors);
  }

  return results;
}
