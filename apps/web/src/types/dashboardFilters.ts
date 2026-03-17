export interface DashboardAdvancedFilters {
  period: string;
  date_start: string;
  date_end: string;
  search: string;
  type: string[];
  status: string[];
  account_id: string;
  category_id: string;
  cost_center_id: string;
  credit_card_id: string;
}

export const DEFAULT_DASHBOARD_ADVANCED_FILTERS: DashboardAdvancedFilters = {
  period: 'current_month',
  date_start: '',
  date_end: '',
  search: '',
  type: [],
  status: [],
  account_id: '',
  category_id: '',
  cost_center_id: '',
  credit_card_id: '',
};

export function countActiveDashboardFilters(f: DashboardAdvancedFilters): number {
  let count = 0;
  if (f.period !== 'current_month') count++;
  if (f.search) count++;
  if (f.type.length > 0) count++;
  if (f.status.length > 0) count++;
  if (f.account_id) count++;
  if (f.category_id) count++;
  if (f.cost_center_id) count++;
  if (f.credit_card_id) count++;
  return count;
}
