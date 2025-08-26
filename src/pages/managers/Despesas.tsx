import React, { useState, useMemo } from 'react';
import { TrendingDown, Plus, Filter, Calendar, DollarSign, Clock, CheckCircle, Edit, AlertCircle, Circle, XCircle, Trash2, CreditCard, RefreshCcw, Target } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Dropdown } from '../../components/ui/Dropdown';
import { Modal } from '../../components/ui/Modal';
import { useDespesas } from '../../hooks/useDespesas';
import { formatCurrency, formatDate } from '../../lib/utils';
import { cn } from '../../lib/utils';
import type { DespesaData } from '../../services/despesa.service';

interface DespesaFilters {
  status: string;
  type: string;
  installments: string;
  period: string;
  category: string;
  search: string;
}

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
  { value: 'pending', label: 'A pagar' },
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

export function Despesas() {
  const [filters, setFilters] = useState<DespesaFilters>({
    status: 'all',
    type: 'all',
    installments: 'all',
    period: 'current_month',
    category: 'all',
    search: '',
  });

  const [showModal, setShowModal] = useState(false);
  const [editingDespesa, setEditingDespesa] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);

  const { 
    data: despesas = [], 
    isLoading, 
    createDespesa, 
    updateDespesa, 
    deleteDespesa, 
    markAsPaid,
    summary,
    installmentsThisMonth,
    fixedExpensesThisMonth
  } = useDespesas(filters);

  const handleFilterChange = (key: keyof DespesaFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleCreateDespesa = () => {
    setEditingDespesa(null);
    setShowModal(true);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'text-green-600 bg-green-50';
      case 'pending':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Paga';
      case 'pending':
        return 'A pagar';
      default:
        return status;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'avulsa':
        return 'Avulsa';
      case 'fixa':
        return 'Fixa';
      case 'recorrente':
        return 'Recorrente';
      default:
        return type;
    }
  };

  const statusConfig: Record<string, {
    label: string;
    Icon: any;
    cardBg: string;
    titleColor: string;
    valueColor: string;
    border: string;
  }> = {
    paid:      { label: "Pagas",     Icon: CheckCircle, cardBg: "bg-green-50",  titleColor: "text-gray-500", valueColor: "text-green-700",  border: "border-green-200" },
    pending:   { label: "Pendentes", Icon: Clock,       cardBg: "bg-yellow-50", titleColor: "text-gray-500", valueColor: "text-yellow-700", border: "border-yellow-200" },
    open:      { label: "Abertas",   Icon: Circle,      cardBg: "bg-blue-50",   titleColor: "text-gray-500", valueColor: "text-blue-700",   border: "border-blue-200" },
    overdue:   { label: "Vencidas",  Icon: AlertCircle, cardBg: "bg-red-50",    titleColor: "text-gray-500", valueColor: "text-red-700",    border: "border-red-200" },
    scheduled: { label: "Agendadas", Icon: Calendar,    cardBg: "bg-indigo-50", titleColor: "text-gray-500", valueColor: "text-indigo-700", border: "border-indigo-200" },
    canceled:  { label: "Canceladas",Icon: XCircle,     cardBg: "bg-gray-50",   titleColor: "text-gray-500", valueColor: "text-gray-700",   border: "border-gray-200" },
  };
  
  // Agrega quantidade e total por status
  const byStatus: Record<string, { count: number; total: number }> = 
    (fixedExpensesThisMonth ?? []).reduce((acc: Record<string, { count: number; total: number }>, e: any) => {
      const s = e.status ?? "pending";
      const v = Number(e.amount) || 0;
      if (!acc[s]) acc[s] = { count: 0, total: 0 };
      acc[s].count += 1;
      acc[s].total += v;
      return acc;
  }, {});

  return (
    <>
      <div className="space-y-4 sm:space-y-6 w-full min-w-0 overflow-x-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 px-1 sm:px-0">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="p-1.5 sm:p-2 bg-red-100 rounded-lg flex-shrink-0">
              <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Despesas</h1>
              <p className="text-sm sm:text-base text-gray-600">Controle seus gastos e despesas</p>
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
            <Button onClick={handleCreateDespesa} size="sm">
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Nova Despesa
            </Button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="px-1 sm:px-0">
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Status</label>
                    <Dropdown
                      options={statusOptions}
                      value={filters.status}
                      onChange={(value) => handleFilterChange('status', value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Tipo</label>
                    <Dropdown
                      options={typeOptions}
                      value={filters.type}
                      onChange={(value) => handleFilterChange('type', value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Parceladas</label>
                    <Dropdown
                      options={installmentOptions}
                      value={filters.installments}
                      onChange={(value) => handleFilterChange('installments', value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Período</label>
                    <Dropdown
                      options={periodOptions}
                      value={filters.period}
                      onChange={(value) => handleFilterChange('period', value)}
                    />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Buscar</label>
                    <Input
                      placeholder="Buscar por título..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 px-1 sm:px-0">
          <Card>
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Total Pago</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600 mt-1">
                    {formatCurrency(summary?.totalPaid || 0)}
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-red-100 rounded-lg flex-shrink-0">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Total Pendente</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-yellow-600 mt-1">
                    {formatCurrency(summary?.totalPending || 0)}
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-yellow-100 rounded-lg flex-shrink-0">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Total Parcelado</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-600 mt-1">
                    {formatCurrency(summary?.totalInstallments || 0)}
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-purple-100 rounded-lg flex-shrink-0">
                  <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Média Mensal</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600 mt-1">
                    {formatCurrency(summary?.monthlyAverage || 0)}
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-blue-100 rounded-lg flex-shrink-0">
                  <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-600" />
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
              <div 
                className="overflow-x-auto scrollbar-hide" 
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
                  {installmentsThisMonth?.map((installment, index) => (
                    <div
                      key={installment.id}
                      className="flex-shrink-0 w-64 p-4 rounded-lg border-2 border-gray-200 bg-white hover:border-gray-300 transition-all"
                      style={{ scrollSnapAlign: 'start' }}
                    >
                      <div className="space-y-3">
                        <div>
                          <h3 className="font-semibold text-gray-900 truncate">
                            {installment.title}
                          </h3>
                          <p className="text-xs text-gray-500">
                            Parcela {installment.installment_number}/{installment.installment_total}
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Vencimento:</span>
                            <span className="font-medium text-gray-900">
                              {formatDate(installment.transaction_date)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Valor parcela:</span>
                            <span className="font-medium text-red-600">
                              {formatCurrency(Number(installment.amount))}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Total compra:</span>
                            <span className="font-medium text-gray-900">
                              {formatCurrency(Number(installment.amount) * installment.installment_total)}
                            </span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-gray-100">
                          <div className="flex justify-between items-center mb-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(installment.status)}`}>
                              {getStatusLabel(installment.status)}
                            </span>
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
                              className="flex-1 p-1 text-xs text-gray-600 hover:bg-gray-50 rounded transition-colors"
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
                    <div className="flex-shrink-0 w-64 p-8 text-center text-gray-500">
                      <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm">Nenhuma parcela este mês</p>
                    </div>
                  )}
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
              <div 
                className="overflow-x-auto scrollbar-hide" 
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
                  {fixedExpensesThisMonth?.map((expense, index) => (
                    <div
                      key={expense.id}
                      className="flex-shrink-0 w-64 p-4 rounded-lg border-2 border-gray-200 bg-white hover:border-gray-300 transition-all"
                      style={{ scrollSnapAlign: 'start' }}
                    >
                      <div className="space-y-3">
                        <div>
                          <h3 className="font-semibold text-gray-900 truncate">
                            {expense.title}
                          </h3>
                          <p className="text-xs text-gray-500">Despesa Fixa</p>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Vencimento:</span>
                            <span className="font-medium text-gray-900">
                              {formatDate(expense.transaction_date)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Valor:</span>
                            <span className="font-medium text-red-600">
                              {formatCurrency(Number(expense.amount))}
                            </span>
                          </div>
                          {expense.category && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Categoria:</span>
                              <span className="font-medium text-gray-900 truncate">
                                {expense.category}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t border-gray-100">
                          <div className="flex justify-between items-center mb-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(expense.status)}`}>
                              {getStatusLabel(expense.status)}
                            </span>
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
                              className="flex-1 p-1 text-xs text-gray-600 hover:bg-gray-50 rounded transition-colors"
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
                    <div className="flex-shrink-0 w-64 p-8 text-center text-gray-500">
                      <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm">Nenhuma despesa fixa este mês</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardContent className="p-4 pt-0 sm:px-6 sm:pt-0">
              {/* MOBILE: scroll horizontal | DESKTOP: grid sem scroll */}
              <div
                className="
                  overflow-x-auto -mx-4 px-4
                  sm:overflow-visible sm:mx-0 sm:px-0
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
                  <div className="min-w-[240px] sm:min-w-0 snap-start p-3 rounded-lg border border-gray-300 bg-gray-50 text-left">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="p-1.5 rounded-lg bg-gray-700 text-white">
                        <Calendar className="w-3 h-3" />
                      </span>
                      <p className="text-xs text-gray-500">Total</p>
                    </div>
                    <p className="text-sm font-medium text-gray-600">
                      {fixedExpensesThisMonth?.length || 0}{" "}
                      {(fixedExpensesThisMonth?.length || 0) === 1 ? "despesa" : "despesas"}
                    </p>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatCurrency(
                        fixedExpensesThisMonth?.reduce((acc, e) => acc + Number(e.amount), 0) || 0
                      )}
                    </p>
                  </div>

                  {/* STATUS CARDS */}
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

                        <p className="text-lg font-semibold text-gray-900">
                          {formatCurrency(stats.total || 0)}
                        </p>
                        <p className={`text-sm font-medium ${cfg.valueColor}`}>
                          {stats.count} {stats.count === 1 ? "despesa" : "despesas"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Despesas Table */}
        <div className="px-1 sm:px-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Lançamentos de Despesas</CardTitle>
            </CardHeader>
            <CardContent className="py-0 px-1 sm:px-6">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
                </div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <table className="w-full min-w-[800px]">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 min-w-[120px]">Título</th>
                        <th className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 min-w-[80px]">Valor</th>
                        <th className="text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 min-w-[80px]">Status</th>
                        <th className="text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 min-w-[90px]">Vencimento</th>
                        <th className="text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 min-w-[90px]">Pagamento</th>
                        <th className="text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 min-w-[70px]">Tipo</th>
                        <th className="text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 min-w-[70px]">Parcela</th>
                        <th className="text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 min-w-[80px]">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {despesas.map((despesa) => (
                        <tr key={despesa.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 sm:py-3 px-2 sm:px-4">
                            <div>
                              <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{despesa.title}</p>
                              {despesa.subtitle && (
                                <p className="text-xs text-gray-500 truncate">{despesa.subtitle}</p>
                              )}
                            </div>
                          </td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-xs sm:text-sm font-medium text-gray-900">
                            {formatCurrency(Number(despesa.amount))}
                          </td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4 text-center">
                            <span className={`inline-flex px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-medium rounded-full ${getStatusColor(despesa.status)}`}>
                              {getStatusLabel(despesa.status)}
                            </span>
                          </td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4 text-center text-xs sm:text-sm text-gray-600">
                            {formatDate(despesa.transaction_date)}
                          </td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4 text-center text-xs sm:text-sm text-gray-600">
                            {despesa.status === 'paid' ? formatDate(despesa.transaction_date) : '-'}
                          </td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4 text-center text-xs sm:text-sm text-gray-600">
                            {getTypeLabel(despesa.repeat_type)}
                          </td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4 text-center text-xs sm:text-sm text-gray-600">
                            {despesa.is_installment ? `${despesa.installment_number}/${despesa.installment_total}` : '-'}
                          </td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4">
                            <div className="flex justify-center space-x-1 sm:space-x-2">
                              {despesa.status === 'pending' && (
                                <button
                                  onClick={() => handleMarkAsPaid(despesa.id)}
                                  className="p-0.5 sm:p-1 text-gray-400 hover:text-green-600 transition-colors"
                                  title="Marcar como paga"
                                >
                                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleEditDespesa(despesa)}
                                className="p-0.5 sm:p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                title="Editar"
                              >
                                <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteDespesa(despesa.id)}
                                className="p-0.5 sm:p-1 text-gray-400 hover:text-red-600 transition-colors"
                                title="Excluir"
                              >
                                <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {despesas.length === 0 && (
                    <div className="text-center py-6 sm:py-8 text-gray-500 px-4">
                      <TrendingDown className="w-8 h-8 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
                      <p className="text-base sm:text-lg font-medium">Nenhuma despesa encontrada</p>
                      <p className="text-xs sm:text-sm">Comece criando sua primeira despesa</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create/Edit Modal */}
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
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={despesa ? 'Editar Despesa' : 'Nova Despesa'}
      size="lg"
    >
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de despesa
            </label>
            <Dropdown
              options={repeatTypeOptions}
              value={formData.repeat_type}
              onChange={(value) => handleInputChange('repeat_type', value)}
            />
          </div>

          {formData.repeat_type === 'recorrente' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Intervalo de recorrência
              </label>
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
              checked={formData.status === 'paid'}
              onChange={(e) => handleInputChange('status', e.target.checked ? 'paid' : 'pending')}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Já foi paga?</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_installment}
              onChange={(e) => handleInputChange('is_installment', e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Parcelada?</span>
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Observações
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Observações adicionais..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-transparent"
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