import React, { useState, useMemo } from 'react';
import { Calendar, DollarSign, TrendingUp, TrendingDown, AlertTriangle,
   Landmark, LayoutDashboard, CheckCircle, Clock, Circle, AlertCircle,
   XCircle, PiggyBank
} from 'lucide-react';
import * as Lucide from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { BreadcrumbBar } from '../components/ui/BreadcrumbBar';
import { VisualizationToolbar } from '../components/ui/VisualizationToolbar';
import { FiltersPanel } from '../components/ui/FiltersPanel';
import { SortPanel } from '../components/ui/SortPanel';
import type { FilterField } from '../components/ui/FiltersPanel';
import type { SortOption } from '../components/ui/SortPanel';
import { TransactionTypeSelector } from '../components/ui/TransactionTypeSelector';
import { TransactionModal } from '../components/transactions/TransactionModal';
import { AdvancedTransactionModal } from '../components/transactions/AdvancedTransactionModal';
import { useAdvancedTransactions } from '../hooks/useAdvancedTransactions';
import { useDashboardData } from '../hooks/useDashboardData';
import { useWorkspace } from '../context/WorkspaceContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { cn } from '../lib/utils';
import type { Transaction, AdvancedTransactionData } from '../types';

const DEFAULT_DASHBOARD_FILTERS = {
  period: 'current_month',
  category: 'all',
  search: '',
};

const dashboardPeriodOptions = [
  { value: 'current_month', label: 'Mes atual' },
  { value: 'last_month', label: 'Ultimo mes' },
  { value: 'current_year', label: 'Ano atual' },
  { value: 'custom', label: 'Personalizado' },
  { value: 'all', label: 'Tudo' },
];

const dashboardFilterFields: FilterField[] = [
  { key: 'period', label: 'Periodo', type: 'dropdown', options: dashboardPeriodOptions },
  { key: 'search', label: 'Buscar', type: 'text', placeholder: 'Buscar transacoes...' },
];

const dashboardSortOptions: SortOption[] = [
  { value: 'date_desc', label: 'Data (mais recente)' },
  { value: 'date_asc', label: 'Data (mais antiga)' },
  { value: 'amount_desc', label: 'Valor (maior primeiro)' },
  { value: 'amount_asc', label: 'Valor (menor primeiro)' },
];

interface DashboardFilters {
  period: 'current_month' | 'last_month' | 'current_year' | 'custom' | 'all';
  category: string;
  search: string;
  startDate?: string;
  endDate?: string;
}

interface MonthlyData {
  month: string;        // yyyy-MM
  monthName: string;    // ex: set. de 2025
  year: number;
  income: number;
  expense: number;
  debtReceived: number;
  debtPaid: number;
  isCurrentMonth: boolean;
  isSelected: boolean;
}

