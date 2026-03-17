import type { Transaction } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DashboardTransaction extends Transaction {
  transaction_account: string | null;
  transaction_account_color: string | null;
  transaction_category_name: string | null;
  transaction_category_color: string | null;
  transaction_card_name: string | null;
  transaction_cost_center_name: string | null;
  accounts?: { id: string; title: string; color: string | null; icon: string | null } | null;
  categories?: { category_id: string; category_name: string; color: string | null; icon: string | null } | null;
  credit_cards?: { credit_card_id: string; credit_card_name: string; color: string | null; icon: string | null } | null;
  cost_centers?: { cost_center_id: string; cost_center_name: string; color: string | null; icon: string | null } | null;
}

export interface GroupedItem {
  name: string;
  value: number;
  color: string;
  pct: number;
}

export interface AccountSummary {
  name: string;
  icon: string | null;
  color: string | null;
  net: number;
  count: number;
}

export interface CardSummary {
  name: string;
  color: string | null;
  total: number;
}

// ─── Pure functions ───────────────────────────────────────────────────────────

const FALLBACK_COLOR = '#6b7280';

export function groupByCategory(
  transactions: DashboardTransaction[],
  type: 'income' | 'expense'
): GroupedItem[] {
  const map = new Map<string, { value: number; color: string }>();

  for (const t of transactions) {
    if (t.transaction_type !== type) continue;
    const name = t.transaction_category_name ?? 'Sem categoria';
    const color = t.transaction_category_color ?? t.categories?.color ?? FALLBACK_COLOR;
    const existing = map.get(name);
    if (existing) {
      existing.value += Number(t.transaction_amount);
    } else {
      map.set(name, { value: Number(t.transaction_amount), color });
    }
  }

  const items = Array.from(map.entries())
    .map(([name, { value, color }]) => ({ name, value, color, pct: 0 }))
    .sort((a, b) => b.value - a.value);

  const maxValue = items[0]?.value ?? 1;
  return items.map((item) => ({ ...item, pct: (item.value / maxValue) * 100 }));
}

export function groupByCostCenter(
  transactions: DashboardTransaction[],
  type: 'income' | 'expense'
): GroupedItem[] {
  const map = new Map<string, { value: number; color: string }>();

  for (const t of transactions) {
    if (t.transaction_type !== type) continue;
    const name = t.transaction_cost_center_name ?? 'Sem centro';
    const color = t.cost_centers?.color ?? FALLBACK_COLOR;
    const existing = map.get(name);
    if (existing) {
      existing.value += Number(t.transaction_amount);
    } else {
      map.set(name, { value: Number(t.transaction_amount), color });
    }
  }

  const items = Array.from(map.entries())
    .map(([name, { value, color }]) => ({ name, value, color, pct: 0 }))
    .sort((a, b) => b.value - a.value);

  const maxValue = items[0]?.value ?? 1;
  return items.map((item) => ({ ...item, pct: (item.value / maxValue) * 100 }));
}

export function groupByAccount(transactions: DashboardTransaction[]): AccountSummary[] {
  const map = new Map<
    string,
    { income: number; expense: number; count: number; icon: string | null; color: string | null }
  >();

  for (const t of transactions) {
    const name = t.transaction_account ?? 'Sem conta';
    const existing = map.get(name);
    const amount = Number(t.transaction_amount);
    if (existing) {
      if (t.transaction_type === 'income') existing.income += amount;
      else if (t.transaction_type === 'expense') existing.expense += amount;
      existing.count++;
    } else {
      map.set(name, {
        income: t.transaction_type === 'income' ? amount : 0,
        expense: t.transaction_type === 'expense' ? amount : 0,
        count: 1,
        icon: t.accounts?.icon ?? null,
        color: t.transaction_account_color ?? null,
      });
    }
  }

  return Array.from(map.entries())
    .map(([name, { income, expense, count, icon, color }]) => ({
      name,
      icon,
      color,
      net: income - expense,
      count,
    }))
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
}

export function groupByCard(transactions: DashboardTransaction[]): CardSummary[] {
  const map = new Map<string, { total: number; color: string | null }>();

  for (const t of transactions) {
    if (!t.transaction_card_name) continue;
    const name = t.transaction_card_name;
    const existing = map.get(name);
    if (existing) {
      existing.total += Number(t.transaction_amount);
    } else {
      map.set(name, {
        total: Number(t.transaction_amount),
        color: t.credit_cards?.color ?? null,
      });
    }
  }

  return Array.from(map.entries())
    .map(([name, { total, color }]) => ({ name, color, total }))
    .sort((a, b) => b.total - a.total);
}

export function getNextDueDate(
  transactions: DashboardTransaction[],
  type: 'income' | 'expense'
): string | null {
  const pending = transactions
    .filter(
      (t) =>
        t.transaction_type === type &&
        ['pending', 'scheduled', 'overdue'].includes(t.transaction_status ?? '')
    )
    .sort(
      (a, b) =>
        new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
    );

  return pending[0]?.transaction_date ?? null;
}
