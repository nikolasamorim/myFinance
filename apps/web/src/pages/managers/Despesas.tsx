import React, { useState } from 'react';
import * as Lucide from 'lucide-react';
import {
  TrendingDown,
  TrendingUp,
  Plus,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  Edit,
  AlertCircle,
  Circle,
  XCircle,
  Trash2,
  CreditCard,
  RefreshCcw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Dropdown } from '../../components/ui/Dropdown';
import { Modal } from '../../components/ui/Modal';
import { BreadcrumbBar } from '../../components/ui/BreadcrumbBar';
import { VisualizationToolbar } from '../../components/ui/VisualizationToolbar';
import { SortPanel } from '../../components/ui/SortPanel';
import type { SortOption } from '../../components/ui/SortPanel';
import { AdvancedFilterModal } from '../../components/filters/AdvancedFilterModal';
import type { AdvancedFilters } from '../../types/filters';
import { DEFAULT_ADVANCED_FILTERS, countActiveFilters } from '../../types/filters';
import { useDespesas } from '../../hooks/useDespesas';
import { formatCurrency, formatDate, cn } from '../../lib/utils';
import type { DespesaData } from '../../services/despesa.service';
import { AdvancedTransactionModal } from '../../components/transactions/AdvancedTransactionModal';
import { useAdvancedTransactions } from '../../hooks/useAdvancedTransactions';
import type { AdvancedTransactionData } from '../../types';


interface DespesaFormData {
  title: string;
  subtitle: string;
  amount: number;
  transaction_date: string;
  status: 'pending' | 'paid';
  repeat_type: 'avulsa' | 'fixa' | 'recorrente';
  repeat_interval: string;
  is_installment: boolean;
  installment_total: number;
  category_id: string;
  cost_center_id: string;
  bank_id: string;
  notes: string;
}

const statusOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendente' },
  { value: 'paid', label: 'Pagas' },
];

const typeOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'avulsa', label: 'Avulsa' },
  { value: 'fixa', label: 'Fixa' },
  { value: 'recorrente', label: 'Recorrente' },
];

const installmentOptions = [
  { value: 'all', label: 'Todas' },
  { value: 'installments', label: 'Somente parceladas' },
];

const periodOptions = [
  { value: 'current_month', label: 'Mês atual' },
  { value: 'last_month', label: 'Último mês' },
  { value: 'custom', label: 'Personalizado' },
];

const repeatIntervalOptions = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'yearly', label: 'Anual' },
];

const repeatTypeOptions = [
  { value: 'avulsa', label: 'Avulsa' },
  { value: 'fixa', label: 'Fixa' },
  { value: 'recorrente', label: 'Recorrente' },
];


const sortOptions: SortOption[] = [
  { value: 'date_desc', label: 'Data (mais recente)' },
  { value: 'date_asc', label: 'Data (mais antiga)' },
  { value: 'amount_desc', label: 'Valor (maior primeiro)' },
  { value: 'amount_asc', label: 'Valor (menor primeiro)' },
];

