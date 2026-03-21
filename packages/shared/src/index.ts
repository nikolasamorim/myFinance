// ─── Tipos Utilitários ───────────────────────────────────────────────────────

/** Códigos de erro padronizados para toda a aplicação */
export type AppErrorCode =
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'SERVER_ERROR'
  | 'NETWORK_ERROR';

/** Formato de erro padronizado para exibição na UI */
export interface AppError {
  code: AppErrorCode | string;
  message: string;
  details?: unknown;
}

/** Resultado paginado de qualquer listagem */
export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ─── Entidades de Domínio ────────────────────────────────────────────────────

/**
 * Representa o usuário autenticado (Supabase Auth).
 * O campo `id` corresponde a auth.users.id (UUID).
 */
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
  workspace_updated_at?: string | null;
}

/**
 * Conta bancária/financeira.
 * Colunas reais da tabela `public.accounts`.
 */
export interface Account {
  id: string;
  workspace_id: string;
  title: string;
  type: string;
  initial_balance: number | null;
  opened_at: string;
  color: string | null;
  icon: string | null;
  description: string | null;
  accounting_code: string | null;
  cost_center_id: string | null;
  cancel_days: number | null;
  parent_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Transaction {
  transaction_id: string;
  transaction_workspace_id: string;
  transaction_type: 'expense' | 'income' | 'debt' | 'investment';
  transaction_description: string;
  transaction_amount: number;
  transaction_date: string;
  transaction_payment_method: string | null;
  /** payment_method é um campo alternativo/legado presente no DB */
  payment_method?: string | null;
  transaction_status: string | null;
  transaction_category_id: string | null;
  transaction_cost_center_id: string | null;
  /** transaction_bank_id referencia accounts.id */
  transaction_bank_id: string | null;
  transaction_card_id: string | null;
  transaction_person_id: string | null;
  transaction_origin: string | null;
  transaction_recurrence: string | null;
  transaction_created_by_user_id: string;
  transaction_created_at: string | null;
  transaction_updated_at: string | null;
  updated_at?: string | null;
  // Campos de recorrência
  recurring: boolean | null;
  recurrence_id: string | null;
  recurrence_rule_id: string | null;
  recurrence_sequence: number | null;
  recurrence_instance_date: string | null;
  parent_recurrence_rule_id: string | null;
  is_recurrence_generated: boolean | null;
  generated_at: string | null;
  version: number | null;
  // Campos de parcelamento
  installment_group_id: string | null;
  installment_number: number | null;
  installment_total: number | null;
  // Campos legados / não persistidos no DB (podem ser undefined)
  transaction_issue_date?: string;
  transaction_competence_date?: string;
  transaction_is_paid?: boolean;
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

export type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type DueAdjustment = 'none' | 'previous_business_day' | 'next_business_day';
export type RecurrenceStatus = 'active' | 'paused' | 'canceled' | 'completed' | 'error';

export interface RecurrenceData {
  enabled: boolean;
  start_date: string;
  end_date?: string;
  recurrence_type: RecurrenceType;
  repeat_count?: number;
  due_adjustment: DueAdjustment;
  recurrence_day?: number;
}

/**
 * Regra de recorrência.
 * Nota: recurrence_day é string no DB (pode conter ex: "15" ou "last").
 */
export interface RecurrenceRule {
  id: string;
  workspace_id: string;
  created_by_user_id?: string | null;
  transaction_type: 'income' | 'expense' | 'debt' | 'investment';
  description: string;
  start_date: string;
  recurrence_type: RecurrenceType;
  repeat_count?: number | null;
  end_date?: string | null;
  due_adjustment: DueAdjustment | null;
  recurrence_day?: string | null;
  status: RecurrenceStatus | null;
  created_at: string | null;
  updated_at: string | null;
  next_run_at?: string | null;
  last_generated_at?: string | null;
  generation_count: number | null;
  generated_until?: string | null;
  timezone: string | null;
  amount?: number | null;
  account_id?: string | null;
  category_id?: string | null;
  notes?: string | null;
  error_count: number | null;
  last_error_at?: string | null;
  last_error_message?: string | null;
}

export interface InstallmentGroup {
  id: string;
  workspace_id: string;
  user_id: string;
  total_value: number;
  installment_count: number;
  initial_due_date: string;
  description: string;
  payment_method_id?: string | null;
  account_id?: string | null;
  card_id?: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Category {
  category_id: string;
  category_name: string;
  category_type: 'expense' | 'income' | 'debt' | 'investment';
  category_workspace_id: string;
  color: string | null;
  icon: string | null;
  description: string | null;
  parent_id: string | null;
  sort_order: number | null;
  category_created_at?: string | null;
  category_updated_at?: string | null;
}

export interface CostCenter {
  cost_center_id: string;
  cost_center_name: string;
  cost_center_workspace_id: string;
  type: string | null;
  code: string | null;
  accounting_code: string | null;
  parent_id: string | null;
  sort_order: number | null;
  status: string | null;
  color: string | null;
  icon: string | null;
  description: string | null;
  cost_center_created_at: string | null;
  cost_center_updated_at: string | null;
  updated_at?: string | null;
}

export interface CreditCard {
  credit_card_id: string;
  credit_card_name: string;
  credit_card_workspace_id: string;
  credit_card_limit: number | null;
  credit_card_closing_day: number | null;
  credit_card_due_day: number | null;
  current_balance: number | null;
  last_four_digits: number | null;
  color: string | null;
  icon: string | null;
  credit_card_created_at: string | null;
  credit_card_updated_at: string | null;
  updated_at?: string | null;
}

export interface Bank {
  bank_id: string;
  bank_name: string;
  bank_workspace_id: string;
  bank_created_at: string | null;
  bank_updated_at: string | null;
  updated_at?: string | null;
}

export interface Broker {
  broker_id: string;
  broker_name: string;
  broker_workspace_id: string;
  broker_created_at: string | null;
  broker_updated_at: string | null;
  updated_at?: string | null;
}

export type NotificationType =
  | 'invoice_closing'
  | 'invoice_due'
  | 'transaction_status_changed'
  | 'recurrence_processed'
  | 'recurrence_paused'
  | 'recurrence_canceled'
  | 'account_low_balance'
  | 'budget_exceeded'
  | 'custom';

export type NotificationEntityType =
  | 'transaction'
  | 'account'
  | 'category'
  | 'credit_card'
  | 'recurrence_rule';

export interface Notification {
  id: string;
  user_id: string;
  workspace_id: string;
  type: NotificationType;
  title: string;
  message: string;
  entity_type?: NotificationEntityType;
  entity_id?: string;
  data?: Record<string, unknown>;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
  scheduled_for?: string;
}

export interface NotificationPreference {
  id: string;
  user_id: string;
  workspace_id: string;
  notification_type: NotificationType;
  enabled: boolean;
  advance_days?: number | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationSubscription {
  id: string;
  user_id: string;
  workspace_id: string;
  entity_type: NotificationEntityType;
  entity_id: string;
  notification_types: NotificationType[];
  created_at: string;
}

export interface NotificationFilters {
  unread_only?: boolean;
  type?: NotificationType;
  entity_type?: NotificationEntityType;
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

export type WorkspaceRole = 'owner' | 'admin' | 'member';

export interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  email: string;
  name: string;
  joined_at: string;
}

export interface Team {
  team_id: string;
  workspace_id: string;
  name: string;
  created_by: string;
  created_at: string;
}

export type TeamRole = 'admin' | 'member';

export interface TeamMember {
  team_id: string;
  user_id: string;
  role: TeamRole;
  name: string;
  email: string;
  joined_at: string;
}

export interface WorkspaceContextType {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  setCurrentWorkspace: (workspace: Workspace) => void;
  loading: boolean;
  refetchWorkspaces: () => Promise<void>;
  userRole: WorkspaceRole | null;
}

export interface Visualization {
  visualization_id: string;
  visualization_workspace_id: string;
  visualization_user_id: string;
  visualization_name: string;
  visualization_type: 'cards' | 'graph' | 'table';
  visualization_screen_context: string;
  visualization_config: Record<string, unknown>;
  visualization_is_default: boolean;
  visualization_created_at: string;
  visualization_updated_at: string;
}

// ─── Bank Reconciliation ──────────────────────────────────────────────────────

export type ReconciliationTab = 'pendentes' | 'conciliados' | 'ignorados';

export interface BankReconciliation {
  id: string;
  workspace_id: string;
  imported_transaction_id: string;
  system_transaction_id: string;
  reconciled_by_user_id: string;
  reconciled_at: string;
  notes: string | null;
}

/** Par conciliado com os dois lançamentos expandidos */
export interface ReconciliationRow {
  reconciliation: BankReconciliation;
  imported: Transaction;
  system: Transaction;
}

/** Candidato retornado pelo endpoint de sugestões, com score de 0-100 */
export interface ReconciliationSuggestion {
  transaction: Transaction;
  score: number;
}

export interface ReconcilePayload {
  imported_transaction_id: string;
  system_transaction_id: string;
  notes?: string;
}

export interface ReconciliationFilters {
  account_id?: string;
  start_date?: string;
  end_date?: string;
}

/** Lançamento importado com status de conciliação calculado */
export interface ImportedTransactionWithStatus {
  transaction: Transaction;
  reconciliation: BankReconciliation | null;
}
