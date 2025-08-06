import React, { useState, useMemo } from 'react';
import { TrendingDown, Plus, Filter, Calendar, DollarSign, Clock, CheckCircle, Edit, Trash2, Copy, Eye, CreditCard } from 'lucide-react';
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
  due_date: string;
  status: 'pending' | 'paid';
  repeat_type: 'avulsa' | 'fixa' | 'recorrente';
  repeat_interval: string;
  is_installment: boolean;
  installment_total: number;
  category_id: string;
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
  { value: 'no_installments', label: 'Não parceladas' },
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

  const { data: despesas = [], isLoading, createDespesa, updateDespesa, deleteDespesa, markAsPaid, duplicateDespesa } = useDespesas(filters);

  // Calculate summary stats
  const summary = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const currentMonthDespesas = despesas.filter(d => {
      const dueDate = new Date(d.due_date);
      return dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear;
    });

    const totalPrevisto = currentMonthDespesas.reduce((acc, d) => acc + Number(d.amount), 0);
    const totalPago = currentMonthDespesas.filter(d => d.status === 'paid').reduce((acc, d) => acc + Number(d.amount), 0);
    const aPagar = currentMonthDespesas.filter(d => d.status === 'pending' && new Date(d.due_date) <= new Date()).reduce((acc, d) => acc + Number(d.amount), 0);
    const despesasFixas = currentMonthDespesas.filter(d => d.repeat_type === 'fixa').reduce((acc, d) => acc + Number(d.amount), 0);
    const parceladasAbertas = currentMonthDespesas.filter(d => d.is_installment && d.status === 'pending').reduce((acc, d) => acc + Number(d.amount), 0);

    return {
      totalPrevisto,
      totalPago,
      aPagar,
      despesasFixas,
      parceladasAbertas,
    };
  }, [despesas]);

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

  const handleDuplicateDespesa = async (id: string) => {
    try {
      await duplicateDespesa.mutateAsync(id);
    } catch (error) {
      console.error('Error duplicating despesa:', error);
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

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Despesas</h1>
              <p className="text-gray-600">Controle seus gastos e despesas</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </Button>
            <Button onClick={handleCreateDespesa}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Despesa
            </Button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <Dropdown
                    options={statusOptions}
                    value={filters.status}
                    onChange={(value) => handleFilterChange('status', value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <Dropdown
                    options={typeOptions}
                    value={filters.type}
                    onChange={(value) => handleFilterChange('type', value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Parceladas</label>
                  <Dropdown
                    options={installmentOptions}
                    value={filters.installments}
                    onChange={(value) => handleFilterChange('installments', value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
                  <Dropdown
                    options={periodOptions}
                    value={filters.period}
                    onChange={(value) => handleFilterChange('period', value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
                  <Input
                    placeholder="Buscar por título..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Previsto</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(summary.totalPrevisto)}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Pago</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {formatCurrency(summary.totalPago)}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">A Pagar Hoje</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">
                    {formatCurrency(summary.aPagar)}
                  </p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <Clock className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Despesas Fixas</p>
                  <p className="text-2xl font-bold text-purple-600 mt-1">
                    {formatCurrency(summary.despesasFixas)}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Parceladas Abertas</p>
                  <p className="text-2xl font-bold text-orange-600 mt-1">
                    {formatCurrency(summary.parceladasAbertas)}
                  </p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <CreditCard className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Despesas Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lançamentos de Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Título</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Valor</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Vencimento</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Pagamento</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Tipo</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Parcela</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {despesas.map((despesa) => (
                      <tr key={despesa.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{despesa.title}</p>
                            {despesa.subtitle && (
                              <p className="text-xs text-gray-500">{despesa.subtitle}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right text-sm font-medium text-gray-900">
                          {formatCurrency(Number(despesa.amount))}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(despesa.status)}`}>
                            {getStatusLabel(despesa.status)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-sm text-gray-600">
                          {formatDate(despesa.due_date)}
                        </td>
                        <td className="py-3 px-4 text-center text-sm text-gray-600">
                          {despesa.status === 'paid' ? formatDate(despesa.due_date) : '-'}
                        </td>
                        <td className="py-3 px-4 text-center text-sm text-gray-600">
                          {getTypeLabel(despesa.repeat_type)}
                        </td>
                        <td className="py-3 px-4 text-center text-sm text-gray-600">
                          {despesa.is_installment ? `${despesa.installment_number || 1}/${despesa.installment_total || 1}` : '-'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex justify-center space-x-2">
                            {despesa.status === 'pending' && (
                              <button
                                onClick={() => handleMarkAsPaid(despesa.id)}
                                className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                                title="Marcar como paga"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleEditDespesa(despesa)}
                              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDuplicateDespesa(despesa.id)}
                              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                              title="Duplicar"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteDespesa(despesa.id)}
                              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {despesas.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <TrendingDown className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-lg font-medium">Nenhuma despesa encontrada</p>
                    <p className="text-sm">Comece criando sua primeira despesa</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
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
    due_date: new Date().toISOString().split('T')[0],
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
    if (despesa) {
      setFormData({
        title: despesa.title || '',
        subtitle: despesa.subtitle || '',
        amount: Number(despesa.amount) || 0,
        due_date: despesa.due_date || new Date().toISOString().split('T')[0],
        status: despesa.status || 'pending',
        repeat_type: despesa.repeat_type || 'avulsa',
        repeat_interval: despesa.repeat_interval || 'monthly',
        is_installment: despesa.is_installment || false,
        installment_total: despesa.installment_total || 1,
        category_id: despesa.category_id || '',
        notes: despesa.notes || '',
      });
    } else {
      setFormData({
        title: '',
        subtitle: '',
        amount: 0,
        due_date: new Date().toISOString().split('T')[0],
        status: 'pending',
        repeat_type: 'avulsa',
        repeat_interval: 'monthly',
        is_installment: false,
        installment_total: 1,
        category_id: '',
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
        due_date: formData.due_date,
        status: formData.status,
        repeat_type: formData.repeat_type,
        repeat_interval: formData.repeat_interval,
        is_installment: formData.is_installment,
        installment_total: formData.installment_total,
        category_id: formData.category_id || null,
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
            value={formData.due_date}
            onChange={(e) => handleInputChange('due_date', e.target.value)}
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