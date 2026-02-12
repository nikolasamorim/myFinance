import { RecurrenceType, DueAdjustment, RecurrenceRule } from '../types';

export interface RecurrenceCalculationResult {
  nextDate: Date;
  shouldStop: boolean;
  reason?: string;
}

export const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month, 0).getDate();
};

export const calculateNextRecurrenceDate = (
  rule: RecurrenceRule,
  baseDate: Date = new Date()
): RecurrenceCalculationResult => {
  const startDate = new Date(rule.start_date);
  const endDate = rule.end_date ? new Date(rule.end_date) : null;

  if (rule.status !== 'ACTIVE') {
    return {
      nextDate: baseDate,
      shouldStop: true,
      reason: `Rule status is ${rule.status}`
    };
  }

  if (endDate && baseDate >= endDate) {
    return {
      nextDate: baseDate,
      shouldStop: true,
      reason: 'End date reached'
    };
  }

  if (rule.repeat_count && rule.generation_count >= rule.repeat_count) {
    return {
      nextDate: baseDate,
      shouldStop: true,
      reason: 'Repeat count reached'
    };
  }

  let nextDate: Date;

  switch (rule.recurrence_type) {
    case 'DAILY':
      nextDate = calculateDailyRecurrence(baseDate);
      break;
    case 'WEEKLY':
      nextDate = calculateWeeklyRecurrence(baseDate, rule.recurrence_day || 1);
      break;
    case 'BIWEEKLY':
      nextDate = calculateBiweeklyRecurrence(baseDate, rule.recurrence_day || 1);
      break;
    case 'MONTHLY':
      nextDate = calculateMonthlyRecurrence(
        baseDate,
        rule.recurrence_day || 1,
        rule.due_adjustment
      );
      break;
    case 'QUARTERLY':
      nextDate = calculateQuarterlyRecurrence(
        baseDate,
        rule.recurrence_day || 1,
        rule.due_adjustment
      );
      break;
    case 'YEARLY':
      nextDate = calculateYearlyRecurrence(
        baseDate,
        startDate,
        rule.due_adjustment
      );
      break;
    default:
      throw new Error(`Unknown recurrence type: ${rule.recurrence_type}`);
  }

  if (endDate && nextDate > endDate) {
    return {
      nextDate: baseDate,
      shouldStop: true,
      reason: 'Next date exceeds end date'
    };
  }

  return {
    nextDate,
    shouldStop: false
  };
};

const calculateDailyRecurrence = (baseDate: Date): Date => {
  const next = new Date(baseDate);
  next.setDate(next.getDate() + 1);
  return next;
};

const calculateWeeklyRecurrence = (baseDate: Date, targetDayOfWeek: number): Date => {
  const next = new Date(baseDate);
  const currentDayOfWeek = next.getDay();
  const daysUntilTarget = (targetDayOfWeek - currentDayOfWeek + 7) % 7;

  if (daysUntilTarget === 0) {
    next.setDate(next.getDate() + 7);
  } else {
    next.setDate(next.getDate() + daysUntilTarget);
  }

  return next;
};

const calculateBiweeklyRecurrence = (baseDate: Date, targetDayOfWeek: number): Date => {
  const next = new Date(baseDate);
  const currentDayOfWeek = next.getDay();
  const daysUntilTarget = (targetDayOfWeek - currentDayOfWeek + 7) % 7;

  if (daysUntilTarget === 0) {
    next.setDate(next.getDate() + 14);
  } else {
    next.setDate(next.getDate() + daysUntilTarget + 7);
  }

  return next;
};

const calculateMonthlyRecurrence = (
  baseDate: Date,
  targetDay: number,
  dueAdjustment: DueAdjustment
): Date => {
  const next = new Date(baseDate);
  let year = next.getFullYear();
  let month = next.getMonth() + 2;

  if (month > 12) {
    month = 1;
    year += 1;
  }

  const daysInMonth = getDaysInMonth(year, month);
  let actualDay = targetDay;

  if (targetDay > daysInMonth) {
    actualDay = handleDayOverflow(targetDay, daysInMonth, dueAdjustment, year, month);
  }

  return new Date(year, month - 1, actualDay);
};

