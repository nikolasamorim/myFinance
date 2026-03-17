export interface AdvancedFilters {
  // Period
  period: string;
  date_start?: string;
  date_end?: string;

  // Status multi-select
  status: string[];

  // Tipo de lançamento multi-select
  type: string[];

  // Value range
  amount_min?: string;
  amount_max?: string;

  // Selects (IDs, empty string = all)
  account_id: string;
  category_id: string;
  cost_center_id: string;
  credit_card_id: string;

  // Advanced toggles
  only_due_today: boolean;
  no_category: boolean;
  no_account: boolean;
  only_last_installment: boolean;
}

export const DEFAULT_ADVANCED_FILTERS: AdvancedFilters = {
  period: 'this_month',
  date_start: '',
  date_end: '',
  status: [],
  type: [],
  amount_min: '',
  amount_max: '',
  account_id: '',
  category_id: '',
  cost_center_id: '',
  credit_card_id: '',
  only_due_today: false,
  no_category: false,
  no_account: false,
  only_last_installment: false,
};

export function countActiveFilters(filters: AdvancedFilters): number {
  let count = 0;
  if (filters.period !== 'this_month') count++;
  if (filters.status.length > 0) count++;
  if (filters.type.length > 0) count++;
  if (filters.amount_min || filters.amount_max) count++;
  if (filters.account_id) count++;
  if (filters.category_id) count++;
  if (filters.cost_center_id) count++;
  if (filters.credit_card_id) count++;
  if (filters.only_due_today) count++;
  if (filters.no_category) count++;
  if (filters.no_account) count++;
  if (filters.only_last_installment) count++;
  return count;
}
