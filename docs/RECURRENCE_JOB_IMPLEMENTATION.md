# Recurrence Generation Job - Implementation Guide

## Overview

This document provides detailed implementation guidance for the daily recurrence generation job that creates recurring transactions automatically.

## Job Execution Strategy

### Timing
- **Frequency**: Daily
- **Execution Time**: 00:00 UTC (midnight)
- **Alternative**: On-demand execution via API endpoint

### Implementation Options

#### Option 1: Supabase Edge Function (Recommended)
```typescript
// supabase/functions/generate-recurrences/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get all workspaces
    const { data: workspaces } = await supabase
      .from('workspaces')
      .select('workspace_id, workspace_owner_user_id')

    let totalGenerated = 0
    let totalProcessed = 0
    const errors = []

    // Process each workspace
    for (const workspace of workspaces || []) {
      const result = await generateRecurrencesForWorkspace(
        supabase,
        workspace.workspace_id,
        workspace.workspace_owner_user_id
      )

      totalGenerated += result.generated
      totalProcessed += result.processed
      errors.push(...result.errors)
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalGenerated,
        totalProcessed,
        errors
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

async function generateRecurrencesForWorkspace(supabase, workspaceId, userId) {
  const today = new Date().toISOString().split('T')[0]

  // Fetch eligible rules
  const { data: rules } = await supabase
    .from('recurrence_rules')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('status', 'ACTIVE')
    .lte('next_run_at', today)

  let generated = 0
  const errors = []

  for (const rule of rules || []) {
    try {
      const result = await processRule(supabase, rule, today)
      generated += result.generated
    } catch (error) {
      errors.push({ ruleId: rule.id, error: error.message })

      // Update error count
      await supabase
        .from('recurrence_rules')
        .update({
          error_count: (rule.error_count || 0) + 1,
          last_error_at: new Date().toISOString(),
          last_error_message: error.message
        })
        .eq('id', rule.id)
    }
  }

  return {
    generated,
    processed: rules?.length || 0,
    errors
  }
}

async function processRule(supabase, rule, today) {
  let generated = 0
  let currentDate = new Date(rule.next_run_at)
  const todayDate = new Date(today)

  // Generate all instances up to today
  while (currentDate <= todayDate) {
    const instanceDate = currentDate.toISOString().split('T')[0]

    // Check if should stop (repeat_count or end_date)
    if (rule.repeat_count && rule.generation_count >= rule.repeat_count) {
      await supabase
        .from('recurrence_rules')
        .update({ status: 'COMPLETED', next_run_at: null })
        .eq('id', rule.id)
      break
    }

    if (rule.end_date && currentDate > new Date(rule.end_date)) {
      await supabase
        .from('recurrence_rules')
        .update({ status: 'COMPLETED', next_run_at: null })
        .eq('id', rule.id)
      break
    }

    // Create transaction (idempotent via UNIQUE constraint)
    const { error } = await supabase
      .from('transactions')
      .insert({
        transaction_workspace_id: rule.workspace_id,
        transaction_user_id: rule.user_id,
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
        recurrence_instance_date: instanceDate,
        recurrence_sequence: rule.generation_count + generated + 1,
        parent_recurrence_rule_id: rule.id,
        is_recurrence_generated: true,
        generated_at: new Date().toISOString()
      })

    // Ignore duplicate errors (23505 = unique_violation)
    if (!error || error.code === '23505') {
      if (!error) generated++

      // Calculate next date
      const nextDate = calculateNextDate(rule, currentDate)
      currentDate = nextDate
    } else {
      throw error
    }
  }

  // Update rule state
  if (generated > 0) {
    await supabase
      .from('recurrence_rules')
      .update({
        last_generated_at: new Date().toISOString(),
        next_run_at: currentDate.toISOString().split('T')[0],
        generation_count: rule.generation_count + generated,
        error_count: 0,
        last_error_at: null,
        last_error_message: null
      })
      .eq('id', rule.id)
  }

  return { generated }
}

function calculateNextDate(rule, baseDate) {
  const next = new Date(baseDate)

  switch (rule.recurrence_type) {
    case 'DAILY':
      next.setDate(next.getDate() + 1)
      break

    case 'WEEKLY':
      next.setDate(next.getDate() + 7)
      break

    case 'BIWEEKLY':
      next.setDate(next.getDate() + 14)
      break

    case 'MONTHLY':
      const targetDay = rule.recurrence_day || 1
      let month = next.getMonth() + 1
      let year = next.getFullYear()

      if (month > 11) {
        month = 0
        year++
      }

      const daysInMonth = new Date(year, month + 1, 0).getDate()
      const actualDay = Math.min(targetDay, daysInMonth)

      next.setFullYear(year)
      next.setMonth(month)
      next.setDate(actualDay)
      break

    case 'QUARTERLY':
      next.setMonth(next.getMonth() + 3)
      break

    case 'YEARLY':
      next.setFullYear(next.getFullYear() + 1)
      break
  }

  return next
}
```

