import React, { useState } from 'react';
import { Target, Plus, Edit, Trash2, Table, TreePine } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Dropdown } from '../../components/ui/Dropdown';
import { Modal } from '../../components/ui/Modal';
import { TabSelector } from '../../components/ui/TabSelector';
import { KanbanBoard } from '../../components/kanban/KanbanBoard';
import { BreadcrumbBar } from '../../components/ui/BreadcrumbBar';
import { VisualizationToolbar } from '../../components/ui/VisualizationToolbar';
import { FiltersPanel } from '../../components/ui/FiltersPanel';
import { SortPanel } from '../../components/ui/SortPanel';
import type { FilterField } from '../../components/ui/FiltersPanel';
import type { SortOption } from '../../components/ui/SortPanel';
import { useCostCenters } from '../../hooks/useCostCenters';
import { cn } from '../../lib/utils';
import { ColorPicker } from '../../components/ui/ColorPicker';
import { IconPicker } from '../../components/ui/IconPicker';
import type { CostCenterData } from '../../services/costCenter.service';

interface CostCenterFilters {
  status: string;
  type: string;
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

const DEFAULT_FILTERS: CostCenterFilters = {
  status: 'all',
  type: 'all',
  search: '',
};

const statusOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Ativo' },
  { value: 'inactive', label: 'Inativo' },
];

const typeOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'revenue', label: 'Receita' },
  { value: 'expense', label: 'Despesa' },
];

const filterFields: FilterField[] = [
  { key: 'status', label: 'Status', type: 'dropdown', options: statusOptions },
  { key: 'type', label: 'Tipo', type: 'dropdown', options: typeOptions },
  { key: 'search', label: 'Buscar', type: 'text', placeholder: 'Buscar centros de custo...' },
];

const sortOptions: SortOption[] = [
  { value: 'name_asc', label: 'Nome (A-Z)' },
  { value: 'name_desc', label: 'Nome (Z-A)' },
  { value: 'type_revenue', label: 'Tipo (Receita primeiro)' },
  { value: 'type_expense', label: 'Tipo (Despesa primeiro)' },
  { value: 'code_asc', label: 'Codigo (A-Z)' },
  { value: 'code_desc', label: 'Codigo (Z-A)' },
];