export function Despesas() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<AdvancedFilters>({ ...DEFAULT_ADVANCED_FILTERS });
  const [sortBy, setSortBy] = useState<string>('date_desc');
  const [showModal, setShowModal] = useState(false);
  const [editingDespesa, setEditingDespesa] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const { createAdvancedTransaction } = useAdvancedTransactions();
  const [isAdvancedModalOpen, setIsAdvancedModalOpen] = useState(false);

  const {
    data: despesas = [],
    isLoading,
    createDespesa,
    updateDespesa,
    deleteDespesa,
    markAsPaid,
    summary,
    installmentsThisMonth,
    fixedExpensesThisMonth,
  } = useDespesas(filters);

  const handleGoToInvoice = (cardId: string, date: string) => {
    const period = date.substring(0, 7); // YYYY-MM
    navigate(`/invoice?cardId=${cardId}&period=${period}`);
  };

  const activeFilterCount = countActiveFilters(filters);

  const sortedDespesas = [...despesas].sort((a, b) => {
    switch (sortBy) {
      case 'date_desc':
        return new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime();
      case 'date_asc':
        return new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime();
      case 'amount_desc':
        return Number(b.amount) - Number(a.amount);
      case 'amount_asc':
        return Number(a.amount) - Number(b.amount);
      default:
        return 0;
    }
  });

  const handleApplyFilters = (newFilters: AdvancedFilters) => {
    setFilters(newFilters);
  };

  const handleApplySort = (newSort: string) => {
    setSortBy(newSort);
  };

  const handleCreateDespesa = () => {
    setEditingDespesa(null);
    setShowModal(false); // garante que não abre o modal antigo
    setIsAdvancedModalOpen(true); // abre o modal avançado já em Despesa
  };

  const handleEditDespesa = (despesa: any) => {
    setEditingDespesa(despesa);
    setShowModal(true);
  };

  const handleDeleteDespesa = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta despesa?')) {
      await deleteDespesa.mutateAsync(id);
    }
  };

  const handleMarkAsPaid = async (id: string) => {
    try {
      await markAsPaid.mutateAsync(id);
    } catch (error) {
      console.error('Error marking despesa as paid:', error);
    }
  };

  function getTypeIcon(type: string) {
    switch (type) {
      case 'income':
        return <TrendingUp className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400" />;
      case 'expense':
      default:
        return <TrendingDown className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400" />;
    }
  }

  function getTypeLabel(type: string) {
    switch (type) {
      case 'income':
        return 'Receita';
      case 'expense':
        return 'Despesa';
      default:
        return type;
    }
  }

  function getStatusLabelDashboardLike(status: string) {
    switch (status) {
      case 'paid':
        return 'Pago';
      case 'pending':
        return 'Pendente';
      case 'open':
        return 'Aberta';
      case 'overdue':
        return 'Vencida';
      case 'scheduled':
        return 'Agendada';
      case 'canceled':
        return 'Cancelada';
      default:
        return status;
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'text-green-600 bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-400';
      case 'open':
        return 'text-blue-600 bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400';
      case 'overdue':
        return 'text-red-600 bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400';
      case 'scheduled':
        return 'text-purple-600 bg-purple-50 border border-purple-200 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-400';
      case 'canceled':
        return 'text-text-secondary bg-bg-surface border border-border';
      default:
        return 'text-text-secondary bg-bg-surface';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Paga';
      case 'pending':
        return 'Pendente';
      case 'open':
        return 'Aberta';
      case 'overdue':
        return 'Vencida';
      case 'scheduled':
        return 'Agendada';
      case 'canceled':
        return 'Cancelada';
      default:
        return status;
    }
  };

  const statusConfig: Record<
    string,
    {
      label: string;
      Icon: any;
      cardBg: string;
      titleColor: string;
      valueColor: string;
      border: string;
    }
  > = {
    paid: { label: 'Pagas', Icon: CheckCircle, cardBg: 'bg-green-50 dark:bg-green-900/20', titleColor: 'text-text-secondary', valueColor: 'text-green-600 dark:text-green-400', border: 'border-green-200 dark:border-green-800' },
    pending: { label: 'Pendentes', Icon: Clock, cardBg: 'bg-yellow-50 dark:bg-yellow-900/20', titleColor: 'text-text-secondary', valueColor: 'text-yellow-600 dark:text-yellow-400', border: 'border-yellow-200 dark:border-yellow-800' },
    open: { label: 'Abertas', Icon: Circle, cardBg: 'bg-blue-50 dark:bg-blue-900/20', titleColor: 'text-text-secondary', valueColor: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
    overdue: { label: 'Vencidas', Icon: AlertCircle, cardBg: 'bg-red-50 dark:bg-red-900/20', titleColor: 'text-text-secondary', valueColor: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-800' },
    scheduled: { label: 'Agendadas', Icon: Calendar, cardBg: 'bg-purple-50 dark:bg-purple-900/20', titleColor: 'text-text-secondary', valueColor: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' },
    canceled: { label: 'Canceladas', Icon: XCircle, cardBg: 'bg-bg-surface', titleColor: 'text-text-secondary', valueColor: 'text-text-secondary', border: 'border-border' },
  };

  const byStatus: Record<string, { count: number; total: number }> = (fixedExpensesThisMonth ?? []).reduce(
    (acc: Record<string, { count: number; total: number }>, e: any) => {
      const s = e.status ?? 'pending';
      const v = Number(e.amount) || 0;
      if (!acc[s]) acc[s] = { count: 0, total: 0 };
      acc[s].count += 1;
      acc[s].total += v;
      return acc;
    },
    {}
  );

  function getStatusIcon(status: string) {
    switch (status) {
      case 'paid':
        return <CheckCircle className="p-1.5 rounded-lg bg-green-600 text-green-50" />;
      case 'pending':
        return <Clock className="p-1.5 rounded-lg bg-yellow-500 text-yellow-50" />;
      case 'open':
        return <Circle className="p-1.5 rounded-lg bg-blue-500 text-blue-50" />;
      case 'overdue':
        return <AlertCircle className="p-1.5 rounded-lg bg-red-600 text-red-50" />;
      case 'scheduled':
        return <Calendar className="p-1.5 rounded-lg bg-purple-500 text-purple-50" />;
      case 'canceled':
        return <XCircle className="p-1.5 rounded-lg bg-bg-elevated text-text-muted" />;
      default:
        return null;
    }
  }

  return (
    <>
      <div className="space-y-4 sm:space-y-6 w-full min-w-0">
        <div className="flex items-center justify-between px-1 sm:px-0">
          <BreadcrumbBar segments={['Gerenciadores', 'Despesas']} onBack={() => navigate('/dashboard')} />
          <div className="relative">
            <VisualizationToolbar
              onFilter={() => setShowFilters(true)}
              onSort={() => setShowSort((prev) => !prev)}
              onShare={() => {}}
              onSettings={() => {}}
              activeFilterCount={activeFilterCount}
            />
            <SortPanel
              isOpen={showSort}
              onClose={() => setShowSort(false)}
              options={sortOptions}
              currentSort={sortBy}
              onApply={handleApplySort}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 px-1 sm:px-0">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="p-1.5 sm:p-2 bg-red-100 dark:bg-red-900/20 rounded-lg flex-shrink-0">
              <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Despesas</h1>
              <p className="text-sm sm:text-base text-text-secondary">Controle seus gastos e despesas</p>
            </div>
          </div>
          <Button onClick={handleCreateDespesa} size="sm">
            <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            Nova Despesa
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 px-1 sm:px-0">
          <Card>
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-text-secondary">Total Pago</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600 mt-1">{formatCurrency(summary?.totalPaid || 0)}</p>
                </div>
                <div className="p-2 sm:p-3 bg-red-100 dark:bg-red-900/20 rounded-lg flex-shrink-0">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-text-secondary">Total Pendente</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-yellow-600 mt-1">{formatCurrency(summary?.totalPending || 0)}</p>
                </div>
                <div className="p-2 sm:p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex-shrink-0">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-text-secondary">Total Parcelado</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-600 mt-1">{formatCurrency(summary?.totalInstallments || 0)}</p>
                </div>
                <div className="p-2 sm:p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex-shrink-0">
                  <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-text-secondary">Média Mensal</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600 mt-1">{formatCurrency(summary?.monthlyAverage || 0)}</p>
                </div>
                <div className="p-2 sm:p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex-shrink-0">
                  <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Despesas Fixas */}
        <div className="px-1 sm:px-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <RefreshCcw className="w-5 h-5 mr-2" />
                Despesas Fixas
              </CardTitle>
            </CardHeader>

            <CardContent className="py-0 px-1 sm:px-6">
              <div className="overflow-x-auto scrollbar-hide" style={{ scrollBehavior: 'smooth' }}>
                <div className="flex space-x-4 p-4 sm:p-6" style={{ width: 'max-content', scrollSnapType: 'x mandatory', paddingLeft: '0', paddingRight: '0' }}>
                  {fixedExpensesThisMonth?.map((expense: any) => (
                    <div key={expense.id} className="flex-shrink-0 w-64 p-4 rounded-lg border-2 border-border bg-bg-page hover:border-border transition-all" style={{ scrollSnapAlign: 'start' }}>
                      <div className="space-y-3">
                        <div>
                          <h3 className="font-semibold text-text-primary truncate">{expense.title}</h3>
                          <p className="text-xs text-text-muted">Despesa Fixa</p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-text-secondary">Vencimento:</span>
                            <span className="font-medium text-text-primary">{formatDate(expense.transaction_date)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-text-secondary">Valor:</span>
                            <span className="font-medium text-red-600">{formatCurrency(Number(expense.amount))}</span>
                          </div>
                          {expense.category && (
                            <div className="flex justify-between text-sm">
                              <span className="text-text-secondary">Categoria:</span>
                              <span className="font-medium text-text-primary truncate">{expense.category}</span>
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t border-border">
                          <div className="flex justify-between items-center mb-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(expense.status)}`}>{getStatusLabel(expense.status)}</span>
                          </div>

                          <div className="flex space-x-1">
                            {expense.status === 'pending' && (
                              <button
                                onClick={() => handleMarkAsPaid(expense.id)}
                                className="flex-1 p-1 text-xs text-green-600 hover:bg-green-50 rounded transition-colors"
                                title="Marcar como paga"
                              >
                                <CheckCircle className="w-3 h-3 mx-auto" />
                              </button>
                            )}
                            <button
                              onClick={() => handleEditDespesa(expense)}
                              className="flex-1 p-1 text-xs text-text-secondary hover:bg-bg-elevated rounded transition-colors"
                              title="Editar"
                            >
                              <Edit className="w-3 h-3 mx-auto" />
                            </button>
                            <button
                              onClick={() => handleDeleteDespesa(expense.id)}
                              className="flex-1 p-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-3 h-3 mx-auto" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {(!fixedExpensesThisMonth || fixedExpensesThisMonth.length === 0) && (
                    <div className="flex-shrink-0 w-64 p-8 text-center text-text-muted">
                      <RefreshCcw className="w-12 h-12 text-text-muted mx-auto mb-3" />
                      <p className="text-sm">Nenhuma despesa fixa neste período</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>

            <CardContent className="p-4 pt-0 sm:px-6 sm:pt-0">
              <div className="overflow-x-auto -mx-4 px-4 sm:overflow-visible sm:mx-0 sm:px-0 scrollbar-hide" style={{ scrollBehavior: 'smooth' }}>
                <div className="flex gap-3 w-max snap-x snap-mandatory sm:grid sm:w-auto sm:snap-none sm:gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7">
                  <div className="min-w-[240px] sm:min-w-0 snap-start p-3 rounded-lg border border-border bg-bg-surface text-left">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="p-1.5 rounded-lg bg-bg-elevated text-text-muted">
                        <RefreshCcw className="w-3 h-3" />
                      </span>
                      <p className="text-xs text-text-muted">Total</p>
                    </div>
                    <p className="text-sm font-medium text-text-secondary">
                      {fixedExpensesThisMonth?.length || 0} {(fixedExpensesThisMonth?.length || 0) === 1 ? 'despesa' : 'despesas'}
                    </p>
                    <p className="text-lg font-semibold text-text-primary">
                      {formatCurrency(fixedExpensesThisMonth?.reduce((acc: number, e: any) => acc + Number(e.amount), 0) || 0)}
                    </p>
                  </div>

                  {Object.entries(statusConfig).map(([key, cfg]) => {
                    const stats = byStatus[key] ?? { count: 0, total: 0 };
                    const Icon = cfg.Icon;
                    return (
                      <div key={key} className={`min-w-[240px] sm:min-w-0 snap-start p-3 rounded-lg border ${cfg.border} ${cfg.cardBg} text-left`}>
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className="w-3 h-3" />
                          <p className={`text-xs ${cfg.titleColor}`}>{cfg.label}</p>
                        </div>
                        <p className="text-lg font-semibold text-text-primary">{formatCurrency(stats.total || 0)}</p>
                        <p className={`text-sm font-medium ${cfg.valueColor}`}>
                          {stats.count} {stats.count === 1 ? 'despesa' : 'despesas'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Parcelas */}
        <div className="px-1 sm:px-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="w-5 h-5 mr-2" />
                Parcelas
              </CardTitle>
            </CardHeader>

            <CardContent className="py-0 px-1 sm:px-6">
              <div className="overflow-x-auto scrollbar-hide" style={{ scrollBehavior: 'smooth' }}>
                <div className="flex space-x-4 p-4 sm:p-6" style={{ width: 'max-content', scrollSnapType: 'x mandatory', paddingLeft: '0', paddingRight: '0' }}>
                  {installmentsThisMonth?.map((installment: any) => (
                    <div key={installment.id} className="flex-shrink-0 w-64 p-4 rounded-lg border-2 border-border bg-bg-page hover:border-border transition-all" style={{ scrollSnapAlign: 'start' }}>
                      <div className="space-y-3">
                        <div>
                          <h3 className="font-semibold text-text-primary truncate">{installment.title}</h3>
                          <p className="text-xs text-text-muted">
                            Parcela {installment.installment_number}/{installment.installment_total}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-text-secondary">Vencimento:</span>
                            <span className="font-medium text-text-primary">{formatDate(installment.transaction_date)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-text-secondary">Valor parcela:</span>
                            <span className="font-medium text-red-600">{formatCurrency(Number(installment.amount))}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-text-secondary">Total compra:</span>
                            <span className="font-medium text-text-primary">{formatCurrency(Number(installment.amount) * installment.installment_total)}</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-border">
                          <div className="flex justify-between items-center mb-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(installment.status)}`}>{getStatusLabel(installment.status)}</span>
                          </div>

                          <div className="flex space-x-1">
                            {installment.status === 'pending' && (
                              <button
                                onClick={() => handleMarkAsPaid(installment.id)}
                                className="flex-1 p-1 text-xs text-green-600 hover:bg-green-50 rounded transition-colors"
                                title="Marcar como paga"
                              >
                                <CheckCircle className="w-3 h-3 mx-auto" />
                              </button>
                            )}
                            <button
                              onClick={() => handleEditDespesa(installment)}
                              className="flex-1 p-1 text-xs text-text-secondary hover:bg-bg-elevated rounded transition-colors"
                              title="Editar"
                            >
                              <Edit className="w-3 h-3 mx-auto" />
                            </button>
                            <button
                              onClick={() => handleDeleteDespesa(installment.id)}
                              className="flex-1 p-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-3 h-3 mx-auto" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {(!installmentsThisMonth || installmentsThisMonth.length === 0) && (
                    <div className="flex-shrink-0 w-64 p-8 text-center text-text-muted">
                      <CreditCard className="w-12 h-12 text-text-muted mx-auto mb-3" />
                      <p className="text-sm">Nenhuma parcela neste período</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardContent className="p-4 pt-0 sm:px-6 sm:pt-0">
              {(() => {
                // ---- Aggregates ----
                const totalCount =
                  installmentsThisMonth?.length || 0;

                const totalValue =
                  installmentsThisMonth?.reduce((acc, i) => acc + Number(i.amount || 0), 0) || 0;

                const byStatus: Record<string, { count: number; total: number }> =
                  (installmentsThisMonth ?? []).reduce((acc, i: any) => {
                    const s = i.status ?? "pending";
                    const v = Number(i.amount) || 0;
                    if (!acc[s]) acc[s] = { count: 0, total: 0 };
                    acc[s].count += 1;
                    acc[s].total += v;
                    return acc;
                  }, {} as Record<string, { count: number; total: number }>);

                // ---- Visual config (independente do outro sumário) ----
                const statusConfig: Record<
                  string,
                  {
                    label: string;
                    cardBg: string;
                    titleColor: string;
                    valueColor: string;
                    border: string;
                    Icon: React.ComponentType<any>;
                  }
                > = {
                  paid:      { label: "Pagas",     cardBg: "bg-green-50 dark:bg-green-900/20",  titleColor: "text-text-secondary", valueColor: "text-green-700 dark:text-green-400",  border: "border-green-200 dark:border-green-800",  Icon: CheckCircle },
                  pending:   { label: "Pendentes", cardBg: "bg-yellow-50 dark:bg-yellow-900/20", titleColor: "text-text-secondary", valueColor: "text-yellow-700 dark:text-yellow-400", border: "border-yellow-200 dark:border-yellow-800", Icon: Clock },
                  open:      { label: "Abertas",   cardBg: "bg-blue-50 dark:bg-blue-900/20",   titleColor: "text-text-secondary", valueColor: "text-blue-700 dark:text-blue-400",   border: "border-blue-200 dark:border-blue-800",   Icon: Circle },
                  overdue:   { label: "Vencidas",  cardBg: "bg-red-50 dark:bg-red-900/20",    titleColor: "text-text-secondary", valueColor: "text-red-700 dark:text-red-400",    border: "border-red-200 dark:border-red-800",    Icon: AlertCircle },
                  scheduled: { label: "Agendadas", cardBg: "bg-purple-50 dark:bg-purple-900/20", titleColor: "text-text-secondary", valueColor: "text-purple-700 dark:text-purple-400", border: "border-purple-200 dark:border-purple-800", Icon: Calendar },
                  canceled:  { label: "Canceladas",cardBg: "bg-bg-surface",   titleColor: "text-text-secondary", valueColor: "text-text-secondary",   border: "border-border",   Icon: XCircle },
                };

                return (
                  <div
                    className="
                      overflow-x-auto -mx-4 px-4
                      sm:overflow-visible sm:mx-0 sm:px-0
                      scrollbar-hide
                    "
                    style={{ scrollBehavior: "smooth" }}
                  >
                    <div
                      className="
                        flex gap-3 w-max snap-x snap-mandatory
                        sm:grid sm:w-auto sm:snap-none sm:gap-4
                        sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7
                      "
                    >
                      {/* TOTAL */}
                      <div className="min-w-[240px] sm:min-w-0 snap-start p-3 rounded-lg border border-border bg-bg-surface text-left">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="p-1.5 rounded-lg bg-bg-elevated text-text-muted">
                            <CreditCard className="w-3 h-3" />
                          </span>
                          <p className="text-xs text-text-muted">Total</p>
                        </div>
                        <p className="text-sm font-medium text-text-secondary">
                          {totalCount} {totalCount === 1 ? "despesa" : "despesas"}
                        </p>
                        <p className="text-lg font-semibold text-text-primary">
                          {formatCurrency(totalValue)}
                        </p>
                      </div>

                      {/* POR STATUS */}
                      {Object.entries(statusConfig).map(([key, cfg]) => {
                        const stats = byStatus[key] ?? { count: 0, total: 0 };
                        const Icon = cfg.Icon;
                        return (
                          <div
                            key={key}
                            className={`min-w-[240px] sm:min-w-0 snap-start p-3 rounded-lg border ${cfg.border} ${cfg.cardBg} text-left`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <Icon className="w-3 h-3" />
                              <p className={`text-xs ${cfg.titleColor}`}>{cfg.label}</p>
                            </div>

                            {/* Valor das parcelas desse status no mês */}
                            <p className="text-lg font-semibold text-text-primary">
                              {formatCurrency(stats.total || 0)}
                            </p>

                            {/* Quantidade de parcelas nesse status */}
                            <p className={`text-sm font-medium ${cfg.valueColor}`}>
                              {stats.count} {stats.count === 1 ? "despesa" : "despesas"}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>

        {/* Lançamentos - Dashboard-like columns */}
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
                    <table className="w-full min-w-[980px]">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="sticky top-0 z-10 bg-bg-page shadow-sm text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-text-secondary w-[60px]">
                            Tipo
                          </th>
                          <th className="sticky top-0 z-10 bg-bg-page shadow-sm text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-text-secondary w-[70px]">
                            Status
                          </th>
                          <th className="sticky top-0 z-10 bg-bg-page shadow-sm text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-text-secondary min-w-[160px]">
                            Título
                          </th>
                          <th className="sticky top-0 z-10 bg-bg-page shadow-sm text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-text-secondary min-w-[110px]">
                            Data
                          </th>
                          <th className="sticky top-0 z-10 bg-bg-page shadow-sm text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-text-secondary min-w-[120px]">
                            Valor
                          </th>
                          <th className="sticky top-0 z-10 bg-bg-page shadow-sm text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-text-secondary min-w-[160px]">
                            Conta Bancária
                          </th>
                          <th className="sticky top-0 z-10 bg-bg-page shadow-sm text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-text-secondary min-w-[130px]">
                            C. Crédito
                          </th>
                          <th className="sticky top-0 z-10 bg-bg-page shadow-sm text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-text-secondary min-w-[110px]">
                            Categoria
                          </th>
                          <th className="sticky top-0 z-10 bg-bg-page shadow-sm text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-text-secondary min-w-[130px]">
                            C. Custo
                          </th>
                          <th className="sticky top-0 z-10 bg-bg-page shadow-sm text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-text-secondary min-w-[80px]">
                            Ações
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {sortedDespesas.map((despesa: any) => {
                          const type = 'expense';
                          const status = despesa.status || 'pending';

                          const bankName = despesa.bank_name ?? despesa.transaction_account ?? despesa.bank ?? null;
                          const bankColor = despesa.bank_color ?? despesa.transaction_account_color ?? null;
                          const bankIcon = despesa.bank_icon ?? despesa.transaction_account_icon ?? null;

                          return (
                            <tr
                              key={despesa.id}
                              className="border-b border-border hover:bg-bg-elevated cursor-pointer"
                              onClick={() => handleEditDespesa(despesa)}
                            >
                              <td className="py-2 sm:py-3 px-2 sm:px-4 text-center">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-bg-surface" title={getTypeLabel(type)}>
                                  {getTypeIcon(type)}
                                </span>
                              </td>

                              <td className="py-2 sm:py-3 px-2 sm:px-4 text-center">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-bg-surface" title={getStatusLabelDashboardLike(status)}>
                                  {getStatusIcon(status)}
                                </span>
                              </td>

                              <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-text-primary">
                                <div className="flex items-center gap-1.5">
                                  <span className="truncate block max-w-[140px] sm:max-w-none">{despesa.title}</span>
                                  {despesa.transaction_card_id && (
                                    <Lucide.CreditCard className="w-3 h-3 text-purple-500 shrink-0" title="Despesa no Cartão" />
                                  )}
                                </div>
                                {despesa.subtitle ? (
                                  <span className="text-[11px] text-text-muted truncate block max-w-[140px] sm:max-w-none">{despesa.subtitle}</span>
                                ) : null}
                              </td>

                              <td className="py-2 sm:py-3 px-2 sm:px-4 text-center text-xs sm:text-sm text-text-secondary">
                                {formatDate(despesa.transaction_date)}
                              </td>

                              <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-right font-medium text-text-primary">
                                {formatCurrency(Number(despesa.amount))}
                              </td>

                              <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-text-primary">
                                {bankName ? (
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center justify-center text-white p-1.5 rounded-lg" style={{ backgroundColor: bankColor || 'unset' }}>
                                      {(() => {
                                        const iconKey = (bankIcon || '') as keyof typeof Lucide;
                                        const DynamicIcon = Lucide[iconKey] as React.ComponentType<{ className?: string }>;
                                        return DynamicIcon ? <DynamicIcon className="w-3 h-3" /> : null;
                                      })()}
                                    </div>
                                    <span className="truncate block max-w-[140px] sm:max-w-none">{bankName}</span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-text-muted">-</span>
                                )}
                              </td>

                              <td className="py-2 sm:py-3 px-2 sm:px-4">
                                {despesa.card_name ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleGoToInvoice(despesa.transaction_card_id, despesa.transaction_date);
                                    }}
                                    className="inline-flex items-center px-2 py-1 rounded-full gap-1.5 hover:opacity-80 transition-opacity cursor-pointer shadow-sm group"
                                    style={{ backgroundColor: despesa.card_color || '#E5E7EB' }}
                                    title="Ver na Fatura"
                                  >
                                    {(() => {
                                      const iconKey = (despesa.card_icon || '') as keyof typeof Lucide;
                                      const DynamicIcon = Lucide[iconKey] as React.ComponentType<{ className?: string }>;
                                      return DynamicIcon ? <DynamicIcon className="w-3 h-3" style={{ color: 'white' }} /> : null;
                                    })()}
                                    <span className="text-xs font-medium text-white truncate">{despesa.card_name}</span>
                                    <Lucide.ExternalLink className="w-2.5 h-2.5 text-white/70 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </button>
                                ) : (
                                  <span className="text-xs text-text-muted">-</span>
                                )}
                              </td>

                              <td className="py-2 sm:py-3 px-2 sm:px-4">
                                {despesa.category_name ? (
                                  <div className="inline-flex items-center px-2 py-1 rounded-full gap-1.5" style={{ backgroundColor: despesa.category_color || '#E5E7EB' }}>
                                    {(() => {
                                      const iconKey = (despesa.category_icon || '') as keyof typeof Lucide;
                                      const DynamicIcon = Lucide[iconKey] as React.ComponentType<{ className?: string }>;
                                      return DynamicIcon ? <DynamicIcon className="w-3 h-3" style={{ color: 'white' }} /> : null;
                                    })()}
                                    <span className="text-xs font-medium text-white truncate">{despesa.category_name}</span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-text-muted">-</span>
                                )}
                              </td>

                              <td className="py-2 sm:py-3 px-2 sm:px-4">
                                {despesa.cost_center_name ? (
                                  <div className="inline-flex items-center px-2 py-1 rounded-full gap-1.5" style={{ backgroundColor: despesa.cost_center_color || '#E5E7EB' }}>
                                    {(() => {
                                      const iconKey = (despesa.cost_center_icon || '') as keyof typeof Lucide;
                                      const DynamicIcon = Lucide[iconKey] as React.ComponentType<{ className?: string }>;
                                      return DynamicIcon ? <DynamicIcon className="w-3 h-3" style={{ color: 'white' }} /> : null;
                                    })()}
                                    <span className="text-xs font-medium text-white truncate">{despesa.cost_center_name}</span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-text-muted">-</span>
                                )}
                              </td>

                              <td className="py-2 sm:py-3 px-2 sm:px-4">
                                <div className="flex justify-center space-x-1 sm:space-x-2">
                                  {status === 'pending' && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMarkAsPaid(despesa.id);
                                      }}
                                      className="p-0.5 sm:p-1 text-text-muted hover:text-green-600 transition-colors"
                                      title="Marcar como paga"
                                    >
                                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                                    </button>
                                  )}

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditDespesa(despesa);
                                    }}
                                    className="p-0.5 sm:p-1 text-text-muted hover:text-text-secondary transition-colors"
                                    title="Editar"
                                  >
                                    <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                                  </button>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteDespesa(despesa.id);
                                    }}
                                    className="p-0.5 sm:p-1 text-text-muted hover:text-red-600 transition-colors"
                                    title="Excluir"
                                  >
                                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {sortedDespesas.length === 0 && (
                    <div className="text-center py-6 sm:py-8 text-text-muted px-4">
                      <TrendingDown className="w-8 h-8 sm:w-12 sm:h-12 text-text-muted mx-auto mb-3 sm:mb-4" />
                      <p className="text-base sm:text-lg font-medium">Nenhuma despesa encontrada</p>
                      <p className="text-xs sm:text-sm">Comece criando sua primeira despesa</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
            <CardContent className="py-0 px-1 sm:px-6">
              {/* Sumário compacto da Tabela (mobile-first, diferente dos containers) */}
              {(() => {
                const totalCount = despesas?.length || 0;
                const totalValue =
                  despesas?.reduce((acc, d) => acc + Number(d.amount || 0), 0) || 0;

                const byStatus: Record<string, { count: number; total: number }> =
                  (despesas ?? []).reduce((acc, d: any) => {
                    const s = d.status ?? "pending";
                    const v = Number(d.amount) || 0;
                    if (!acc[s]) acc[s] = { count: 0, total: 0 };
                    acc[s].count += 1;
                    acc[s].total += v;
                    return acc;
                  }, {} as Record<string, { count: number; total: number }>);

                const chipConfig: Record<
                  string,
                  { label: string; border: string; text: string; bg: string }
                > = {
                  __total:   { label: "Total",     border: "border-border",  text: "text-text-primary",  bg: "bg-bg-surface" },
                  paid:      { label: "Pagas",     border: "border-green-300 dark:border-green-800", text: "text-green-700 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/20" },
                  pending:   { label: "Pendentes", border: "border-yellow-300 dark:border-yellow-800",text: "text-yellow-700 dark:text-yellow-400",bg: "bg-yellow-50 dark:bg-yellow-900/20" },
                  open:      { label: "Abertas",   border: "border-blue-300 dark:border-blue-800",  text: "text-blue-700 dark:text-blue-400",  bg: "bg-blue-50 dark:bg-blue-900/20" },
                  overdue:   { label: "Vencidas",  border: "border-red-300 dark:border-red-800",   text: "text-red-700 dark:text-red-400",   bg: "bg-red-50 dark:bg-red-900/20" },
                  scheduled: { label: "Agendadas", border: "border-purple-300 dark:border-purple-800",text: "text-purple-700 dark:text-purple-400",bg: "bg-purple-50 dark:bg-purple-900/20" },
                  canceled:  { label: "Canceladas",border: "border-border",  text: "text-text-secondary",  bg: "bg-bg-surface" },
                };

                const order = ["__total", "paid", "pending", "open", "overdue", "scheduled", "canceled"];

                return (
                  <div
                    className="
                      pt-3
                      mb-3 sm:mb-4
                      overflow-x-auto -mx-1 px-1
                      sm:overflow-visible sm:mx-0 sm:px-0
                      scrollbar-hide
                    "
                    style={{ scrollBehavior: "smooth" }}
                  >
                    <div
                      className="
                        flex gap-2 w-max snap-x snap-mandatory
                        sm:grid sm:w-auto sm:snap-none sm:gap-3
                        sm:auto-cols-fr sm:grid-flow-col
                      "
                    >
                      {/* Card TOTAL */}
                      <div
                        className={`
                          min-w-[180px] sm:min-w-0 snap-start
                          rounded-lg border ${chipConfig.__total.border} ${chipConfig.__total.bg}
                          px-3 py-2 flex items-center justify-between
                        `}
                      >
                        <span className="text-xs font-medium text-text-secondary">Total</span>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-text-primary">
                            {formatCurrency(totalValue)}
                          </p>
                          <p className="text-[10px] text-text-muted">
                            {totalCount} {totalCount === 1 ? "lançamento" : "lançamentos"}
                          </p>
                        </div>
                      </div>

                      {/* Cards por STATUS */}
                      {order.slice(1).map((key) => {
                        const cfg = chipConfig[key];
                        const stats = byStatus[key] ?? { count: 0, total: 0 };
                        return (
                          <div
                            key={key}
                            className={`
                              min-w-[180px] sm:min-w-0 snap-start
                              rounded-lg border ${cfg.border} ${cfg.bg}
                              px-3 py-2 flex items-center justify-between
                            `}
                          >
                            <span className="text-xs font-medium text-text-secondary">{cfg.label}</span>
                            <div className="text-right">
                              <p className={`text-sm font-semibold ${cfg.text}`}>
                                {formatCurrency(stats.total || 0)}
                              </p>
                              <p className="text-[10px] text-text-muted">
                                {stats.count} {stats.count === 1 ? "lançamento" : "lançamentos"}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      </div>

      <DespesaModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        despesa={editingDespesa}
        onSave={async (data) => {
          if (editingDespesa) {
            await updateDespesa.mutateAsync({ id: editingDespesa.id, updates: data });
          } else {
            await createDespesa.mutateAsync(data);
          }
          setShowModal(false);
        }}
      />
      
      <AdvancedTransactionModal
        isOpen={isAdvancedModalOpen}
        onClose={() => setIsAdvancedModalOpen(false)}
        transactionType="expense"
        onSave={async (data: AdvancedTransactionData) => {
          await createAdvancedTransaction.mutateAsync({
            transactionType: 'expense',
            data,
          });
          setIsAdvancedModalOpen(false);
        }}
      />
      <AdvancedFilterModal
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        mode="expense"
        appliedFilters={filters}
        onApply={handleApplyFilters}
      />
    </>
  );
}

// Modal Component
interface DespesaModalProps {
  isOpen: boolean;
  onClose: () => void;
  despesa?: any;
  onSave: (data: any) => Promise<void>;
}

function DespesaModal({ isOpen, onClose, despesa, onSave }: DespesaModalProps) {
  const [formData, setFormData] = useState<DespesaFormData>({
    title: '',
    subtitle: '',
    amount: 0,
    transaction_date: new Date().toISOString().split('T')[0],
    status: 'pending',
    repeat_type: 'avulsa',
    repeat_interval: 'monthly',
    is_installment: false,
    installment_total: 1,
    category_id: '',
    cost_center_id: '',
    bank_id: '',
    notes: '',
  });

  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    if (despesa) {
      setFormData({
        title: despesa.title || '',
        subtitle: despesa.subtitle || '',
        amount: Number(despesa.amount) || 0,
        transaction_date: despesa.transaction_date || new Date().toISOString().split('T')[0],
        status: despesa.status || 'pending',
        repeat_type: despesa.repeat_type || 'avulsa',
        repeat_interval: despesa.repeat_interval || 'monthly',
        is_installment: despesa.is_installment || false,
        installment_total: despesa.installment_total || 1,
        category_id: despesa.category_id || '',
        cost_center_id: despesa.cost_center_id || '',
        bank_id: despesa.bank_id || '',
        notes: despesa.notes || '',
      });
    } else {
      setFormData({
        title: '',
        subtitle: '',
        amount: 0,
        transaction_date: new Date().toISOString().split('T')[0],
        status: 'pending',
        repeat_type: 'avulsa',
        repeat_interval: 'monthly',
        is_installment: false,
        installment_total: 1,
        category_id: '',
        cost_center_id: '',
        bank_id: '',
        notes: '',
      });
    }
  }, [despesa]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const despesaData: DespesaData = {
        title: formData.title,
        subtitle: formData.subtitle,
        amount: formData.amount,
        transaction_date: formData.transaction_date,
        status: formData.status,
        repeat_type: formData.repeat_type,
        repeat_interval: formData.repeat_interval,
        is_installment: formData.is_installment,
        installment_total: formData.installment_total,
        category_id: formData.category_id || null,
        cost_center_id: formData.cost_center_id || null,
        bank_id: formData.bank_id || null,
        notes: formData.notes,
      };
      await onSave(despesaData);
    } catch (error) {
      console.error('Error saving despesa:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof DespesaFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={despesa ? 'Editar Despesa' : 'Nova Despesa'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input
              label="Título"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Ex: Conta de luz, Supermercado..."
              required
            />
          </div>

          <Input
            label="Microtítulo (opcional)"
            value={formData.subtitle}
            onChange={(e) => handleInputChange('subtitle', e.target.value)}
            placeholder="Ex: Parcela 1/3, Janeiro 2024..."
          />

          <Input
            label="Valor"
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) => handleInputChange('amount', Number(e.target.value))}
            required
          />

          <Input
            label="Data de vencimento"
            type="date"
            value={formData.transaction_date}
            onChange={(e) => handleInputChange('transaction_date', e.target.value)}
            required
          />

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Tipo de despesa</label>
            <Dropdown options={repeatTypeOptions} value={formData.repeat_type} onChange={(value) => handleInputChange('repeat_type', value)} />
          </div>

          {formData.repeat_type === 'recorrente' && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Intervalo de recorrência</label>
              <Dropdown options={repeatIntervalOptions} value={formData.repeat_interval} onChange={(value) => handleInputChange('repeat_interval', value)} />
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.status === 'paid'}
              onChange={(e) => handleInputChange('status', e.target.checked ? 'paid' : 'pending')}
              className="mr-2"
            />
            <span className="text-sm text-text-secondary">Já foi paga?</span>
          </label>

          <label className="flex items-center">
            <input type="checkbox" checked={formData.is_installment} onChange={(e) => handleInputChange('is_installment', e.target.checked)} className="mr-2" />
            <span className="text-sm text-text-secondary">Parcelada?</span>
          </label>
        </div>

        {formData.is_installment && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Número de parcelas"
              type="number"
              min="1"
              value={formData.installment_total}
              onChange={(e) => handleInputChange('installment_total', Number(e.target.value))}
              required
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Observações</label>
          <textarea
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Observações adicionais..."
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-transparent"
            rows={3}
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={isLoading}>
            {despesa ? 'Atualizar' : 'Criar'} Despesa
          </Button>
        </div>
      </form>
    </Modal>
  );
}