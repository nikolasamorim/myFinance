import React, { useState, useMemo } from 'react';
import { Target, Plus, Filter, Edit, Trash2, Table, TreePine } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Dropdown } from '../../components/ui/Dropdown';
import { Modal } from '../../components/ui/Modal';
import { KanbanBoard } from '../../components/kanban/KanbanBoard';
import { useCostCenters } from '../../hooks/useCostCenters';
import { cn } from '../../lib/utils';
import type { CostCenterData } from '../../services/costCenter.service';

interface CostCenterFilters {
  status: string;
  search: string;
}

interface CostCenterFormData {
  title: string;
  type: 'revenue' | 'expense';
  code: string;
  parent_id: string;
  accounting_code: string;
  status: 'active' | 'inactive';
  description: string;
}

const statusOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Ativo' },
  { value: 'inactive', label: 'Inativo' },
];

export function CentrosDeCusto() {
  const [filters, setFilters] = useState<CostCenterFilters>({
    status: 'all',
    search: '',
  });

  const [showModal, setShowModal] = useState(false);
  const [editingCostCenter, setEditingCostCenter] = useState<any>(null);
  const [parentCostCenterId, setParentCostCenterId] = useState<string | undefined>();
  const [showFilters, setShowFilters] = useState(false);

  const { 
    data: costCenters = [], 
    isLoading, 
    createCostCenter, 
    updateCostCenter, 
    deleteCostCenter,
    updateCostCenterOrder,
  } = useCostCenters(filters);

  const handleFilterChange = (key: keyof CostCenterFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleCreateCostCenter = (parentId?: string) => {
    setEditingCostCenter(null);
    setParentCostCenterId(parentId);
    setShowModal(true);
  };

  const handleEditCostCenter = (costCenter: any) => {
    setEditingCostCenter(costCenter);
    setParentCostCenterId(undefined);
    setShowModal(true);
  };

  const handleDeleteCostCenter = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este centro de custo?')) {
      await deleteCostCenter.mutateAsync(id);
    }
  };

  const handleReorderCostCenters = async (updates: Array<{ id: string; parent_id: string | null; sort_order: number }>) => {
    const updatesWithType = updates.map(update => ({
      ...update,
      type: costCenters.find(cc => cc.id === update.id)?.type,
    }));
    await updateCostCenterOrder.mutateAsync(updatesWithType);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Ativo';
      case 'inactive':
        return 'Inativo';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-50';
      case 'inactive':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const renderCostCenterContent = (costCenter: any) => {
    return (
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center space-x-3">
          <div>
            <p className="font-medium text-gray-900">{costCenter.title}</p>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                costCenter.type === 'revenue' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
              }`}>
                {costCenter.type === 'revenue' ? 'Receita' : 'Despesa'}
              </span>
            </div>
            {costCenter.description && (
              <p className="text-sm text-gray-500">{costCenter.description}</p>
            )}
            <div className="flex items-center space-x-2 mt-1">
              {costCenter.code && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                  {costCenter.code}
                </span>
              )}
              {costCenter.accounting_code && (
                <span className="text-xs text-gray-500 bg-blue-100 px-2 py-0.5 rounded">
                  {costCenter.accounting_code}
                </span>
              )}
            </div>
          </div>
        </div>
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(costCenter.status)}`}>
          {getStatusLabel(costCenter.status)}
        </span>
      </div>
    );
  };

  return (
    <>
      <div className="space-y-4 sm:space-y-6 w-full min-w-0 overflow-x-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 px-1 sm:px-0">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="p-1.5 sm:p-2 bg-indigo-100 rounded-lg flex-shrink-0">
              <Target className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Centro de Custo</h1>
              <p className="text-sm sm:text-base text-gray-600">Organize custos por centros de responsabilidade</p>
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
            <Button onClick={() => handleCreateCostCenter()} size="sm">
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Novo Centro de Custo
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
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Status</label>
                    <Dropdown
                      options={statusOptions}
                      value={filters.status}
                      onChange={(value) => handleFilterChange('status', value)}
                    />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-1">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Buscar</label>
                    <Input
                      placeholder="Buscar centros de custo..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Content based on active tab */}
        {/* Kanban Board */}
        <div className="px-1 sm:px-0">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            </div>
          ) : (
            <KanbanBoard
              items={costCenters.map(cc => ({
                id: cc.id,
                title: cc.title,
                type: cc.type || 'expense',
                parent_id: cc.parent_id,
                sort_order: cc.sort_order,
                code: cc.code,
                accounting_code: cc.accounting_code,
                status: cc.status,
                description: cc.description,
                ...cc,
              }))}
              columns={[
                { id: 'cost-centers', title: 'Centros de Custo', type: undefined },
              ]}
              onEdit={handleEditCostCenter}
              onDelete={handleDeleteCostCenter}
              onCreate={handleCreateCostCenter}
              onReorder={handleReorderCostCenters}
              renderItemContent={renderCostCenterContent}
            />
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <CostCenterModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        costCenter={editingCostCenter}
        parentCostCenterId={parentCostCenterId}
        costCenters={costCenters}
        onSave={async (data) => {
          if (editingCostCenter) {
            await updateCostCenter.mutateAsync({ id: editingCostCenter.id, updates: data });
          } else {
            await createCostCenter.mutateAsync(data);
          }
          setShowModal(false);
        }}
      />
    </>
  );
}

