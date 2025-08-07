import React, { useState, useMemo } from 'react';
import { Plus, Filter, Calendar, DollarSign, TrendingUp, TrendingDown, CreditCard, LayoutDashboard, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Dropdown } from '../components/ui/Dropdown';
import { TransactionModal } from '../components/transactions/TransactionModal';
import { MonthlyChart } from '../components/dashboard/MonthlyChart';
import { useDashboardData } from '../hooks/useDashboardData';
import { useWorkspace } from '../context/WorkspaceContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { cn } from '../lib/utils';
import type { Transaction } from '../types';

interface DashboardFilters {
  period: string;
  category: string;
  search: string;
}

interface MonthlyData {
  month: string;
  monthName: string;
  year: number;
  income: number;
  expense: number;
  debtReceived: number;
  debtPaid: number;
  isCurrentMonth: boolean;
}

export function Dashboard() {
  const { currentWorkspace, loading: workspaceLoading } = useWorkspace();
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<DashboardFilters>({
    period: 'current_month',
    category: 'all',
    search: '',
  });

  const { 
    data: dashboardData, 
    isLoading,
    recentTransactions 
  } = useDashboardData(currentWorkspace?.workspace_id, filters);

  // Generate monthly data for carousel
  const monthlyData = useMemo(() => {
    const months: MonthlyData[] = [];
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    // Generate months in chronological order: 6 before, current, 5 after
    const monthsToGenerate = [];
    
    // Add previous months (6 before) - from oldest to newest
    for (let i = 6; i >= 1; i--) {
      monthsToGenerate.push(-i);
    }
    
    // Add current month
    monthsToGenerate.push(0);
    
    // Add future months (5 after)
    for (let i = 1; i <= 5; i++) {
      monthsToGenerate.push(i);
    }

    monthsToGenerate.forEach((i) => {
      const date = new Date(currentYear, currentMonth + i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      months.push({
        month: monthKey,
        monthName: date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
        year: date.getFullYear(),
        income: dashboardData?.monthlyBreakdown?.[monthKey]?.income || 0,
        expense: dashboardData?.monthlyBreakdown?.[monthKey]?.expense || 0,
        debtReceived: dashboardData?.monthlyBreakdown?.[monthKey]?.debtIn || 0,
        debtPaid: dashboardData?.monthlyBreakdown?.[monthKey]?.debtOut || 0,
        isCurrentMonth: i === 0,
      });
    });

    return months;
  }, [dashboardData?.monthlyBreakdown]);

  // Auto-scroll to current month when data loads
  React.useEffect(() => {
    if (dashboardData && monthlyData.length > 0) {
      const scrollContainer = document.getElementById('monthly-scroll');
      const currentMonthCard = document.getElementById('current-month-card');
      
      if (scrollContainer && currentMonthCard) {
        const cs = getComputedStyle(scrollContainer);
        const paddingLeft = parseFloat(cs.paddingLeft) || 0;
        const extraOffset = 8; // “respiro” adicional
      
        const containerRect = scrollContainer.getBoundingClientRect();
        const cardRect = currentMonthCard.getBoundingClientRect();
      
        const targetLeft =
          scrollContainer.scrollLeft + (cardRect.left - containerRect.left) - paddingLeft - extraOffset;
      
        scrollContainer.scrollTo({
          left: Math.max(0, Math.round(targetLeft)),
          behavior: 'smooth'
        });
      }      
    }
  }, [dashboardData, monthlyData]);

  const handleFilterChange = (key: keyof DashboardFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleCreateTransaction = () => {
    setEditingTransaction(undefined);
    setIsTransactionModalOpen(true);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsTransactionModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsTransactionModalOpen(false);
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

  const periodOptions = [
    { value: 'current_month', label: 'Mês atual' },
    { value: 'last_month', label: 'Último mês' },
    { value: 'current_year', label: 'Ano atual' },
    { value: 'custom', label: 'Personalizado' },
  ];

  if (workspaceLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 sm:space-y-6 w-full min-w-0 overflow-x-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 px-1 sm:px-0">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg flex-shrink-0">
              <LayoutDashboard className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm sm:text-base text-gray-600">Visão geral das suas finanças</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3 flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Filtros
            </Button>
            <Button onClick={handleCreateTransaction} size="sm">
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Nova Transação
            </Button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="px-1 sm:px-0">
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Período</label>
                    <Dropdown
                      options={periodOptions}
                      value={filters.period}
                      onChange={(value) => handleFilterChange('period', value)}
                    />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-1">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Buscar</label>
                    <Input
                      placeholder="Buscar transações..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Summary Cards - Paid Transactions Only */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 px-1 sm:px-0">
          <Card>
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Saldo Atual</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(dashboardData?.paidSummary?.currentBalance || 0)}
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
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Receitas Pagas</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600 mt-1">
                    {formatCurrency(dashboardData?.paidSummary?.totalIncome || 0)}
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
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Despesas Pagas</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600 mt-1">
                    {formatCurrency(dashboardData?.paidSummary?.totalExpenses || 0)}
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
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Dívidas Pagas</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-600 mt-1">
                    {formatCurrency(dashboardData?.paidSummary?.totalDebts || 0)}
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-orange-100 rounded-lg flex-shrink-0">
                  <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-orange-600" />
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
            <CardContent className="p-0 sm:p-6">
              <div 
                className="overflow-x-auto scrollbar-hide" 
                id="monthly-scroll"
                style={{ scrollBehavior: 'smooth' }}
              >
                <div 
                  className="flex space-x-4 p-4 sm:p-6"
                  style={{ 
                    width: 'max-content',
                    scrollSnapType: 'x mandatory',
                    paddingLeft: '0',
                    paddingRight: '0'
                  }}
                >
                  {monthlyData.map((month, index) => (
                    <div
                      key={month.month}
                      id={month.isCurrentMonth ? 'current-month-card' : undefined}
                      className={cn(
                        'flex-shrink-0 w-64 p-4 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md',
                        month.isCurrentMonth 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      )}
                      style={{ scrollSnapAlign: 'start' }}
                    >
                      <div className="text-center mb-3">
                        <h3 className={cn(
                          'font-semibold capitalize',
                          month.isCurrentMonth ? 'text-blue-700' : 'text-gray-900'
                        )}>
                          {month.monthName}
                        </h3>
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
                          <span className="text-gray-600">Dívida recebida:</span>
                          <span className="font-medium text-orange-600">
                            {formatCurrency(month.debtReceived)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Dívida paga:</span>
                          <span className="font-medium text-orange-800">
                            {formatCurrency(month.debtPaid)}
                          </span>
                        </div>
                        <hr className="my-2" />
                        <div className="flex justify-between text-sm font-semibold">
                          <span className="text-gray-900">Saldo:</span>
                          <span className={cn(
                            'font-bold',
                            (month.income - month.expense) >= 0 ? 'text-green-600' : 'text-red-600'
                          )}>
                            {formatCurrency(month.income - month.expense)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Visualizations Area */}
        <div className="px-1 sm:px-0">
          <MonthlyChart data={dashboardData?.monthlyComparison || []} />
        </div>

        {/* Recent Transactions */}
        <div className="px-1 sm:px-0">
          <Card>
            <CardHeader>
              <CardTitle>Últimos Lançamentos</CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-2 sm:px-3 text-xs font-medium text-gray-600 min-w-[120px]">Descrição</th>
                      <th className="text-right py-2 px-2 sm:px-3 text-xs font-medium text-gray-600 min-w-[80px]">Valor</th>
                      <th className="text-center py-2 px-2 sm:px-3 text-xs font-medium text-gray-600 min-w-[70px]">Tipo</th>
                      <th className="text-center py-2 px-2 sm:px-3 text-xs font-medium text-gray-600 min-w-[70px]">Status</th>
                      <th className="text-center py-2 px-2 sm:px-3 text-xs font-medium text-gray-600 min-w-[90px]">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTransactions?.map((transaction) => (
                      <tr 
                        key={transaction.transaction_id} 
                        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleEditTransaction(transaction)}
                      >
                        <td className="py-2 px-2 sm:px-3 text-xs text-gray-900">
                          <span className="truncate block max-w-[100px] sm:max-w-none">
                            {transaction.transaction_description}
                          </span>
                        </td>
                        <td className="py-2 px-2 sm:px-3 text-xs text-right font-medium">
                          {formatCurrency(Number(transaction.transaction_amount))}
                        </td>
                        <td className="py-2 px-2 sm:px-3 text-center">
                          <span className={`inline-flex px-1 sm:px-1.5 py-0.5 text-xs font-medium rounded-full ${getTypeColor(transaction.transaction_type)}`}>
                            {getTypeLabel(transaction.transaction_type)}
                          </span>
                        </td>
                        <td className="py-2 px-2 sm:px-3 text-center">
                          <span className={`inline-flex px-1 sm:px-1.5 py-0.5 text-xs font-medium rounded-full ${getStatusColor(transaction.transaction_status || 'pending')}`}>
                            {getStatusLabel(transaction.transaction_status || 'pending')}
                          </span>
                        </td>
                        <td className="py-2 px-2 sm:px-3 text-center text-xs text-gray-600">
                          {formatDate(transaction.transaction_date)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {(!recentTransactions || recentTransactions.length === 0) && (
                  <div className="text-center py-4 sm:py-6 text-xs text-gray-500 px-4">
                    Nenhuma transação encontrada
                  </div>
                )}
              </div>
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
    </>
  );
}