export function Dashboard() {
  const navigate = useNavigate();
  const { currentWorkspace, loading: workspaceLoading } = useWorkspace();
  const { createAdvancedTransaction } = useAdvancedTransactions();
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isAdvancedModalOpen, setIsAdvancedModalOpen] = useState(false);
  const [selectedTransactionType, setSelectedTransactionType] = useState<'income' | 'expense' | 'debt' | 'investment'>('expense');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>();
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [sortBy, setSortBy] = useState<string>('date_desc');
  const [filters, setFilters] = useState<DashboardFilters>({
    period: 'current_month',
    category: 'all',
    search: '',
  });
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  // Dados principais (respeitam os filtros para cards de resumo/tabela)
  const { 
    data: dashboardData, 
    isLoading
  } = useDashboardData(currentWorkspace?.workspace_id, filters);

  const recentTransactions = dashboardData?.recentTransactions ?? [];

  // Dados "ALL" só para o carrossel de meses (ignora período do filtro)
  const {
    data: dashboardAllData
  } = useDashboardData(currentWorkspace?.workspace_id, { ...filters, period: 'all' });

  // Helpers de período selecionado (apenas para estilização/seleção do carrossel)
  const getPeriodRange = React.useCallback(() => {
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear(), 11, 31);

    switch (filters.period) {
      case 'current_month':
        return { start: startOfCurrentMonth, end: new Date(now.getFullYear(), now.getMonth() + 1, 0) };
      case 'last_month':
        return { start: startOfLastMonth, end: endOfLastMonth };
      case 'current_year':
        return { start: startOfYear, end: endOfYear };
      case 'custom': {
        // Se vierem no filtro, usa; senão, não seleciona nada especificamente
        if (filters.startDate && filters.endDate) {
          return { start: new Date(filters.startDate), end: new Date(filters.endDate) };
        }
        return null;
      }
      case 'all':
      default:
        return null; // "all" => não destacar por período
    }
  }, [filters]);

  const isMonthSelected = React.useCallback((date: Date) => {
    const range = getPeriodRange();
    if (!range) return false;
    // seleciona o mês se qualquer dia do mês cair dentro do range
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return endOfMonth >= range.start && startOfMonth <= range.end;
  }, [getPeriodRange]);

  // Geração dos meses (sempre 6 antes, atual e 5 depois) usando *dashboardAllData*
  const monthlyData = useMemo<MonthlyData[]>(() => {
    const months: MonthlyData[] = [];
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const monthsToGenerate: number[] = [];
    for (let i = 6; i >= 1; i--) monthsToGenerate.push(-i);
    monthsToGenerate.push(0);
    for (let i = 1; i <= 5; i++) monthsToGenerate.push(i);

    monthsToGenerate.forEach((i) => {
      const date = new Date(currentYear, currentMonth + i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      const breakdown = dashboardAllData?.monthlyBreakdown?.[monthKey] || {};
      const income = breakdown?.income || 0;
      const expense = breakdown?.expense || 0;
      const debtIn = breakdown?.debtIn || 0;
      const debtOut = breakdown?.debtOut || 0;

      months.push({
        month: monthKey,
        monthName: date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
        year: date.getFullYear(),
        income,
        expense,
        debtReceived: debtIn,
        debtPaid: debtOut,
        isCurrentMonth: i === 0,
        isSelected: isMonthSelected(date),
      });
    });

    return months;
  }, [dashboardAllData?.monthlyBreakdown, isMonthSelected]);

  // Auto-scroll: prioriza primeiro mês selecionado; se não houver, vai para o mês atual
  React.useEffect(() => {
    if (!dashboardAllData || monthlyData.length === 0) return;

    const scrollContainer = document.getElementById('monthly-scroll');
    const target =
      document.getElementById('selected-month-card') ||
      document.getElementById('current-month-card');

    if (scrollContainer && target) {
      const cs = getComputedStyle(scrollContainer);
      const paddingLeft = parseFloat(cs.paddingLeft) || 0;
      const extraOffset = 8;

      const containerRect = scrollContainer.getBoundingClientRect();
      const cardRect = target.getBoundingClientRect();

      const left =
        scrollContainer.scrollLeft + (cardRect.left - containerRect.left) - paddingLeft - extraOffset;

      scrollContainer.scrollTo({
        left: Math.max(0, Math.round(left)),
        behavior: 'smooth'
      });
    }
  }, [dashboardAllData, monthlyData]);

  const hasActiveFilters = filters.period !== 'current_month' || filters.category !== 'all' || filters.search !== '';

  const sortedTransactions = useMemo(() => {
    if (!recentTransactions) return [];
    return [...recentTransactions].sort((a, b) => {
      switch (sortBy) {
        case 'date_desc':
          return new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime();
        case 'date_asc':
          return new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime();
        case 'amount_desc':
          return Number(b.transaction_amount) - Number(a.transaction_amount);
        case 'amount_asc':
          return Number(a.transaction_amount) - Number(b.transaction_amount);
        default:
          return 0;
      }
    });
  }, [recentTransactions, sortBy]);

  const handleApplyFilters = (newFilters: Record<string, string>) => {
    const updated: DashboardFilters = {
      period: (newFilters.period || 'current_month') as DashboardFilters['period'],
      category: newFilters.category || 'all',
      search: newFilters.search || '',
    };
    if (newFilters.period === 'custom') {
      updated.startDate = newFilters.date_start || '';
      updated.endDate = newFilters.date_end || '';
    }
    setFilters(updated);
  };

  const handleApplySort = (newSort: string) => {
    setSortBy(newSort);
  };

  const handleMonthClick = (monthKey: string) => {
    setSelectedMonth(monthKey);
  };

  const handleApplyMonthFilter = () => {
    if (!selectedMonth) return;

    // Parse the month key (YYYY-MM)
    const [year, month] = selectedMonth.split('-');
    const startDate = new Date(Number(year), Number(month) - 1, 1);
    const endDate = new Date(Number(year), Number(month), 0);

    // Format dates as YYYY-MM-DD
    const startDateStr = `${year}-${month.padStart(2, '0')}-01`;
    const endDateStr = `${year}-${month.padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

    console.log('Applying month filter:', {
      selectedMonth,
      startDateStr,
      endDateStr
    });

    setFilters(prev => ({
      ...prev,
      period: 'custom',
      startDate: startDateStr,
      endDate: endDateStr,
    }));

    // Clear selected month after applying
    setSelectedMonth(null);
  };

  const handleCreateTransaction = (type: 'income' | 'expense' | 'debt' | 'investment') => {
    setEditingTransaction(undefined);
    setSelectedTransactionType(type);
    setIsAdvancedModalOpen(true);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsTransactionModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsTransactionModalOpen(false);
    setIsAdvancedModalOpen(false);
    setEditingTransaction(undefined);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
      case 'received':
        return 'text-green-600 bg-green-50';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Pago';
      case 'received':
        return 'Recebido';
      case 'pending':
        return 'Pendente';
      default:
        return status;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'income':
        return 'text-green-600 bg-green-50';
      case 'expense':
        return 'text-red-600 bg-red-50';
      case 'debt':
        return 'text-orange-600 bg-orange-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'income':
        return 'Receita';
      case 'expense':
        return 'Despesa';
      case 'debt':
        return 'Dívida';
      default:
        return type;
    }
  };

  const filtersForPanel: Record<string, string> = {
    period: filters.period,
    search: filters.search,
    ...(filters.startDate ? { date_start: filters.startDate } : {}),
    ...(filters.endDate ? { date_end: filters.endDate } : {}),
  };

  if (workspaceLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  function getTypeIcon(type: string) {
    switch (type) {
      case "income":
        return <TrendingUp className="p-1.5 rounded-lg bg-green-100 text-green-600" />;
      case "expense":
        return <TrendingDown className="p-1.5 rounded-lg bg-red-100 text-red-600" />;
      case "debt":
        return <AlertTriangle className="p-1.5 rounded-lg bg-orange-100 text-orange-600" />;
      case "investment":
        return <Landmark className="p-1.5 rounded-lg bg-blue-100 text-blue-600" />;
      default:
        return null;
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "paid":
        return <CheckCircle className="p-1.5 rounded-lg bg-green-600 text-green-50" />;
      case "received":
        return <CheckCircle className="p-1.5 rounded-lg bg-green-600 text-green-50" />;
      case "pending":
        return <Clock className="p-1.5 rounded-lg bg-yellow-500 text-yellow-50" />;
      case "open":
        return <Circle className="p-1.5 rounded-lg bg-blue-500 text-blue-50" />;
      case "overdue":
        return <AlertCircle className="p-1.5 rounded-lg bg-red-600 text-red-50" />;
      case "scheduled":
        return <Calendar className="p-1.5 rounded-lg bg-indigo-500 text-indigo-50" />;
      case "canceled":
        return <XCircle className="p-1.5 rounded-lg bg-gray-500 text-gray-50" />;
      default:
        return null;
    }
  }

  return (
    <>
      <div className="space-y-4 sm:space-y-6 w-full min-w-0">
        <div className="flex items-center justify-between px-1 sm:px-0">
          <BreadcrumbBar segments={['Dashboard']} onBack={() => navigate(-1)} />
          <div className="relative">
            <VisualizationToolbar
              onFilter={() => setShowFilters(prev => !prev)}
              onSort={() => setShowSort(prev => !prev)}
              onShare={() => {}}
              onSettings={() => {}}
              activeFilter={hasActiveFilters}
            />
            <FiltersPanel
              isOpen={showFilters}
              onClose={() => setShowFilters(false)}
              fields={dashboardFilterFields}
              currentFilters={filtersForPanel}
              defaultFilters={DEFAULT_DASHBOARD_FILTERS as unknown as Record<string, string>}
              onApply={handleApplyFilters}
            />
            <SortPanel
              isOpen={showSort}
              onClose={() => setShowSort(false)}
              options={dashboardSortOptions}
              currentSort={sortBy}
              onApply={handleApplySort}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 px-1 sm:px-0">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg flex-shrink-0">
              <LayoutDashboard className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm sm:text-base text-gray-600">Visao geral das suas financas</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TransactionTypeSelector
              onSelect={handleCreateTransaction}
              className="h-7 px-2.5 text-xs"
            />
          </div>
        </div>

        {/* Summary Cards – usam "summary" (pagos e não pagos) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 px-1 sm:px-0">
          <Card>
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Saldo</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mt-1">
                    {
                      // Saldo considerando SOMENTE lançamentos pagos/recebidos no período filtrado:
                      // (receitas pagas - despesas pagas)
                      formatCurrency(dashboardData?.summary?.balancePaid ?? 0)
                    }
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-blue-100 rounded-lg flex-shrink-0">
                  <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Receitas</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600 mt-1">
                    {
                      // Total de RECEITAS PAGAS no período filtrado
                      formatCurrency(dashboardData?.summary?.income?.paid ?? 0)
                    }
                  </p>
                  <p className="text-xs sm:text-sm font-medium text-green-400 mt-1">
                    {
                      // Total de RECEITAS NÃO PAGAS (pendentes/agendadas/abertas) no período filtrado
                      formatCurrency(dashboardData?.summary?.income?.unpaid ?? 0)
                    }{" "}
                    (Não pago)
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-green-100 rounded-lg flex-shrink-0">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Despesas</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600 mt-1">
                    {
                      // Total de DESPESAS PAGAS no período filtrado
                      formatCurrency(dashboardData?.summary?.expenses?.paid ?? 0)
                    }
                  </p>
                  <p className="text-xs sm:text-sm font-medium text-red-400 mt-1">
                    {
                      // Total de DESPESAS NÃO PAGAS (pendentes/agendadas/abertas) no período filtrado
                      formatCurrency(dashboardData?.summary?.expenses?.unpaid ?? 0)
                    }{" "}
                    (Não pago)
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-red-100 rounded-lg flex-shrink-0">
                  <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Total Investido</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600 mt-1">
                    {
                      // Total de INVESTIMENTOS PAGOS no período filtrado
                      // Obs.: o serviço detecta automaticamente se você usa 'investment' ou 'debt' como tipo.
                      formatCurrency(dashboardData?.summary?.invested?.paid ?? 0)
                    }
                  </p>
                  <p className="text-xs sm:text-sm font-medium text-blue-400 mt-1">
                    {
                      // Total de INVESTIMENTOS NÃO PAGOS no período filtrado
                      formatCurrency(dashboardData?.summary?.invested?.unpaid ?? 0)
                    }{" "}
                    (Não pago)
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-blue-100 rounded-lg flex-shrink-0">
                  <PiggyBank className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Carousel */}
        <div className="px-1 sm:px-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Visão Mensal
              </CardTitle>
            </CardHeader>
            <CardContent className="py-0 px-1 sm:px-6">
              <div
                className="overflow-x-auto scrollbar-hide"
                id="monthly-scroll"
                style={{ scrollBehavior: 'smooth' }}
              >
                <div
                  className="flex space-x-4 p-4 sm:p-6 relative"
                  style={{
                    width: 'max-content',
                    scrollSnapType: 'x mandatory',
                    paddingLeft: '0',
                    paddingRight: '0'
                  }}
                >
                  {monthlyData.map((month, idx) => {
                    const idAttr =
                      month.isSelected && !monthlyData.slice(0, idx).some(m => m.isSelected)
                        ? 'selected-month-card'
                        : month.isCurrentMonth
                          ? 'current-month-card'
                          : undefined;

                    const positiveBalance = (month.income - month.expense) >= 0;

                    const isHighlighted = month.isSelected; // << unifica destaque
                    const isUserSelected = selectedMonth === month.month;

                    return (
                      <div
                        key={month.month}
                        id={idAttr}
                        onClick={() => handleMonthClick(month.month)}
                        className={cn(
                          'flex-shrink-0 w-64 p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer hover:shadow-md',
                          isUserSelected
                            ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-400 shadow-lg transform scale-105'
                            : isHighlighted
                            ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-500'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:scale-102'
                        )}
                        style={{ scrollSnapAlign: 'start' }}
                        title={isUserSelected ? 'Click Apply Filter to apply' : month.isSelected ? 'Selected by period filter' : 'Click to select month'}
                      >
                        <div className="text-center mb-3">
                          <h3
                            className={cn(
                              'font-semibold capitalize',
                              isHighlighted ? 'text-blue-700' : 'text-gray-900' // << mesma cor no título
                            )}
                          >
                            {month.monthName}
                          </h3>

                          {/* Apenas o mês atual mostra o subtítulo */}
                          {month.isCurrentMonth && (
                            <span className="text-xs text-blue-600 font-medium">Mês Atual</span>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Receita:</span>
                            <span className="font-medium text-green-600">
                              {formatCurrency(month.income)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Despesa:</span>
                            <span className="font-medium text-red-600">
                              {formatCurrency(month.expense)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Investimento:</span>
                            <span className="font-medium text-blue-600">
                              {formatCurrency(month.debtReceived)}
                            </span>
                          </div>
                          <hr className="my-2" />
                          <div className="flex justify-between text-sm font-semibold">
                            <span className="text-gray-900">Saldo:</span>
                            <span className={cn('font-bold', positiveBalance ? 'text-green-600' : 'text-red-600')}>
                              {formatCurrency(month.income - month.expense)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Apply Button */}
              {selectedMonth && (
                <div className="flex justify-center pb-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <Button
                    onClick={handleApplyMonthFilter}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                  >
                    Apply Filter
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Visualizations Area
        <div className="px-1 sm:px-0">
          <MonthlyChart data={dashboardData?.monthlyComparison || []} />
        </div> */}

        {/* Recent Transactions */}
        <div className="px-1 sm:px-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Lançamentos</CardTitle>
            </CardHeader>
            <CardContent className="py-0 px-1 sm:px-6">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
                </div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <div className="max-h-[560px] overflow-y-auto">
                    <table className="w-full min-w-[800px]">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="sticky top-0 z-10 bg-white shadow-sm text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 w-[60px]">
                            Tipo
                          </th>
                          <th className="sticky top-0 z-10 bg-white shadow-sm text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 w-[70px]">
                            Status
                          </th>
                          <th className="sticky top-0 z-10 bg-white shadow-sm text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 min-w-[160px]">
                            Título
                          </th>
                          <th className="sticky top-0 z-10 bg-white shadow-sm text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 min-w-[110px]">
                            Data
                          </th>
                          <th className="sticky top-0 z-10 bg-white shadow-sm text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 min-w-[120px]">
                            Valor
                          </th>
                          <th className="sticky top-0 z-10 bg-white shadow-sm text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 min-w-[160px]">
                            Conta Bancária
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {sortedTransactions.map((transaction) => (
                          <tr
                            key={transaction.transaction_id}
                            className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                            onClick={() => handleEditTransaction(transaction)}
                          >
                            <td className="py-2 sm:py-3 px-2 sm:px-4 text-center">
                              <span
                                className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-50"
                                title={getTypeLabel(transaction.transaction_type)}
                              >
                                {getTypeIcon(transaction.transaction_type)}
                              </span>
                            </td>

                            <td className="py-2 sm:py-3 px-2 sm:px-4 text-center">
                              <span
                                className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-50"
                                title={getStatusLabel(transaction.transaction_status || "pending")}
                              >
                                {getStatusIcon(transaction.transaction_status || "pending")}
                              </span>
                            </td>

                            <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-gray-900">
                              <span className="truncate block max-w-[140px] sm:max-w-none">
                                {transaction.transaction_description}
                              </span>
                            </td>

                            <td className="py-2 sm:py-3 px-2 sm:px-4 text-center text-xs sm:text-sm text-gray-600">
                              {formatDate(transaction.transaction_date)}
                            </td>

                            <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-right font-medium">
                              {formatCurrency(Number(transaction.transaction_amount))}
                            </td>

                            <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-gray-900">
                              <div className="flex items-center gap-2">
                                {/* Quadrado com cor e ícone Lucide centralizado */}
                                <div
                                  className="flex items-center justify-center text-white p-1.5 rounded-lg" /* tamanho consistente por linha */
                                  style={{ backgroundColor: transaction.transaction_account_color || 'unset' }}
                                >
                                  {(() => {
                                    const iconKey = (transaction.transaction_account_icon || '') as keyof typeof Lucide;
                                    const DynamicIcon = Lucide[iconKey] as React.ComponentType<{ className?: string }>;
                                    return DynamicIcon ? (
                                      <DynamicIcon className="w-3 h-3" />
                                    ) : null;
                                  })()}
                                </div>

                                {/* Nome da conta */}
                                <span className="truncate block max-w-[140px] sm:max-w-none">
                                  {transaction.transaction_account}
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {sortedTransactions.length === 0 && (
                    <div className="text-center py-6 sm:py-8 text-gray-500 px-4">
                      <p className="text-base sm:text-lg font-medium">Nenhuma transação encontrada</p>
                      <p className="text-xs sm:text-sm">Comece criando sua primeira transação</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={handleCloseModal}
        transaction={editingTransaction}
      />

      {/* Advanced Transaction Modal */}
      <AdvancedTransactionModal
        isOpen={isAdvancedModalOpen}
        onClose={handleCloseModal}
        transactionType={selectedTransactionType}
        onSave={async (data: AdvancedTransactionData) => {
          await createAdvancedTransaction.mutateAsync({ 
            transactionType: selectedTransactionType, 
            data 
          });
          handleCloseModal();
        }}
      />
    </>
  );
}