#### Option 2: External Cron Job
```bash
#!/bin/bash
# cron-recurrence-job.sh

# This script should be scheduled via crontab:
# 0 0 * * * /path/to/cron-recurrence-job.sh

# Call the Supabase Edge Function
curl -X POST "https://your-project.supabase.co/functions/v1/generate-recurrences" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json"
```

#### Option 3: GitHub Actions (Scheduled Workflow)
```yaml
# .github/workflows/recurrence-generation.yml

name: Generate Recurring Transactions

on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight UTC
  workflow_dispatch:  # Allow manual trigger

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - name: Call Supabase Edge Function
        run: |
          curl -X POST "${{ secrets.SUPABASE_URL }}/functions/v1/generate-recurrences" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Content-Type: application/json"
```

## Detailed Algorithm Pseudocode

```pseudocode
FUNCTION DailyRecurrenceGenerationJob():
  LOG "Starting daily recurrence generation job"
  startTime = getCurrentTime()

  totalGenerated = 0
  totalProcessed = 0
  totalErrors = 0
  errorDetails = []

  // Step 1: Get all active workspaces
  workspaces = QUERY "SELECT workspace_id, workspace_owner_user_id FROM workspaces"

  FOR EACH workspace IN workspaces:
    TRY:
      result = processWorkspace(workspace.workspace_id, workspace.workspace_owner_user_id)
      totalGenerated += result.generated
      totalProcessed += result.processed

    CATCH error:
      LOG ERROR "Failed to process workspace {workspace.workspace_id}: {error.message}"
      totalErrors += 1
      errorDetails.APPEND({
        workspace_id: workspace.workspace_id,
        error: error.message
      })

  // Step 2: Log summary
  duration = getCurrentTime() - startTime
  LOG "Recurrence generation completed:"
  LOG "  - Workspaces processed: {workspaces.length}"
  LOG "  - Rules processed: {totalProcessed}"
  LOG "  - Transactions generated: {totalGenerated}"
  LOG "  - Errors: {totalErrors}"
  LOG "  - Duration: {duration}ms"

  // Step 3: Send alert if errors
  IF totalErrors > 0:
    SEND_ALERT "Recurrence job completed with {totalErrors} errors"

  RETURN {
    success: totalErrors === 0,
    totalGenerated: totalGenerated,
    totalProcessed: totalProcessed,
    errors: errorDetails
  }

FUNCTION processWorkspace(workspaceId, userId):
  today = getCurrentDate()  // Format: YYYY-MM-DD

  // Fetch eligible rules
  rules = QUERY """
    SELECT * FROM recurrence_rules
    WHERE workspace_id = $1
      AND user_id = $2
      AND status = 'ACTIVE'
      AND next_run_at <= $3
      AND (repeat_count IS NULL OR generation_count < repeat_count)
      AND (end_date IS NULL OR end_date >= $3)
    ORDER BY next_run_at ASC
  """ WITH (workspaceId, userId, today)

  generated = 0
  errors = []

  FOR EACH rule IN rules:
    TRY:
      result = processRecurrenceRule(rule, today)
      generated += result.generated

    CATCH error:
      LOG ERROR "Failed to process rule {rule.id}: {error.message}"
      errors.APPEND({
        ruleId: rule.id,
        error: error.message
      })

      // Update error tracking
      QUERY """
        UPDATE recurrence_rules
        SET error_count = error_count + 1,
            last_error_at = NOW(),
            last_error_message = $1,
            status = CASE WHEN error_count >= 10 THEN 'ERROR' ELSE status END
        WHERE id = $2
      """ WITH (error.message, rule.id)

  RETURN {
    generated: generated,
    processed: rules.length,
    errors: errors
  }

FUNCTION processRecurrenceRule(rule, today):
  generated = 0
  currentDate = parseDate(rule.next_run_at)
  todayDate = parseDate(today)
  maxIterations = 365  // Safety limit
  iterations = 0

  // Generate all overdue instances
  WHILE currentDate <= todayDate AND iterations < maxIterations:
    iterations++

    // Check stopping conditions
    IF rule.repeat_count IS NOT NULL AND rule.generation_count >= rule.repeat_count:
      QUERY "UPDATE recurrence_rules SET status='COMPLETED', next_run_at=NULL WHERE id=$1" WITH (rule.id)
      BREAK

    IF rule.end_date IS NOT NULL AND currentDate > parseDate(rule.end_date):
      QUERY "UPDATE recurrence_rules SET status='COMPLETED', next_run_at=NULL WHERE id=$1" WITH (rule.id)
      BREAK

    // Generate transaction (idempotent via UNIQUE constraint)
    instanceDate = formatDate(currentDate)
    sequence = rule.generation_count + generated + 1

    TRY:
      QUERY """
        INSERT INTO transactions (
          transaction_workspace_id,
          transaction_user_id,
          transaction_type,
          transaction_description,
          transaction_amount,
          transaction_date,
          transaction_issue_date,
          transaction_competence_date,
          transaction_payment_method,
          transaction_is_paid,
          transaction_status,
          transaction_bank_id,
          category_id,
          recurrence_instance_date,
          recurrence_sequence,
          parent_recurrence_rule_id,
          is_recurrence_generated,
          generated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, false, 'pending',
          $10, $11, $12, $13, $14, true, NOW()
        )
      """ WITH (
        rule.workspace_id,
        rule.user_id,
        rule.transaction_type,
        rule.description,
        rule.amount,
        instanceDate,
        instanceDate,
        instanceDate,
        'other',
        rule.account_id,
        rule.category_id,
        instanceDate,
        sequence,
        rule.id
      )

      generated++
      LOG "Generated transaction for rule {rule.id} on {instanceDate}"

    CATCH DuplicateKeyError:
      // Idempotent: transaction already exists, continue
      LOG "Transaction already exists for rule {rule.id} on {instanceDate}"

    // Calculate next date
    nextDate = calculateNextRecurrenceDate(rule, currentDate)
    currentDate = nextDate

  // Update rule state after successful generation
  IF generated > 0:
    nextRunDate = formatDate(currentDate)
    newGenerationCount = rule.generation_count + generated

    QUERY """
      UPDATE recurrence_rules
      SET last_generated_at = NOW(),
          next_run_at = $1,
          generation_count = $2,
          error_count = 0,
          last_error_at = NULL,
          last_error_message = NULL,
          updated_at = NOW()
      WHERE id = $3
    """ WITH (nextRunDate, newGenerationCount, rule.id)

    LOG "Updated rule {rule.id}: next_run_at={nextRunDate}, generation_count={newGenerationCount}"

  RETURN { generated: generated }

FUNCTION calculateNextRecurrenceDate(rule, baseDate):
  SWITCH rule.recurrence_type:
    CASE 'DAILY':
      RETURN addDays(baseDate, 1)

    CASE 'WEEKLY':
      targetDayOfWeek = rule.recurrence_day OR 1
      currentDayOfWeek = getDayOfWeek(baseDate)
      daysUntilTarget = (targetDayOfWeek - currentDayOfWeek + 7) % 7

      IF daysUntilTarget == 0:
        RETURN addDays(baseDate, 7)
      ELSE:
        RETURN addDays(baseDate, daysUntilTarget)

    CASE 'BIWEEKLY':
      targetDayOfWeek = rule.recurrence_day OR 1
      currentDayOfWeek = getDayOfWeek(baseDate)
      daysUntilTarget = (targetDayOfWeek - currentDayOfWeek + 7) % 7

      IF daysUntilTarget == 0:
        RETURN addDays(baseDate, 14)
      ELSE:
        RETURN addDays(baseDate, daysUntilTarget + 7)

    CASE 'MONTHLY':
      targetDay = rule.recurrence_day OR 1
      year = getYear(baseDate)
      month = getMonth(baseDate) + 1

      IF month > 12:
        month = 1
        year = year + 1

      daysInMonth = getDaysInMonth(year, month)
      actualDay = MIN(targetDay, daysInMonth)

      // Apply due_adjustment if needed
      IF targetDay > daysInMonth:
        SWITCH rule.due_adjustment:
          CASE 'LAST_DAY_OF_MONTH':
            actualDay = daysInMonth
          CASE 'NEXT_VALID_DAY':
            month = month + 1
            IF month > 12:
              month = 1
              year = year + 1
            actualDay = 1
          CASE 'SKIP':
            RETURN calculateNextRecurrenceDate(rule, createDate(year, month, daysInMonth))
          CASE 'EXACT_DAY':
            THROW ERROR "Day {targetDay} does not exist in month {month}/{year}"

      RETURN createDate(year, month, actualDay)

    CASE 'QUARTERLY':
      targetDay = rule.recurrence_day OR 1
      year = getYear(baseDate)
      month = getMonth(baseDate) + 3

      WHILE month > 12:
        month = month - 12
        year = year + 1

      daysInMonth = getDaysInMonth(year, month)
      actualDay = MIN(targetDay, daysInMonth)

      RETURN createDate(year, month, actualDay)

    CASE 'YEARLY':
      startDate = parseDate(rule.start_date)
      year = getYear(baseDate) + 1
      month = getMonth(startDate)
      targetDay = getDay(startDate)

      daysInMonth = getDaysInMonth(year, month)
      actualDay = MIN(targetDay, daysInMonth)

      RETURN createDate(year, month, actualDay)

    DEFAULT:
      THROW ERROR "Unknown recurrence type: {rule.recurrence_type}"
```

