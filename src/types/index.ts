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
  transaction_category_id?: string;
  transaction_date: string;
  transaction_created_at: string;
  transaction_updated_at?: string;
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