export function CentrosDeCusto() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('hierarchy');
  const [filters, setFilters] = useState<CostCenterFilters>({ ...DEFAULT_FILTERS });
  const [sortBy, setSortBy] = useState<string>('name_asc');
  const [showModal, setShowModal] = useState(false);
  const [editingCostCenter, setEditingCostCenter] = useState<any>(null);
  const [parentCostCenterId, setParentCostCenterId] = useState<string | undefined>();
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);

  const {
    data: costCenters = [],
    isLoading,
    createCostCenter,
    updateCostCenter,
    deleteCostCenter,
    updateCostCenterOrder,
  } = useCostCenters(filters);

  const hasActiveFilters = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);

  const sortedCostCenters = [...costCenters].sort((a, b) => {
    switch (sortBy) {
      case 'name_asc':
        return a.title.localeCompare(b.title);
      case 'name_desc':
        return b.title.localeCompare(a.title);
      case 'type_revenue':
        return a.type === 'revenue' ? -1 : b.type === 'revenue' ? 1 : 0;
      case 'type_expense':
        return a.type === 'expense' ? -1 : b.type === 'expense' ? 1 : 0;
      case 'code_asc':
        return (a.code || '').localeCompare(b.code || '');
      case 'code_desc':
        return (b.code || '').localeCompare(a.code || '');
      default:
        return 0;
    }
  });

  const handleApplyFilters = (newFilters: Record<string, string>) => {
    setFilters(newFilters as unknown as CostCenterFilters);
  };

  const handleApplySort = (newSort: string) => {
    setSortBy(newSort);
  };

  const handleCreateCostCenter = (parentId?: string, type?: string) => {
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

  const handleReorderCostCenters = async (updates: Array<{ id: string; parent_id: string | null; sort_order: number; type?: string }>) => {
    await updateCostCenterOrder.mutateAsync(updates);
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

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'revenue':
        return 'Receita';
      case 'expense':
        return 'Despesa';
      default:
        return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'revenue':
        return 'text-green-600 bg-green-50';
      case 'expense':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const tabs = [
    { id: 'hierarchy', label: 'Hierarquia', icon: <TreePine className="w-4 h-4" /> },
    { id: 'table', label: 'Tabela', icon: <Table className="w-4 h-4" /> },
  ];

  const renderCostCenterContent = (costCenter: any) => {
    return (
      <div className="flex items-center justify-between w-full">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{costCenter.title}</p>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getTypeColor(costCenter.type)}`}>
                  {getTypeLabel(costCenter.type)}
                </span>
                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(costCenter.status)}`}>
                  {getStatusLabel(costCenter.status)}
                </span>
              </div>
              {costCenter.description && (
                <p className="text-sm text-gray-500 mt-1 truncate">{costCenter.description}</p>
              )}
              <div className="flex items-center space-x-2 mt-1">
                {costCenter.code && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                    Código: {costCenter.code}
                  </span>
                )}
                {costCenter.accounting_code && (
                  <span className="text-xs text-gray-500 bg-blue-100 px-2 py-0.5 rounded">
                    Contábil: {costCenter.accounting_code}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="space-y-4 sm:space-y-6 w-full min-w-0">
        <div className="flex items-center justify-between px-1 sm:px-0">
          <BreadcrumbBar segments={['Organizadores', 'Centros de Custo']} onBack={() => navigate(-1)} />
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
            <div className="p-1.5 sm:p-2 bg-sky-100 rounded-lg flex-shrink-0">
              <Target className="w-5 h-5 sm:w-6 sm:h-6 text-sky-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Centro de Custo</h1>
              <p className="text-sm sm:text-base text-gray-600">Organize custos por centros de responsabilidade</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TabSelector
              tabs={tabs}
              activeTab={activeTab}
              onChange={setActiveTab}
            />
            <Button onClick={() => handleCreateCostCenter()} size="sm">
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Novo Centro de Custo
            </Button>
          </div>
        </div>

        {/* Content based on active tab */}
        <div className="px-1 sm:px-0">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" />
            </div>
          ) : (
            <>
              {activeTab === 'hierarchy' && (
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

              {activeTab === 'table' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">Centros de Custo Cadastrados</CardTitle>
                  </CardHeader>
                  <CardContent className="py-0 px-1 sm:px-6">
                    <div className="w-full overflow-x-auto">
                      <table className="w-full min-w-[900px]">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 min-w-[120px]">Nome</th>
                            <th className="text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 min-w-[80px]">Tipo</th>
                            <th className="text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 min-w-[80px]">Código</th>
                            <th className="text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 min-w-[100px]">Código Contábil</th>
                            <th className="text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 min-w-[80px]">Status</th>
                            <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 min-w-[100px]">Centro Pai</th>
                            <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 min-w-[150px]">Descrição</th>
                            <th className="text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 min-w-[80px]">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedCostCenters.map((costCenter) => (
                            <tr key={costCenter.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-2 sm:py-3 px-2 sm:px-4">
                                <div>
                                  <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{costCenter.title}</p>
                                </div>
                              </td>
                              <td className="py-2 sm:py-3 px-2 sm:px-4 text-center">
                                <span className={`inline-flex px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-medium rounded-full ${getTypeColor(costCenter.type)}`}>
                                  {getTypeLabel(costCenter.type)}
                                </span>
                              </td>
                              <td className="py-2 sm:py-3 px-2 sm:px-4 text-center text-xs sm:text-sm text-gray-600">
                                {costCenter.code || '-'}
                              </td>
                              <td className="py-2 sm:py-3 px-2 sm:px-4 text-center text-xs sm:text-sm text-gray-600">
                                {costCenter.accounting_code || '-'}
                              </td>
                              <td className="py-2 sm:py-3 px-2 sm:px-4 text-center">
                                <span className={`inline-flex px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-medium rounded-full ${getStatusColor(costCenter.status)}`}>
                                  {getStatusLabel(costCenter.status)}
                                </span>
                              </td>
                              <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-gray-600">
                                {costCenter.parent_name || '-'}
                              </td>
                              <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-gray-600">
                                {costCenter.description || '-'}
                              </td>
                              <td className="py-2 sm:py-3 px-2 sm:px-4">
                                <div className="flex justify-center space-x-1 sm:space-x-2">
                                  <button
                                    onClick={() => handleEditCostCenter(costCenter)}
                                    className="p-0.5 sm:p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                    title="Editar"
                                  >
                                    <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCostCenter(costCenter.id)}
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
                      
                      {sortedCostCenters.length === 0 && (
                        <div className="text-center py-6 sm:py-8 text-gray-500 px-4">
                          <Target className="w-8 h-8 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
                          <p className="text-base sm:text-lg font-medium">Nenhum centro de custo encontrado</p>
                          <p className="text-xs sm:text-sm">Comece criando seu primeiro centro de custo</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
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
        type: 'expense',
        code: '',
        parent_id: parentCostCenterId,
        accounting_code: '',
        status: 'active',
        description: '',
      });
    } else {
      setFormData({
        title: '',
        type: 'expense',
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
        type: formData.type,
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

  const typeFormOptions = [
    { value: 'revenue', label: 'Receita' },
    { value: 'expense', label: 'Despesa' },
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
              Status
            </label>
            <Dropdown
              options={statusFormOptions}
              value={formData.status}
              onChange={(value) => handleInputChange('status', value)}
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

          <div className="md:col-span-2">
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

          <ColorPicker
            label="Cor do centro de custo"
            value={formData.color}
            onChange={(value) => handleInputChange('color', value)}
          />

          <IconPicker
            label="Ícone do centro de custo"
            value={formData.icon}
            onChange={(value) => handleInputChange('icon', value)}
          />
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