const calculateQuarterlyRecurrence = (
  baseDate: Date,
  targetDay: number,
  dueAdjustment: DueAdjustment
): Date => {
  const next = new Date(baseDate);
  let year = next.getFullYear();
  let month = next.getMonth() + 4;

  while (month > 12) {
    month -= 12;
    year += 1;
  }

  const daysInMonth = getDaysInMonth(year, month);
  let actualDay = targetDay;

  if (targetDay > daysInMonth) {
    actualDay = handleDayOverflow(targetDay, daysInMonth, dueAdjustment, year, month);
  }

  return new Date(year, month - 1, actualDay);
};

const calculateYearlyRecurrence = (
  baseDate: Date,
  startDate: Date,
  dueAdjustment: DueAdjustment
): Date => {
  const year = baseDate.getFullYear() + 1;
  const month = startDate.getMonth() + 1;
  const targetDay = startDate.getDate();

  const daysInMonth = getDaysInMonth(year, month);
  let actualDay = targetDay;

  if (targetDay > daysInMonth) {
    actualDay = handleDayOverflow(targetDay, daysInMonth, dueAdjustment, year, month);
  }

  return new Date(year, month - 1, actualDay);
};

const handleDayOverflow = (
  targetDay: number,
  daysInMonth: number,
  dueAdjustment: DueAdjustment,
  year: number,
  month: number
): number => {
  switch (dueAdjustment) {
    case 'LAST_DAY_OF_MONTH':
      return daysInMonth;
    case 'NEXT_VALID_DAY':
      return 1;
    case 'SKIP':
      return daysInMonth;
    case 'EXACT_DAY':
      throw new Error(
        `Target day ${targetDay} does not exist in ${year}-${month} (only ${daysInMonth} days)`
      );
    default:
      return daysInMonth;
  }
};

export const formatDateToISO = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const calculateMultipleRecurrenceDates = (
  rule: RecurrenceRule,
  fromDate: Date,
  maxDates: number = 30
): Date[] => {
  const dates: Date[] = [];
  let currentDate = fromDate;
  let iterations = 0;
  const maxIterations = maxDates * 2;

  while (dates.length < maxDates && iterations < maxIterations) {
    const result = calculateNextRecurrenceDate(rule, currentDate);

    if (result.shouldStop) {
      break;
    }

    dates.push(result.nextDate);
    currentDate = result.nextDate;
    iterations++;
  }

  return dates;
};

export const shouldGenerateRecurrence = (rule: RecurrenceRule, today: Date = new Date()): boolean => {
  if (rule.status !== 'ACTIVE') {
    return false;
  }

  if (!rule.next_run_at) {
    return false;
  }

  const nextRunDate = new Date(rule.next_run_at);
  const todayDate = new Date(today.toISOString().split('T')[0]);

  return nextRunDate <= todayDate;
};

export const validateRecurrenceRule = (rule: Partial<RecurrenceRule>): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!rule.start_date) {
    errors.push('start_date is required');
  }

  if (rule.end_date && rule.start_date) {
    const startDate = new Date(rule.start_date);
    const endDate = new Date(rule.end_date);
    if (endDate < startDate) {
      errors.push('end_date must be >= start_date');
    }
  }

  if (rule.repeat_count !== undefined && rule.repeat_count <= 0) {
    errors.push('repeat_count must be positive');
  }

  if (rule.recurrence_day !== undefined) {
    if (rule.recurrence_day < 1 || rule.recurrence_day > 31) {
      errors.push('recurrence_day must be between 1 and 31');
    }
  }

  if (!rule.recurrence_type) {
    errors.push('recurrence_type is required');
  }

  if (!rule.amount || rule.amount <= 0) {
    errors.push('amount must be positive');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};
