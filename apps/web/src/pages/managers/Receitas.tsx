import React, { useState } from 'react';
import * as Lucide from 'lucide-react';
import {
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
  TrendingDown,
  AlertTriangle,
  Landmark,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Dropdown } from '../../components/ui/Dropdown';
import { Modal } from '../../components/ui/Modal';
import { BreadcrumbBar } from '../../components/ui/BreadcrumbBar';
import { VisualizationToolbar } from '../../components/ui/VisualizationToolbar';
import { FiltersPanel } from '../../components/ui/FiltersPanel';
import { SortPanel } from '../../components/ui/SortPanel';
import type { FilterField } from '../../components/ui/FiltersPanel';
import type { SortOption } from '../../components/ui/SortPanel';
import { useReceitas } from '../../hooks/useReceitas';
import { formatCurrency, formatDate } from '../../lib/utils';
import type { ReceitaData } from '../../services/receita.service';
import { AdvancedTransactionModal } from '../../components/transactions/AdvancedTransactionModal';
import { useAdvancedTransactions } from '../../hooks/useAdvancedTransactions';
import type { AdvancedTransactionData } from '../../types';

interface ReceitaFilters {
  status: string;
  type: string;
  installments: string;
  period: string;
  category: string;
  search: string;
  date_start?: string;
  date_end?: string;
}

interface ReceitaFormData {
  title: string;
  subtitle: string;
  amount: number;
  transaction_date: string;
  status: 'pending' | 'received' | 'open' | 'overdue' | 'scheduled' | 'canceled';
  repeat_type: 'avulsa' | 'fixa' | 'recorrente';
  repeat_interval: string;
  is_installment: boolean;
  installment_total: number;
  category_id: string;
  notes: string;
}

const DEFAULT_FILTERS: ReceitaFilters = {
  status: 'all',
  type: 'all',
  installments: 'all',
  period: 'current_month',
  category: 'all',
  search: '',
};

const statusOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'A receber' },
  { value: 'received', label: 'Recebidas' },
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
  { value: 'current_month', label: 'Mes atual' },
  { value: 'last_month', label: 'Ultimo mes' },
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

const filterFields: FilterField[] = [
  { key: 'status', label: 'Status', type: 'dropdown', options: statusOptions },
  { key: 'type', label: 'Tipo', type: 'dropdown', options: typeOptions },
  { key: 'installments', label: 'Parceladas', type: 'dropdown', options: installmentOptions },
  { key: 'period', label: 'Periodo', type: 'dropdown', options: periodOptions },
  { key: 'search', label: 'Buscar', type: 'text', placeholder: 'Buscar por titulo...' },
];

const sortOptions: SortOption[] = [
  { value: 'date_desc', label: 'Data (mais recente)' },
  { value: 'date_asc', label: 'Data (mais antiga)' },
  { value: 'amount_desc', label: 'Valor (maior primeiro)' },
  { value: 'amount_asc', label: 'Valor (menor primeiro)' },
];

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

// Helpers para lidar com nomes de campos diferentes (caso o hook retorne em outro formato)
function pick<T = any>(obj: any, keys: string[], fallback: T): T {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v as T;
  }
  return fallback;
}

function DynamicLucideIcon({
  iconKey,
  className,
}: {
  iconKey?: string;
  className?: string;
}) {
  const key = (iconKey || '') as keyof typeof Lucide;
  const Icon = Lucide[key] as unknown as React.ComponentType<{ className?: string }>;
  if (!Icon) return null;
  return <Icon className={className} />;
}

