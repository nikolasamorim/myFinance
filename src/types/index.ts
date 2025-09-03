export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  created_at: string;
}

export interface Workspace {
  workspace_id: string;
  workspace_name: string;
  workspace_type: 'personal' | 'family' | 'business';
  workspace_icon?: string;
  workspace_owner_user_id: string;
  workspace_created_at: string;
}

export interface Transaction {
  transaction_id: string;
  transaction_workspace_id: string;
  transaction_type: 'expense' | 'income' | 'debt' | 'investment';
  transaction_description: string;
  transaction_amount: number;
  transaction_issue_date: string;
  transaction_competence_date: string;
  transaction_payment_method: string;
  transaction_is_paid: boolean;
  transaction_category_id?: string;
  transaction_cost_center_id?: string;
  transaction_bank_id?: string;
  transaction_card_id?: string;
  transaction_date: string;
  transaction_created_at: string;
  transaction_updated_at?: string;
  recurrence_id?: string;
  installment_group_id?: string;
  installment_number?: number;
  installment_total?: number;
  transaction_status?: 'pending' | 'paid' | 'received';
  transaction_account: string;
  transaction_account_color: string;
  transaction_account_icon: string;
}

export interface AdvancedTransactionData {
  transaction_type: 'income' | 'expense' | 'debt' | 'investment';
  description: string;
  emission_date: string;
  due_date: string;
  competence_date: string;
  amount: number;
  account_id: string;
  credit_card_id?: string;
  cost_center_id?: string;
  category_id?: string;
  payment_method: string;
  is_installment: boolean;
  is_recurring: boolean;
  installments?: InstallmentData[];
  recurrence?: RecurrenceData;
}

export interface InstallmentData {
  id: string;
  number: number;
  date: string;
  competence: string;
  cost_center_id: string;
  amount: number;
}

export interface RecurrenceData {
  enabled: boolean;
  start_date: string;
  end_date?: string;
  recurrence_type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  repeat_count?: number;
  due_adjustment: 'none' | 'previous_business_day' | 'next_business_day';
  recurrence_day?: string;
}

export interface RecurrenceRule {
  id: string;
  workspace_id: string;
  user_id: string;
  transaction_type: 'income' | 'expense' | 'debt' | 'investment';
  description: string;
  start_date: string;
  recurrence_type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  repeat_count?: number;
  end_date?: string;
  due_adjustment: 'none' | 'previous_business_day' | 'next_business_day';
  recurrence_day?: string;
  status: 'active' | 'paused' | 'canceled';
  created_at: string;
  updated_at: string;
}

export interface InstallmentGroup {
  id: string;
  workspace_id: string;
  user_id: string;
  total_value: number;
  installment_count: number;
  initial_due_date: string;
  description: string;
  payment_method_id?: string;
  account_id?: string;
  card_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  category_id: string;
  category_name: string;
  category_type: 'expense' | 'income' | 'debt' | 'investment';
  category_workspace_id: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  description: string;
  is_read: boolean;
  created_at: string;
}

export interface DashboardStats {
  currentBalance: number;
  totalExpenses: number;
  totalDebts: number;
  monthlyComparison: MonthlyData[];
}

export interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  checkWorkspaces: () => Promise<boolean>;
}

export interface WorkspaceContextType {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  setCurrentWorkspace: (workspace: Workspace) => void;
  loading: boolean;
  refetchWorkspaces: () => Promise<void>;
}

export interface Visualization {
  visualization_id: string;
  visualization_workspace_id: string;
  visualization_user_id: string;
  visualization_name: string;
  visualization_type: 'cards' | 'graph' | 'table';
  visualization_screen_context: string;
  visualization_config: Record<string, any>;
  visualization_is_default: boolean;
  visualization_created_at: string;
  visualization_updated_at: string;
}