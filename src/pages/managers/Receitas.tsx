import React, { useState, useMemo } from 'react';
import { TrendingUp, Plus, Filter, Calendar, DollarSign, Clock, CheckCircle, Edit, Trash2, Copy, Eye } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Dropdown } from '../../components/ui/Dropdown';
import { Modal } from '../../components/ui/Modal';
import { useReceitas } from '../../hooks/useReceitas';
import { formatCurrency, formatDate } from '../../lib/utils';
import { cn } from '../../lib/utils';
import type { ReceitaData } from '../../services/receita.service';

interface ReceitaFilters {
  status: string;
  type: string;
  installments: string;
  period: string;
  category: string;
  search: string;
}

interface ReceitaFormData {
  title: string;
  subtitle: string;
  amount: number;
  transaction_date: string;
  status: 'pending' | 'received';
  repeat_type: 'avulsa' | 'fixa' | 'recorrente';
  repeat_interval: string;
  is_installment: boolean;
  installment_total: number;
  category_id: string;
  notes: string;
}

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

export function Receitas() {
  const [filters, setFilters] = useState<ReceitaFilters>({
    status: 'all',
    type: 'all',
    installments: 'all',
    period: 'current_month',
    category: 'all',
    search: '',
  });

  const [showModal, setShowModal] = useState(false);
  const [editingReceita, setEditingReceita] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);

  const { data: receitas = [], isLoading, createReceita, updateReceita, deleteReceita, markAsReceived } = useReceitas(filters);

  // Calculate summary stats
  const summary = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const currentMonthReceitas = receitas.filter(r => {
      const transactionDate = new Date(r.transaction_date);
      return transactionDate.getMonth() === currentMonth && transactionDate.getFullYear() === currentYear;
    });

    const totalPrevisto = currentMonthReceitas.reduce((acc, r) => acc + Number(r.amount), 0);
    const totalRecebido = currentMonthReceitas.filter(r => r.status === 'received').reduce((acc, r) => acc + Number(r.amount), 0);
    const aReceber = currentMonthReceitas.filter(r => r.status === 'pending' && new Date(r.transaction_date) <= new Date()).reduce((acc, r) => acc + Number(r.amount), 0);
    const receitasFixas = currentMonthReceitas.filter(r => r.repeat_type === 'fixa').reduce((acc, r) => acc + Number(r.amount), 0);

    return {
      totalPrevisto,
      totalRecebido,
      aReceber,
      receitasFixas,
    };
  }, [receitas]);

  const handleFilterChange = (key: keyof ReceitaFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleCreateReceita = () => {
    setEditingReceita(null);
    setShowModal(true);
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
    await markAsReceived.mutateAsync(id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
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
      case 'received':
        return 'Recebida';
      case 'pending':
        return 'A receber';
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

  // Group installments by installment_group_id
  const groupedReceitas = useMemo(() => {
    const standalone: any[] = [];

    receitas.forEach(receita => {
      standalone.push(receita);
    });

    return { groups: {}, standalone };
  }, [receitas]);

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Receitas</h1>
              <p className="text-gray-600">Gerencie suas fontes de renda</p>
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
            <Button onClick={handleCreateReceita}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Receita
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                  <p className="text-sm font-medium text-gray-600">Total Recebido</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {formatCurrency(summary.totalRecebido)}
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
                  <p className="text-sm font-medium text-gray-600">A Receber Hoje</p>
                  <p className="text-2xl font-bold text-yellow-600 mt-1">
                    {formatCurrency(summary.aReceber)}
                  </p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Receitas Fixas</p>
                  <p className="text-2xl font-bold text-purple-600 mt-1">
                    {formatCurrency(summary.receitasFixas)}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Receitas Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lançamentos de Receitas</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
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
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Recebimento</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Tipo</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Parcela</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Standalone receitas */}
                    {groupedReceitas.standalone.map((receita) => (
                      <tr key={receita.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{receita.title}</p>
                            {receita.subtitle && (
                              <p className="text-xs text-gray-500">{receita.subtitle}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right text-sm font-medium text-gray-900">
                          {formatCurrency(Number(receita.amount))}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(receita.status)}`}>
                            {getStatusLabel(receita.status)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-sm text-gray-600">
                          {formatDate(receita.transaction_date)}
                        </td>
                        <td className="py-3 px-4 text-center text-sm text-gray-600">
                          {receita.status === 'received' ? formatDate(receita.transaction_date) : '-'}
                        </td>
                        <td className="py-3 px-4 text-center text-sm text-gray-600">
                          {getTypeLabel(receita.repeat_type)}
                        </td>
                        <td className="py-3 px-4 text-center text-sm text-gray-600">
                          {receita.is_installment ? `${receita.installment_number}/${receita.installment_total}` : '-'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex justify-center space-x-2">
                            {receita.status === 'pending' && (
                              <button
                                onClick={() => handleMarkAsReceived(receita.id)}
                                className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                                title="Marcar como recebida"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleEditReceita(receita)}
                              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteReceita(receita.id)}
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
                
                {receitas.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-lg font-medium">Nenhuma receita encontrada</p>
                    <p className="text-sm">Comece criando sua primeira receita</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Modal */}
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
    </>
  );
}

// Modal Component
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
        category_id: formData.category_id,
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
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={receita ? 'Editar Receita' : 'Nova Receita'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input
              label="Título"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Ex: Salário, Freelance, Venda..."
              required
            />
          </div>

          <Input
            label="Microtítulo (opcional)"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de receita
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
              checked={formData.status === 'received'}
              onChange={(e) => handleInputChange('status', e.target.checked ? 'received' : 'pending')}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Já foi recebida?</span>
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-transparent"
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