## Monitoring and Alerting

### Metrics to Track
1. **Job execution time**: Should complete within 5 minutes
2. **Transactions generated per day**: Normal range varies by usage
3. **Error rate**: Should be < 1%
4. **Rules stuck in ERROR state**: Alert if > 5

### Logging Strategy
```typescript
interface JobLog {
  timestamp: string;
  jobId: string;
  status: 'started' | 'completed' | 'failed';
  duration_ms: number;
  transactions_generated: number;
  rules_processed: number;
  errors: Array<{ ruleId: string; message: string }>;
}

// Store in separate logging table
await supabase.from('recurrence_job_logs').insert(jobLog);
```

### Alert Conditions
- Job fails to complete
- Error rate > 5%
- Any rule has error_count >= 10
- Job duration > 10 minutes
- Zero transactions generated for 7+ days (if rules exist)

## Testing Strategy

### Unit Tests
```typescript
describe('Recurrence Generation', () => {
  test('generates daily recurrence correctly', () => {
    const rule = createMockRule({ recurrence_type: 'DAILY' });
    const nextDate = calculateNextRecurrenceDate(rule, new Date('2025-01-15'));
    expect(nextDate).toEqual(new Date('2025-01-16'));
  });

  test('respects repeat_count limit', async () => {
    const rule = createMockRule({ repeat_count: 3, generation_count: 3 });
    const result = await processRecurrenceRule(rule, new Date());
    expect(result.generated).toBe(0);
  });

  test('handles duplicate transactions idempotently', async () => {
    // Run twice
    await generateRecurringTransactions(workspaceId, userId);
    await generateRecurringTransactions(workspaceId, userId);

    // Should only have 1 transaction
    const transactions = await getTransactionsByRule(ruleId);
    expect(transactions.length).toBe(1);
  });
});
```