export function Receitas() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<ReceitaFilters>({ ...DEFAULT_FILTERS });
  const [sortBy, setSortBy] = useState<string>('date_desc');
  const [showModal, setShowModal] = useState(false);
  const [editingReceita, setEditingReceita] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const { createAdvancedTransaction } = useAdvancedTransactions();
  const [isAdvancedModalOpen, setIsAdvancedModalOpen] = useState(false);

  const {
    data: receitas = [],
    isLoading,
    createReceita,
    updateReceita,
    deleteReceita,
    markAsReceived,
    summary,
    installmentsThisMonth,
    fixedIncomesThisMonth,
  } = useReceitas(filters);

  const hasActiveFilters = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);

  const sortedReceitas = [...receitas].sort((a, b) => {
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

  const handleApplyFilters = (newFilters: Record<string, string>) => {
    setFilters(newFilters as unknown as ReceitaFilters);
  };

  const handleApplySort = (newSort: string) => {
    setSortBy(newSort);
  };

  const handleCreateReceita = () => {
    setEditingReceita(null);
    setShowModal(false); // garante que não abre o modal antigo
    setIsAdvancedModalOpen(true); // abre o modal avançado já em Receita
  };
  const handleEditReceita = (receita: any) => {
    setEditingReceita(receita);
    setShowModal(true);
  };

  const handleDeleteReceita = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta receita?')) {
      await deleteReceita.mutateAsync(id);
    }
  };

  const handleMarkAsReceived = async (id: string) => {
    try {
      await markAsReceived.mutateAsync(id);
    } catch (error) {
      console.error('Error marking receita as received:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'received':
        return 'text-emerald-500 bg-emerald-50 border border-emerald-200';
      case 'pending':
        return 'text-amber-500 bg-amber-50 border border-amber-200';
      case 'open':
        return 'text-sky-500 bg-sky-50 border border-sky-200';
      case 'overdue':
        return 'text-rose-500 bg-rose-50 border border-rose-200';
      case 'scheduled':
        return 'text-violet-500 bg-violet-50 border border-violet-200';
      case 'canceled':
        return 'text-text-muted bg-bg-surface border border-border';
      default:
        return 'text-text-muted bg-bg-surface border border-border';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'received':
        return 'Recebida';
      case 'pending':
        return 'A receber';
      case 'open':
        return 'Aberta';
      case 'overdue':
        return 'Atrasada';
      case 'scheduled':
        return 'Agendada';
      case 'canceled':
        return 'Cancelada';
      default:
        return status;
    }
  };

  function getTypeIcon(type: string) {
    switch (type) {
      case 'income':
        return <TrendingUp className="p-1.5 rounded-lg bg-green-100 text-green-600" />;
      case 'expense':
        return <TrendingDown className="p-1.5 rounded-lg bg-red-100 text-red-600" />;
      case 'debt':
        return <AlertTriangle className="p-1.5 rounded-lg bg-orange-100 text-orange-600" />;
      case 'investment':
        return <Landmark className="p-1.5 rounded-lg bg-blue-100 text-blue-600" />;
      default:
        return null;
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'received':
      case 'paid':
        return <CheckCircle className="p-1.5 rounded-lg bg-green-600 text-green-50" />;
      case 'pending':
        return <Clock className="p-1.5 rounded-lg bg-yellow-500 text-yellow-50" />;
      case 'open':
        return <Circle className="p-1.5 rounded-lg bg-blue-500 text-blue-50" />;
      case 'overdue':
        return <AlertCircle className="p-1.5 rounded-lg bg-red-600 text-red-50" />;
      case 'scheduled':
        return <Calendar className="p-1.5 rounded-lg bg-indigo-500 text-indigo-50" />;
      case 'canceled':
        return <XCircle className="p-1.5 rounded-lg bg-bg-elevated text-text-muted" />;
      default:
        return null;
    }
  }

  const statusConfig: Record<
    string,
    { label: string; Icon: any; cardBg: string; titleColor: string; valueColor: string; border: string }
  > = {
    received: {
      label: 'Recebidas',
      Icon: CheckCircle,
      cardBg: 'bg-emerald-50',
      titleColor: 'text-text-secondary',
      valueColor: 'text-emerald-500',
      border: 'border-emerald-200',
    },
    pending: {
      label: 'Pendentes',
      Icon: Clock,
      cardBg: 'bg-amber-50',
      titleColor: 'text-text-secondary',
      valueColor: 'text-amber-500',
      border: 'border-amber-200',
    },
    open: {
      label: 'Abertas',
      Icon: Circle,
      cardBg: 'bg-sky-50',
      titleColor: 'text-text-secondary',
      valueColor: 'text-sky-500',
      border: 'border-sky-200',
    },
    overdue: {
      label: 'Atrasadas',
      Icon: AlertCircle,
      cardBg: 'bg-rose-50',
      titleColor: 'text-text-secondary',
      valueColor: 'text-rose-500',
      border: 'border-rose-200',
    },
    scheduled: {
      label: 'Agendadas',
      Icon: Calendar,
      cardBg: 'bg-violet-50',
      titleColor: 'text-text-secondary',
      valueColor: 'text-violet-500',
      border: 'border-violet-200',
    },
    canceled: {
      label: 'Canceladas',
      Icon: XCircle,
      cardBg: 'bg-bg-surface',
      titleColor: 'text-text-secondary',
      valueColor: 'text-text-muted',
      border: 'border-border',
    },
  };

  const byStatusFixed: Record<string, { count: number; total: number }> = (fixedIncomesThisMonth ?? []).reduce(
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

  return (
    <>
      <div className="space-y-4 sm:space-y-6 w-full min-w-0">
        <div className="flex items-center justify-between px-1 sm:px-0">
          <BreadcrumbBar segments={['Gerenciadores', 'Receitas']} onBack={() => navigate('/dashboard')} />
          <div className="relative">
            <VisualizationToolbar
              onFilter={() => setShowFilters((prev) => !prev)}
              onSort={() => setShowSort((prev) => !prev)}
              onShare={() => {}}
              onSettings={() => {}}
              activeFilter={hasActiveFilters}
            />
            <FiltersPanel
              isOpen={showFilters}
              onClose={() => setShowFilters(false)}
              fields={filterFields}
              currentFilters={filters as unknown as Record<string, string>}
              defaultFilters={DEFAULT_FILTERS as unknown as Record<string, string>}
              onApply={handleApplyFilters}
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
            <div className="p-1.5 sm:p-2 bg-emerald-100 rounded-lg flex-shrink-0">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Receitas</h1>
              <p className="text-sm sm:text-base text-text-secondary">Controle suas entradas</p>
            </div>
          </div>
          <Button onClick={handleCreateReceita} size="sm">
            <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            Nova Receita
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 px-1 sm:px-0">
          <Card>
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-text-secondary">Total Recebido</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-emerald-500 mt-1">
                    {formatCurrency(summary?.totalPaid || 0)}
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-emerald-100 rounded-lg">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-text-secondary">Total a Receber</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-amber-500 mt-1">
                    {formatCurrency(summary?.totalPending || 0)}
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-amber-100 rounded-lg">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-text-secondary">Total Parcelado</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-teal-600 mt-1">
                    {formatCurrency(summary?.totalInstallments || 0)}
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-teal-100 rounded-lg">
                  <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-teal-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-text-secondary">Media Mensal</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-sky-500 mt-1">
                    {formatCurrency(summary?.monthlyAverage || 0)}
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-sky-100 rounded-lg">
                  <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-sky-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="px-1 sm:px-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <RefreshCcw className="w-5 h-5 mr-2" />
                Receitas Fixas
              </CardTitle>
            </CardHeader>
            <CardContent className="py-0 px-1 sm:px-6">
              <div className="overflow-x-auto scrollbar-hide" style={{ scrollBehavior: 'smooth' }}>
                <div
                  className="flex space-x-4 p-4 sm:p-6"
                  style={{ width: 'max-content', scrollSnapType: 'x mandatory', paddingLeft: '0', paddingRight: '0' }}
                >
                  {fixedIncomesThisMonth?.map((income: any) => (
                    <div
                      key={income.id}
                      className="flex-shrink-0 w-64 p-4 rounded-lg border-2 border-border bg-bg-page hover:border-border transition-all"
                      style={{ scrollSnapAlign: 'start' }}
                    >
                      <div className="space-y-3">
                        <div>
                          <h3 className="font-semibold text-text-primary truncate">{income.title}</h3>
                          <p className="text-xs text-text-muted">Receita Fixa</p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-text-secondary">Vencimento:</span>
                            <span className="font-medium text-text-primary">{formatDate(income.transaction_date)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-text-secondary">Valor:</span>
                            <span className="font-medium text-emerald-500">{formatCurrency(Number(income.amount))}</span>
                          </div>
                          {income.category && (
                            <div className="flex justify-between text-sm">
                              <span className="text-text-secondary">Categoria:</span>
                              <span className="font-medium text-text-primary truncate">{income.category}</span>
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t border-border">
                          <div className="flex justify-between items-center mb-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(income.status)}`}>
                              {getStatusLabel(income.status)}
                            </span>
                          </div>
                          <div className="flex space-x-1">
                            {income.status === 'pending' && (
                              <button
                                onClick={() => handleMarkAsReceived(income.id)}
                                className="flex-1 p-1 text-xs text-emerald-500 hover:bg-emerald-50 rounded transition-colors"
                                title="Marcar como recebida"
                              >
                                <CheckCircle className="w-3 h-3 mx-auto" />
                              </button>
                            )}
                            <button
                              onClick={() => handleEditReceita(income)}
                              className="flex-1 p-1 text-xs text-text-secondary hover:bg-bg-elevated rounded transition-colors"
                              title="Editar"
                            >
                              <Edit className="w-3 h-3 mx-auto" />
                            </button>
                            <button
                              onClick={() => handleDeleteReceita(income.id)}
                              className="flex-1 p-1 text-xs text-rose-500 hover:bg-rose-50 rounded transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-3 h-3 mx-auto" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {(!fixedIncomesThisMonth || fixedIncomesThisMonth.length === 0) && (
                    <div className="flex-shrink-0 w-64 p-8 text-center text-text-muted">
                      <RefreshCcw className="w-12 h-12 text-text-muted mx-auto mb-3" />
                      <p className="text-sm">Nenhuma receita fixa neste periodo</p>
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
                      {fixedIncomesThisMonth?.length || 0} {(fixedIncomesThisMonth?.length || 0) === 1 ? 'receita' : 'receitas'}
                    </p>
                    <p className="text-lg font-semibold text-text-primary">
                      {formatCurrency(fixedIncomesThisMonth?.reduce((acc: number, e: any) => acc + Number(e.amount), 0) || 0)}
                    </p>
                  </div>

                  {Object.entries(statusConfig).map(([key, cfg]) => {
                    const stats = byStatusFixed[key] ?? { count: 0, total: 0 };
                    const Icon = cfg.Icon;
                    return (
                      <div key={key} className={`min-w-[240px] sm:min-w-0 snap-start p-3 rounded-lg border ${cfg.border} ${cfg.cardBg} text-left`}>
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className="w-3 h-3" />
                          <p className={`text-xs ${cfg.titleColor}`}>{cfg.label}</p>
                        </div>
                        <p className="text-lg font-semibold text-text-primary">{formatCurrency(stats.total || 0)}</p>
                        <p className={`text-sm font-medium ${cfg.valueColor}`}>
                          {stats.count} {stats.count === 1 ? 'receita' : 'receitas'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Parcelas (mantido igual) */}
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
                <div
                  className="flex space-x-4 p-4 sm:p-6"
                  style={{ width: 'max-content', scrollSnapType: 'x mandatory', paddingLeft: '0', paddingRight: '0' }}
                >
                  {installmentsThisMonth?.map((inst: any) => (
                    <div
                      key={inst.id}
                      className="flex-shrink-0 w-64 p-4 rounded-lg border-2 border-border bg-bg-page hover:border-border transition-all"
                      style={{ scrollSnapAlign: 'start' }}
                    >
                      <div className="space-y-3">
                        <div>
                          <h3 className="font-semibold text-text-primary truncate">{inst.title}</h3>
                          <p className="text-xs text-text-muted">
                            Parcela {inst.installment_number}/{inst.installment_total}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-text-secondary">Vencimento:</span>
                            <span className="font-medium text-text-primary">{formatDate(inst.transaction_date)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-text-secondary">Valor parcela:</span>
                            <span className="font-medium text-emerald-500">{formatCurrency(Number(inst.amount))}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-text-secondary">Total:</span>
                            <span className="font-medium text-text-primary">
                              {formatCurrency(Number(inst.amount) * inst.installment_total)}
                            </span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-border">
                          <div className="flex justify-between items-center mb-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(inst.status)}`}>
                              {getStatusLabel(inst.status)}
                            </span>
                          </div>
                          <div className="flex space-x-1">
                            {inst.status === 'pending' && (
                              <button
                                onClick={() => handleMarkAsReceived(inst.id)}
                                className="flex-1 p-1 text-xs text-emerald-500 hover:bg-emerald-50 rounded transition-colors"
                                title="Marcar como recebida"
                              >
                                <CheckCircle className="w-3 h-3 mx-auto" />
                              </button>
                            )}
                            <button
                              onClick={() => handleEditReceita(inst)}
                              className="flex-1 p-1 text-xs text-text-secondary hover:bg-bg-elevated rounded transition-colors"
                              title="Editar"
                            >
                              <Edit className="w-3 h-3 mx-auto" />
                            </button>
                            <button
                              onClick={() => handleDeleteReceita(inst.id)}
                              className="flex-1 p-1 text-xs text-rose-500 hover:bg-rose-50 rounded transition-colors"
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
                      <p className="text-sm">Nenhuma parcela neste periodo</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardContent className="p-4 pt-0 sm:px-6 sm:pt-0">
              {(() => {
                const totalCount = installmentsThisMonth?.length || 0;
                const totalValue = installmentsThisMonth?.reduce((acc: number, i: any) => acc + Number(i.amount || 0), 0) || 0;
                const byStatus = (installmentsThisMonth ?? []).reduce((acc: any, i: any) => {
                  const s = i.status ?? 'pending';
                  const v = Number(i.amount) || 0;
                  if (!acc[s]) acc[s] = { count: 0, total: 0 };
                  acc[s].count += 1; acc[s].total += v;
                  return acc;
                }, {} as Record<string, {count:number; total:number}>);

                return (
                  <div className="overflow-x-auto -mx-4 px-4 sm:overflow-visible sm:mx-0 sm:px-0 scrollbar-hide" style={{ scrollBehavior: "smooth" }}>
                    <div className="flex gap-3 w-max snap-x snap-mandatory sm:grid sm:w-auto sm:snap-none sm:gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7">
                      <div className="min-w-[240px] sm:min-w-0 snap-start p-3 rounded-lg border border-border bg-bg-surface text-left">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="p-1.5 rounded-lg bg-bg-elevated text-text-muted"><CreditCard className="w-3 h-3" /></span>
                          <p className="text-xs text-text-muted">Total</p>
                        </div>
                        <p className="text-sm font-medium text-text-secondary">{totalCount} {totalCount === 1 ? "receita" : "receitas"}</p>
                        <p className="text-lg font-semibold text-text-primary">{formatCurrency(totalValue)}</p>
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
                            <p className={`text-sm font-medium ${cfg.valueColor}`}>{stats.count} {stats.count === 1 ? "receita" : "receitas"}</p>
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

        {/* Lançamentos (AGORA com as MESMAS COLUNAS do Dashboard) */}
        <div className="px-1 sm:px-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Lancamentos</CardTitle>
            </CardHeader>

            <CardContent className="py-0 px-1 sm:px-6">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
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
                        {sortedReceitas.map((r: any) => {
                          const id = pick<string>(r, ['transaction_id', 'id'], '');
                          const status = pick<string>(r, ['transaction_status', 'status'], 'pending');
                          const date = pick<string>(r, ['transaction_date', 'date'], '');
                          const amount = pick<number>(r, ['transaction_amount', 'amount'], 0);

                          const title = pick<string>(r, ['transaction_description', 'title'], '-');
                          const subtitle = pick<string>(r, ['subtitle', 'transaction_subtitle'], '');

                          const accountName = pick<string>(r, ['transaction_account', 'account_name', 'account', 'bank_account_name'], '');
                          const accountColor = pick<string>(r, ['transaction_account_color', 'account_color'], '');
                          const accountIcon = pick<string>(r, ['transaction_account_icon', 'account_icon'], '');

                          const cardName = pick<string>(r, ['transaction_card_name', 'card_name'], '');
                          const cardColor = pick<string>(r, ['transaction_card_color', 'card_color'], '');
                          const cardIcon = pick<string>(r, ['transaction_card_icon', 'card_icon'], '');

                          const categoryName = pick<string>(r, ['transaction_category_name', 'category_name'], '');
                          const categoryColor = pick<string>(r, ['transaction_category_color', 'category_color'], '');
                          const categoryIcon = pick<string>(r, ['transaction_category_icon', 'category_icon'], '');

                          const costName = pick<string>(r, ['transaction_cost_center_name', 'cost_center_name'], '');
                          const costColor = pick<string>(r, ['transaction_cost_center_color', 'cost_center_color'], '');
                          const costIcon = pick<string>(r, ['transaction_cost_center_icon', 'cost_center_icon'], '');

                          return (
                            <tr
                              key={id}
                              className="border-b border-border hover:bg-bg-elevated cursor-pointer"
                              onClick={() => handleEditReceita(r)}
                            >
                              <td className="py-2 sm:py-3 px-2 sm:px-4 text-center">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-bg-surface" title="Receita">
                                  {getTypeIcon('income')}
                                </span>
                              </td>

                              <td className="py-2 sm:py-3 px-2 sm:px-4 text-center">
                                <span
                                  className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-bg-surface"
                                  title={getStatusLabel(status)}
                                >
                                  {getStatusIcon(status)}
                                </span>
                              </td>

                              <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-text-primary">
                                <span className="truncate block max-w-[140px] sm:max-w-none font-medium">{title}</span>
                                {subtitle ? <span className="truncate block max-w-[140px] sm:max-w-none text-[11px] text-text-muted">{subtitle}</span> : null}
                              </td>

                              <td className="py-2 sm:py-3 px-2 sm:px-4 text-center text-xs sm:text-sm text-text-secondary">
                                {date ? formatDate(date) : '-'}
                              </td>

                              <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-right font-medium">
                                {formatCurrency(Number(amount))}
                              </td>

                              {/* Conta Bancária (mesmo renderer do Dashboard, com fallback) */}
                              <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-text-primary">
                                {accountName ? (
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="flex items-center justify-center text-white p-1.5 rounded-lg"
                                      style={{ backgroundColor: accountColor || 'unset' }}
                                    >
                                      <DynamicLucideIcon iconKey={accountIcon} className="w-3 h-3" />
                                    </div>
                                    <span className="truncate block max-w-[140px] sm:max-w-none">{accountName}</span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-text-muted">-</span>
                                )}
                              </td>

                              {/* Cartão de crédito */}
                              <td className="py-2 sm:py-3 px-2 sm:px-4">
                                {cardName ? (
                                  <div
                                    className="inline-flex items-center px-2 py-1 rounded-full gap-1.5"
                                    style={{ backgroundColor: cardColor || '#E5E7EB' }}
                                  >
                                    <DynamicLucideIcon iconKey={cardIcon} className="w-3 h-3" />
                                    <span className="text-xs font-medium text-white truncate">{cardName}</span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-text-muted">-</span>
                                )}
                              </td>

                              {/* Categoria */}
                              <td className="py-2 sm:py-3 px-2 sm:px-4">
                                {categoryName ? (
                                  <div
                                    className="inline-flex items-center px-2 py-1 rounded-full gap-1.5"
                                    style={{ backgroundColor: categoryColor || '#E5E7EB' }}
                                  >
                                    <DynamicLucideIcon iconKey={categoryIcon} className="w-3 h-3" />
                                    <span className="text-xs font-medium text-white truncate">{categoryName}</span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-text-muted">-</span>
                                )}
                              </td>

                              {/* Centro de custo */}
                              <td className="py-2 sm:py-3 px-2 sm:px-4">
                                {costName ? (
                                  <div
                                    className="inline-flex items-center px-2 py-1 rounded-full gap-1.5"
                                    style={{ backgroundColor: costColor || '#E5E7EB' }}
                                  >
                                    <DynamicLucideIcon iconKey={costIcon} className="w-3 h-3" />
                                    <span className="text-xs font-medium text-white truncate">{costName}</span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-text-muted">-</span>
                                )}
                              </td>

                              {/* Ações (mesma lógica do Dashboard) */}
                              <td className="py-2 sm:py-3 px-2 sm:px-4">
                                <div className="flex justify-center space-x-1 sm:space-x-2">
                                  {(status === 'pending' || status === 'scheduled' || status === 'overdue' || status === 'open') && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMarkAsReceived(id);
                                      }}
                                      className="p-0.5 sm:p-1 text-text-muted hover:text-emerald-500 transition-colors"
                                      title="Marcar como recebida"
                                    >
                                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                                    </button>
                                  )}

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditReceita(r);
                                    }}
                                    className="p-0.5 sm:p-1 text-text-muted hover:text-text-secondary transition-colors"
                                    title="Editar"
                                  >
                                    <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                                  </button>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteReceita(id);
                                    }}
                                    className="p-0.5 sm:p-1 text-text-muted hover:text-rose-500 transition-colors"
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

                  {receitas.length === 0 && (
                    <div className="text-center py-6 sm:py-8 text-text-muted px-4">
                      <TrendingUp className="w-8 h-8 sm:w-12 sm:h-12 text-text-muted mx-auto mb-3 sm:mb-4" />
                      <p className="text-base sm:text-lg font-medium">Nenhuma receita encontrada</p>
                      <p className="text-xs sm:text-sm">Comece criando sua primeira receita</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>

            {/* Chips de resumo (mantido) */}
            <CardContent className="py-0 px-1 sm:px-6">
              {(() => {
                const totalCount = receitas?.length || 0;
                const totalValue = receitas?.reduce((acc: number, d: any) => acc + Number(d.amount || 0), 0) || 0;
                const byStatus = (receitas ?? []).reduce((acc: any, d: any) => {
                  const s = d.status ?? 'pending';
                  const v = Number(d.amount) || 0;
                  if (!acc[s]) acc[s] = { count: 0, total: 0 };
                  acc[s].count += 1;
                  acc[s].total += v;
                  return acc;
                }, {} as Record<string, { count: number; total: number }>);

                const chipConfig: Record<string, { label: string; border: string; text: string; bg: string }> = {
                  __total: { label: 'Total', border: 'border-border', text: 'text-text-primary', bg: 'bg-bg-surface' },
                  received: { label: 'Recebidas', border: 'border-emerald-300', text: 'text-emerald-500', bg: 'bg-emerald-50' },
                  pending: { label: 'Pendentes', border: 'border-amber-300', text: 'text-amber-500', bg: 'bg-amber-50' },
                  open: { label: 'Abertas', border: 'border-sky-300', text: 'text-sky-500', bg: 'bg-sky-50' },
                  overdue: { label: 'Atrasadas', border: 'border-rose-300', text: 'text-rose-500', bg: 'bg-rose-50' },
                  scheduled: { label: 'Agendadas', border: 'border-violet-300', text: 'text-violet-500', bg: 'bg-violet-50' },
                  canceled: { label: 'Canceladas', border: 'border-border', text: 'text-text-muted', bg: 'bg-bg-surface' },
                };

                const order = ['__total', 'received', 'pending', 'open', 'overdue', 'scheduled', 'canceled'];

                return (
                  <div
                    className="pt-3 mb-3 sm:mb-4 overflow-x-auto -mx-1 px-1 sm:overflow-visible sm:mx-0 sm:px-0 scrollbar-hide"
                    style={{ scrollBehavior: 'smooth' }}
                  >
                    <div className="flex gap-2 w-max snap-x snap-mandatory sm:grid sm:w-auto sm:snap-none sm:gap-3 sm:auto-cols-fr sm:grid-flow-col">
                      <div
                        className={`min-w-[180px] sm:min-w-0 snap-start rounded-lg border ${chipConfig.__total.border} ${chipConfig.__total.bg} px-3 py-2 flex items-center justify-between`}
                      >
                        <span className="text-xs font-medium text-text-secondary">Total</span>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-text-primary">{formatCurrency(totalValue)}</p>
                          <p className="text-[10px] text-text-muted">
                            {totalCount} {totalCount === 1 ? 'lancamento' : 'lancamentos'}
                          </p>
                        </div>
                      </div>

                      {order.slice(1).map((key) => {
                        const cfg = chipConfig[key];
                        const stats = byStatus[key] ?? { count: 0, total: 0 };
                        return (
                          <div
                            key={key}
                            className={`min-w-[180px] sm:min-w-0 snap-start rounded-lg border ${cfg.border} ${cfg.bg} px-3 py-2 flex items-center justify-between`}
                          >
                            <span className="text-xs font-medium text-text-secondary">{cfg.label}</span>
                            <div className="text-right">
                              <p className={`text-sm font-semibold ${cfg.text}`}>{formatCurrency(stats.total || 0)}</p>
                              <p className="text-[10px] text-text-muted">
                                {stats.count} {stats.count === 1 ? 'lancamento' : 'lancamentos'}
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

      <ReceitaModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        receita={editingReceita}
        onSave={async (data) => {
          if (editingReceita) {
            await updateReceita.mutateAsync({ id: editingReceita.id, updates: data });
          } else {
            await createReceita.mutateAsync(data);
          }
          setShowModal(false);
        }}
      />

      <AdvancedTransactionModal
        isOpen={isAdvancedModalOpen}
        onClose={() => setIsAdvancedModalOpen(false)}
        transactionType="income"
        onSave={async (data: AdvancedTransactionData) => {
          await createAdvancedTransaction.mutateAsync({
            transactionType: 'income',
            data,
          });
          setIsAdvancedModalOpen(false);
        }}
      />
    </>
  );
}

interface ReceitaModalProps {
  isOpen: boolean;
  onClose: () => void;
  receita?: any;
  onSave: (data: any) => Promise<void>;
}

function ReceitaModal({ isOpen, onClose, receita, onSave }: ReceitaModalProps) {
  const [formData, setFormData] = useState<ReceitaFormData>({
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
    notes: '',
  });

  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    if (receita) {
      setFormData({
        title: receita.title || '',
        subtitle: receita.subtitle || '',
        amount: Number(receita.amount) || 0,
        transaction_date: receita.transaction_date || new Date().toISOString().split('T')[0],
        status: receita.status || 'pending',
        repeat_type: receita.repeat_type || 'avulsa',
        repeat_interval: receita.repeat_interval || 'monthly',
        is_installment: receita.is_installment || false,
        installment_total: receita.installment_total || 1,
        category_id: receita.category_id || '',
        notes: receita.notes || '',
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
        notes: '',
      });
    }
  }, [receita]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const receitaData: ReceitaData = {
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
        notes: formData.notes,
      };
      await onSave(receitaData);
    } catch (error) {
      console.error('Error saving receita:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof ReceitaFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={receita ? 'Editar Receita' : 'Nova Receita'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input
              label="Titulo"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Ex: Salario, Freelance, Venda..."
              required
            />
          </div>

          <Input
            label="Microtitulo (opcional)"
            value={formData.subtitle}
            onChange={(e) => handleInputChange('subtitle', e.target.value)}
            placeholder="Ex: Entrada 1/3, Janeiro 2024..."
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
            <label className="block text-sm font-medium text-text-muted mb-2">Tipo de receita</label>
            <Dropdown options={repeatTypeOptions} value={formData.repeat_type} onChange={(value) => handleInputChange('repeat_type', value)} />
          </div>

          {formData.repeat_type === 'recorrente' && (
            <div>
              <label className="block text-sm font-medium text-text-muted mb-2">Intervalo de recorrencia</label>
              <Dropdown
                options={repeatIntervalOptions}
                value={formData.repeat_interval}
                onChange={(value) => handleInputChange('repeat_interval', value)}
              />
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.status === 'received'}
              onChange={(e) => handleInputChange('status', e.target.checked ? 'received' : 'pending')}
              className="mr-2"
            />
            <span className="text-sm text-text-muted">Ja foi recebida?</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_installment}
              onChange={(e) => handleInputChange('is_installment', e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-text-muted">Parcelada?</span>
          </label>
        </div>

        {formData.is_installment && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Numero de parcelas"
              type="number"
              min="1"
              value={formData.installment_total}
              onChange={(e) => handleInputChange('installment_total', Number(e.target.value))}
              required
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-text-muted mb-2">Observacoes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Observacoes adicionais..."
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-transparent"
            rows={3}
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={isLoading}>
            {receita ? 'Atualizar' : 'Criar'} Receita
          </Button>
        </div>
      </form>
    </Modal>
  );
}