// Modal Component
interface CostCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  costCenter?: any;
  parentCostCenterId?: string;
  costCenters: any[];
  onSave: (data: any) => Promise<void>;
}

function CostCenterModal({ isOpen, onClose, costCenter, parentCostCenterId, costCenters, onSave }: CostCenterModalProps) {
  const [formData, setFormData] = useState<CostCenterFormData>({
    title: '',
    type: 'expense',
    code: '',
    parent_id: '',
    accounting_code: '',
    status: 'active',
    description: '',
  });

  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    if (costCenter) {
      setFormData({
        title: costCenter.title || '',
        type: costCenter.type || 'expense',
        code: costCenter.code || '',
        parent_id: costCenter.parent_id || '',
        accounting_code: costCenter.accounting_code || '',
        status: costCenter.status || 'active',
        description: costCenter.description || '',
      });
    } else if (parentCostCenterId) {
      setFormData({
        title: '',
        code: '',
        parent_id: parentCostCenterId,
        accounting_code: '',
        status: 'active',
        description: '',
      });
    } else {
      setFormData({
        title: '',
        code: '',
        parent_id: '',
        accounting_code: '',
        status: 'active',
        description: '',
      });
    }
  }, [costCenter, parentCostCenterId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const costCenterData: CostCenterData = {
        title: formData.title,
        code: formData.code,
        parent_id: formData.parent_id || null,
        accounting_code: formData.accounting_code,
        status: formData.status,
        description: formData.description,
      };
      await onSave(costCenterData);
    } catch (error) {
      console.error('Error saving cost center:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof CostCenterFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const statusFormOptions = [
    { value: 'active', label: 'Ativo' },
    { value: 'inactive', label: 'Inativo' },
  ];

  // Filter parent cost centers and exclude current cost center
  const parentOptions = [
    { value: '', label: 'Nenhum (centro raiz)' },
    ...costCenters
      .filter(cc => cc.id !== costCenter?.id)
      .map(cc => ({ value: cc.id, label: cc.title }))
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={costCenter ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input
              label="Nome do centro de custo"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Ex: Departamento de Vendas, Filial São Paulo"
              required
            />
          </div>

          <Input
            label="Código"
            value={formData.code}
            onChange={(e) => handleInputChange('code', e.target.value)}
            placeholder="Ex: CC001, VENDAS"
          />

          <Input
            label="Código contábil"
            value={formData.accounting_code}
            onChange={(e) => handleInputChange('accounting_code', e.target.value)}
            placeholder="Ex: 1.1.001"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo
            </label>
            <Dropdown
              options={typeFormOptions}
              value={formData.type}
              onChange={(value) => handleInputChange('type', value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Centro de custo pai
            </label>
            <Dropdown
              options={parentOptions}
              value={formData.parent_id}
              onChange={(value) => handleInputChange('parent_id', value)}
              placeholder="Selecione um centro pai"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <Dropdown
              options={statusFormOptions}
              value={formData.status}
              onChange={(value) => handleInputChange('status', value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descrição
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Descrição do centro de custo..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
            rows={3}
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={isLoading}>
            {costCenter ? 'Atualizar' : 'Criar'} Centro de Custo
          </Button>
        </div>
      </form>
    </Modal>
  );
}