### Integration Tests
```typescript
describe('End-to-End Recurrence', () => {
  test('full monthly recurrence cycle', async () => {
    // Create rule for 15th of each month
    const rule = await createRecurrenceRule({
      recurrence_type: 'MONTHLY',
      recurrence_day: 15,
      amount: 1000,
      start_date: '2025-01-15'
    });

    // Simulate job runs
    await generateRecurringTransactions(workspaceId, userId, new Date('2025-01-15'));
    await generateRecurringTransactions(workspaceId, userId, new Date('2025-02-15'));
    await generateRecurringTransactions(workspaceId, userId, new Date('2025-03-15'));

    const transactions = await getTransactionsByRule(rule.id);
    expect(transactions).toHaveLength(3);
    expect(transactions[0].recurrence_instance_date).toBe('2025-01-15');
    expect(transactions[1].recurrence_instance_date).toBe('2025-02-15');
    expect(transactions[2].recurrence_instance_date).toBe('2025-03-15');
  });
});
```

## Performance Considerations

### Optimization Strategies
1. **Batch processing**: Process rules in batches of 100
2. **Parallel execution**: Process workspaces in parallel
3. **Index usage**: Ensure proper indexes on `next_run_at` and `status`
4. **Connection pooling**: Reuse database connections
5. **Timeout limits**: Set max execution time per rule (30s)

### Scalability
- **Small scale** (< 1000 rules): Single job execution
- **Medium scale** (1000-10000 rules): Batch processing with parallel workers
- **Large scale** (> 10000 rules): Distributed job queue (e.g., BullMQ, pg_cron)

## Deployment Checklist

- [ ] Deploy Edge Function to Supabase
- [ ] Set up scheduled trigger (cron or GitHub Actions)
- [ ] Configure environment variables
- [ ] Set up monitoring dashboard
- [ ] Configure alerting rules
- [ ] Test with a few rules in production
- [ ] Enable for all users
- [ ] Document runbook for troubleshooting

## Troubleshooting Guide

### Common Issues

**Issue**: Job times out
- **Solution**: Add pagination, process rules in smaller batches

**Issue**: Duplicate transactions despite UNIQUE constraint
- **Solution**: Check if `parent_recurrence_rule_id` is NULL (constraint only applies when NOT NULL)

**Issue**: Wrong dates generated
- **Solution**: Verify timezone handling, check `due_adjustment` logic

**Issue**: Rule stuck in ERROR state
- **Solution**: Reset `error_count` to 0 and manually trigger generation

### Manual Recovery
```sql
-- Reset error state for a rule
UPDATE recurrence_rules
SET error_count = 0,
    last_error_at = NULL,
    last_error_message = NULL,
    status = 'ACTIVE'
WHERE id = 'rule-id';

-- Manually trigger next generation
UPDATE recurrence_rules
SET next_run_at = CURRENT_DATE
WHERE id = 'rule-id';
```
