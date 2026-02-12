import type { RecurrenceRule, DueAdjustment } from '../types';

export interface RecurrenceCalculationResult {
  nextDate: Date;
  shouldStop: boolean;
  reason?: string;
}

export const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month, 0).getDate();
};

export const formatDateToISO = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const calculateNextRecurrenceDate = (
  rule: RecurrenceRule,
  baseDate: Date = new Date()
): RecurrenceCalculationResult => {
  const endDate = rule.end_date ? new Date(rule.end_date) : null;

  if (rule.status !== 'active') {
    return { nextDate: baseDate, shouldStop: true, reason: `Rule status is ${rule.status}` };
  }

  if (endDate && baseDate >= endDate) {
    return { nextDate: baseDate, shouldStop: true, reason: 'End date reached' };
  }

  if (rule.repeat_count && rule.generation_count >= rule.repeat_count) {
    return { nextDate: baseDate, shouldStop: true, reason: 'Repeat count reached' };
  }

  const recurrenceDay = rule.recurrence_day || new Date(rule.start_date).getDate();
  let nextDate: Date;

  switch (rule.recurrence_type) {
    case 'daily':
      nextDate = new Date(baseDate);
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'weekly': {
      nextDate = new Date(baseDate);
      const targetDow = (typeof recurrenceDay === 'number' ? recurrenceDay : 1) % 7;
      const dayDiff = (targetDow - nextDate.getDay() + 7) % 7;
      nextDate.setDate(nextDate.getDate() + (dayDiff === 0 ? 7 : dayDiff));
      break;
    }
    case 'monthly': {
      nextDate = new Date(baseDate);
      let y = nextDate.getFullYear();
      let m = nextDate.getMonth() + 1;
      if (m > 11) { m = 0; y += 1; }
      const maxDay = getDaysInMonth(y, m + 1);
      const day = Math.min(recurrenceDay, maxDay);
      nextDate = new Date(y, m, day);
      break;
    }
    case 'yearly': {
      const startDate = new Date(rule.start_date);
      const year = baseDate.getFullYear() + 1;
      const month = startDate.getMonth();
      const maxDay = getDaysInMonth(year, month + 1);
      const day = Math.min(startDate.getDate(), maxDay);
      nextDate = new Date(year, month, day);
      break;
    }
    default:
      throw new Error(`Unknown recurrence type: ${rule.recurrence_type}`);
  }

  if (endDate && nextDate > endDate) {
    return { nextDate: baseDate, shouldStop: true, reason: 'Next date exceeds end date' };
  }

  return { nextDate, shouldStop: false };
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
    if (result.shouldStop) break;
    dates.push(result.nextDate);
    currentDate = result.nextDate;
    iterations++;
  }

  return dates;
};

export const shouldGenerateRecurrence = (rule: RecurrenceRule, today: Date = new Date()): boolean => {
  if (rule.status !== 'active') return false;
  if (!rule.next_run_at) return false;

  const nextRunDate = new Date(rule.next_run_at);
  const todayDate = new Date(formatDateToISO(today));
  return nextRunDate <= todayDate;
};

export const validateRecurrenceRule = (rule: Partial<RecurrenceRule>): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!rule.start_date) errors.push('start_date is required');

  if (rule.end_date && rule.start_date) {
    if (new Date(rule.end_date) < new Date(rule.start_date)) {
      errors.push('end_date must be >= start_date');
    }
  }

  if (rule.repeat_count !== undefined && rule.repeat_count <= 0) {
    errors.push('repeat_count must be positive');
  }

  if (rule.recurrence_day !== undefined) {
    const day = typeof rule.recurrence_day === 'string'
      ? parseInt(rule.recurrence_day, 10)
      : rule.recurrence_day;
    if (day < 1 || day > 31) errors.push('recurrence_day must be between 1 and 31');
  }

  if (!rule.recurrence_type) errors.push('recurrence_type is required');

  return { valid: errors.length === 0, errors };
};
