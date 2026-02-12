import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MAX_INSERTIONS_PER_RUN = 500;
const HORIZON_MONTHS = 6;

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getHorizonDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + HORIZON_MONTHS, now.getDate());
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function applyDueAdjustment(
  year: number,
  month: number,
  targetDay: number,
  adjustment: string | null,
): number {
  const maxDay = getDaysInMonth(year, month);
  if (targetDay <= maxDay) return targetDay;
  if (adjustment === "next_business_day") return 1;
  return maxDay;
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

function computeOccurrenceDates(
  rule: RuleRow,
  fromDate: Date,
  horizon: Date,
): string[] {
  const dates: string[] = [];
  const startDate = parseLocalDate(rule.start_date);
  const endDate = rule.end_date ? parseLocalDate(rule.end_date) : null;
  const effectiveEnd = endDate && endDate < horizon ? endDate : horizon;
  const recurrenceDay = rule.recurrence_day
    ? parseInt(rule.recurrence_day, 10)
    : startDate.getDate();

  let current: Date;

  switch (rule.recurrence_type) {
    case "daily": {
      current = new Date(fromDate);
      while (current <= effectiveEnd && dates.length < MAX_INSERTIONS_PER_RUN) {
        if (current >= startDate) dates.push(toISO(current));
        current = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1);
      }
      break;
    }
    case "weekly": {
      const targetDow = recurrenceDay % 7;
      current = new Date(fromDate);
      const dayDiff = (targetDow - current.getDay() + 7) % 7;
      if (dayDiff > 0) {
        current = new Date(current.getFullYear(), current.getMonth(), current.getDate() + dayDiff);
      }
      while (current <= effectiveEnd && dates.length < MAX_INSERTIONS_PER_RUN) {
        if (current >= startDate) dates.push(toISO(current));
        current = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 7);
      }
      break;
    }
    case "monthly": {
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
        if (d >= startDate) dates.push(toISO(d));
        m += 1;
        if (m > 11) { m = 0; y += 1; }
      }
      break;
    }
    case "yearly": {
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
        if (d >= startDate) dates.push(toISO(d));
        y += 1;
      }
      break;
    }
  }

  if (rule.repeat_count && rule.repeat_count > 0) {
    const remaining = rule.repeat_count - (rule.generation_count || 0);
    if (remaining <= 0) return [];
    return dates.slice(0, remaining);
  }

  return dates;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const horizonISO = toISO(getHorizonDate());

    const { data: rules, error: fetchError } = await supabase
      .from("recurrence_rules")
      .select("*")
      .eq("status", "active")
      .or(`generated_until.is.null,generated_until.lt.${horizonISO}`)
      .limit(100);

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const results = {
      rulesProcessed: 0,
      totalGenerated: 0,
      rulesCompleted: 0,
      errors: [] as Array<{ ruleId: string; message: string }>,
    };

    for (const rule of rules || []) {
      try {
        const horizon = getHorizonDate();

        let fromDate: Date;
        if (rule.generated_until) {
          const genUntil = parseLocalDate(rule.generated_until);
          fromDate = new Date(genUntil.getFullYear(), genUntil.getMonth(), genUntil.getDate() + 1);
        } else {
          fromDate = parseLocalDate(rule.start_date);
        }

        const dates = computeOccurrenceDates(rule as RuleRow, fromDate, horizon);
        results.rulesProcessed += 1;

        if (dates.length === 0) {
          const isComplete = rule.repeat_count
            ? (rule.generation_count || 0) >= rule.repeat_count
            : rule.end_date
              ? parseLocalDate(rule.end_date) <= horizon
              : false;

          if (isComplete) {
            await supabase
              .from("recurrence_rules")
              .update({ status: "completed", next_run_at: null, updated_at: new Date().toISOString() })
              .eq("id", rule.id);
            results.rulesCompleted += 1;
          }
          continue;
        }

        const existingCountResult = await supabase
          .from("transactions")
          .select("*", { count: "exact", head: true })
          .eq("parent_recurrence_rule_id", rule.id);

        const existingCount = existingCountResult.count || 0;

        const rows = dates.map((date: string, i: number) => ({
          transaction_workspace_id: rule.workspace_id,
          transaction_created_by_user_id: rule.created_by_user_id,
          transaction_type: rule.transaction_type,
          transaction_description: rule.description,
          transaction_amount: rule.amount || 0,
          transaction_date: date,
          transaction_bank_id: rule.account_id,
          transaction_category_id: rule.category_id,
          transaction_status: "pending",
          transaction_origin: "recurring",
          parent_recurrence_rule_id: rule.id,
          recurrence_instance_date: date,
          recurrence_sequence: existingCount + i + 1,
          is_recurrence_generated: true,
          generated_at: new Date().toISOString(),
        }));

        let inserted = 0;
        const BATCH_SIZE = 50;

        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
          const batch = rows.slice(i, i + BATCH_SIZE);
          const { data: upsertData, error: upsertError } = await supabase
            .from("transactions")
            .upsert(batch, {
              onConflict: "parent_recurrence_rule_id,recurrence_instance_date",
              ignoreDuplicates: true,
            })
            .select("transaction_id");

          if (upsertError) {
            if (upsertError.code === "23505") continue;
            throw new Error(upsertError.message);
          }
          inserted += upsertData?.length || 0;
        }

        results.totalGenerated += inserted;

        const lastDate = dates[dates.length - 1];
        const totalAfter = existingCount + inserted;
        const isComplete = rule.repeat_count
          ? totalAfter >= rule.repeat_count
          : rule.end_date
            ? parseLocalDate(lastDate) >= parseLocalDate(rule.end_date)
            : false;

        const ruleUpdates: Record<string, unknown> = {
          generated_until: lastDate,
          last_generated_at: new Date().toISOString(),
          generation_count: totalAfter,
          error_count: 0,
          last_error_at: null,
          last_error_message: null,
          updated_at: new Date().toISOString(),
        };

        if (isComplete) {
          ruleUpdates.status = "completed";
          ruleUpdates.next_run_at = null;
          results.rulesCompleted += 1;
        }

        await supabase
          .from("recurrence_rules")
          .update(ruleUpdates)
          .eq("id", rule.id);
      } catch (ruleError) {
        const msg = ruleError instanceof Error ? ruleError.message : "Unknown error";
        results.errors.push({ ruleId: rule.id, message: msg });

        const { data: current } = await supabase
          .from("recurrence_rules")
          .select("error_count")
          .eq("id", rule.id)
          .maybeSingle();

        const newCount = (current?.error_count || 0) + 1;
        const errorUpdates: Record<string, unknown> = {
          error_count: newCount,
          last_error_at: new Date().toISOString(),
          last_error_message: msg,
        };

        if (newCount >= 10) {
          errorUpdates.status = "error";
          errorUpdates.next_run_at = null;
        }

        await supabase
          .from("recurrence_rules")
          .update(errorUpdates)
          .eq("id", rule.id);
      }
    }

    return new Response(
      JSON.stringify(results),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
