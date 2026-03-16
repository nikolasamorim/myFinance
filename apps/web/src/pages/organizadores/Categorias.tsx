import React, { useState } from 'react';
import { Tag, Plus, Edit, Trash2, Table, TreePine } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Dropdown } from '../../components/ui/Dropdown';
import { Modal } from '../../components/ui/Modal';
import { TabSelector } from '../../components/ui/TabSelector';
import { KanbanBoard } from '../../components/kanban/KanbanBoard';
import { ColorPicker } from '../../components/ui/ColorPicker';
import { IconPicker } from '../../components/ui/IconPicker';
import { BreadcrumbBar } from '../../components/ui/BreadcrumbBar';
import { VisualizationToolbar } from '../../components/ui/VisualizationToolbar';
import { FiltersPanel } from '../../components/ui/FiltersPanel';
import { SortPanel } from '../../components/ui/SortPanel';
import type { FilterField } from '../../components/ui/FiltersPanel';
import type { SortOption } from '../../components/ui/SortPanel';
import { useCategories } from '../../hooks/useCategories';
import { cn } from '../../lib/utils';
import type { CategoryData } from '../../services/category.service';

interface CategoryFilters {
  type: string;
  search: string;
}

interface CategoryFormData {
  title: string;
  type: 'income' | 'expense';
  parent_id: string;
  description: string;
}

const DEFAULT_FILTERS: CategoryFilters = {
  type: 'all',
  search: '',
};

const typeOptions = [
  { value: 'all', label: 'Todas' },
  { value: 'income', label: 'Receita' },
  { value: 'expense', label: 'Despesa' },
];

const filterFields: FilterField[] = [
  { key: 'type', label: 'Tipo', type: 'dropdown', options: typeOptions },
  { key: 'search', label: 'Buscar', type: 'text', placeholder: 'Buscar categorias...' },
];

const sortOptions: SortOption[] = [
  { value: 'name_asc', label: 'Nome (A-Z)' },
  { value: 'name_desc', label: 'Nome (Z-A)' },
  { value: 'type_income', label: 'Tipo (Receita primeiro)' },
  { value: 'type_expense', label: 'Tipo (Despesa primeiro)' },
];

export function Categorias() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('hierarchy');
  const [filters, setFilters] = useState<CategoryFilters>({ ...DEFAULT_FILTERS });
  const [sortBy, setSortBy] = useState<string>('name_asc');
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [parentCategoryId, setParentCategoryId] = useState<string | undefined>();
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);

  const {
    data: categories = [],
    isLoading,
    createCategory,
    updateCategory,
    deleteCategory,
    updateCategoryOrder,
  } = useCategories(filters);

  const hasActiveFilters = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);

  const sortedCategories = [...categories].sort((a, b) => {
    switch (sortBy) {
      case 'name_asc':
        return a.category_name.localeCompare(b.category_name);
      case 'name_desc':
        return b.category_name.localeCompare(a.category_name);
      case 'type_income':
        return a.category_type === 'income' ? -1 : b.category_type === 'income' ? 1 : 0;
      case 'type_expense':
        return a.category_type === 'expense' ? -1 : b.category_type === 'expense' ? 1 : 0;
      default:
        return 0;
    }
  });

  const handleApplyFilters = (newFilters: Record<string, string>) => {
    setFilters(newFilters as unknown as CategoryFilters);
  };

  const handleApplySort = (newSort: string) => {
    setSortBy(newSort);
  };

  const handleCreateCategory = (parentId?: string, type?: string) => {
    setEditingCategory(null);
    setParentCategoryId(parentId);
    setShowModal(true);
  };

  const handleEditCategory = (category: any) => {
    setEditingCategory(category);
    setParentCategoryId(category.parent_id && category.parent_id !== 'expense' && category.parent_id !== 'income' ? category.parent_id : undefined);
    setShowModal(true);
  };

  const handleDeleteCategory = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta categoria?')) {
      await deleteCategory.mutateAsync(id);
    }
  };

  const handleReorderCategories = async (updates: Array<{ id: string; parent_id: string | null; sort_order: number; type?: string }>) => {
    await updateCategoryOrder.mutateAsync(updates);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'income':
        return 'Receita';
      case 'expense':
        return 'Despesa';
      default:
        return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'income':
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

  const renderCategoryContent = (category: any) => {
    return (
      <div className="flex items-center justify-between w-full">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-text-primary truncate">{category.category_name}</p>
              {category.description && (
                <p className="text-sm text-gray-500 mt-1 truncate">{category.description}</p>
              )}
            </div>
            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(category.category_type)}`}>
              {getTypeLabel(category.category_type)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="space-y-4 sm:space-y-6 w-full min-w-0">
        <div className="flex items-center justify-between px-1 sm:px-0">
          <BreadcrumbBar segments={['Organizadores', 'Categorias']} onBack={() => navigate(-1)} />
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
            <div className="p-1.5 sm:p-2 bg-yellow-100 rounded-lg flex-shrink-0">
              <Tag className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Categorias</h1>
              <p className="text-sm sm:text-base text-gray-600">Organize suas transacoes por categorias</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TabSelector
              tabs={tabs}
              activeTab={activeTab}
              onChange={setActiveTab}
            />
            <Button onClick={() => handleCreateCategory()} size="sm">
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Nova Categoria
            </Button>
          </div>
        </div>

        {/* Content based on active tab */}
        <div className="px-1 sm:px-0">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600" />
            </div>
          ) : (
            <>
              {activeTab === 'hierarchy' && (
                <KanbanBoard
                  items={categories.map(cat => ({
                    id: cat.category_id,
                    title: cat.category_name,
                    type: cat.category_type,
                    parent_id: cat.parent_id,
                    sort_order: cat.sort_order,
                    description: cat.description,
                    ...cat,
                  }))}
                  columns={[
                    { id: 'expense', title: 'Categorias de Despesa', type: 'expense' },
                    { id: 'income', title: 'Categorias de Receita', type: 'income' },
                  ]}
                  onEdit={handleEditCategory}
                  onDelete={(id) => handleDeleteCategory(id)}
                  onCreate={handleCreateCategory}
                  onReorder={handleReorderCategories}
                  renderItemContent={renderCategoryContent}
                />
              )}

              {activeTab === 'table' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">Categorias Cadastradas</CardTitle>
                  </CardHeader>
                  <CardContent className="py-0 px-1 sm:px-6">
                    <div className="w-full overflow-x-auto">
                      <table className="w-full min-w-[700px]">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 min-w-[120px]">Nome</th>
                            <th className="text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 min-w-[80px]">Tipo</th>
                            <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 min-w-[100px]">Categoria Pai</th>
                            <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 min-w-[150px]">Descrição</th>
                            <th className="text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 min-w-[80px]">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedCategories.map((category) => (
                            <tr key={category.category_id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-2 sm:py-3 px-2 sm:px-4">
                                <div>
                                  <p className="text-xs sm:text-sm font-medium text-text-primary truncate">{category.category_name}</p>
                                </div>
                              </td>
                              <td className="py-2 sm:py-3 px-2 sm:px-4 text-center">
                                <span className={`inline-flex px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-medium rounded-full ${getTypeColor(category.category_type)}`}>
                                  {getTypeLabel(category.category_type)}
                                </span>
                              </td>
                              <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-gray-600">
                                {category.parent_name || '-'}
                              </td>
                              <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-gray-600">
                                {category.description || '-'}
                              </td>
                              <td className="py-2 sm:py-3 px-2 sm:px-4">
                                <div className="flex justify-center space-x-1 sm:space-x-2">
                                  <button
                                    onClick={() => handleEditCategory(category)}
                                    className="p-0.5 sm:p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                    title="Editar"
                                  >
                                    <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCategory(category.category_id)}
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
                      
                      {sortedCategories.length === 0 && (
                        <div className="text-center py-6 sm:py-8 text-gray-500 px-4">
                          <Tag className="w-8 h-8 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
                          <p className="text-base sm:text-lg font-medium">Nenhuma categoria encontrada</p>
                          <p className="text-xs sm:text-sm">Comece criando sua primeira categoria</p>
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
      <CategoryModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        category={editingCategory}
        parentCategoryId={parentCategoryId}
        categories={categories}
        onSave={async (data) => {
          if (editingCategory) {
            await updateCategory.mutateAsync({ id: editingCategory.category_id, updates: data });
          } else {
            await createCategory.mutateAsync(data);
          }
          setShowModal(false);
        }}
      />
    </>
  );
}

// Modal Component
interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category?: any;
  parentCategoryId?: string;
  categories: any[];
  onSave: (data: any) => Promise<void>;
}

function CategoryModal({ isOpen, onClose, category, parentCategoryId, categories, onSave }: CategoryModalProps) {
  const [formData, setFormData] = useState<CategoryFormData>({
    title: '',
    type: 'expense',
    parent_id: '',
    description: '',
  });

  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    if (category) {
      setFormData({
        title: category.category_name || '',
        type: category.category_type || 'expense',
        parent_id: category.parent_id || '',
        description: category.description || '',
      });
    } else if (parentCategoryId) {
      // Determine type from parent or use default
      const parentCategory = categories.find(c => c.category_id === parentCategoryId);
      const inferredType = parentCategory?.category_type || 'expense';
      
      setFormData({
        title: '',
        type: inferredType as 'income' | 'expense',
        parent_id: parentCategoryId,
        description: '',
      });
    } else {
      setFormData({
        title: '',
        type: 'expense',
        parent_id: '',
        description: '',
      });
    }
  }, [category, parentCategoryId, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const categoryData: CategoryData = {
        title: formData.title,
        type: formData.type,
        parent_id: formData.parent_id || null,
        description: formData.description,
      };
      await onSave(categoryData);
    } catch (error) {
      console.error('Error saving category:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof CategoryFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const typeFormOptions = [
    { value: 'income', label: 'Receita' },
    { value: 'expense', label: 'Despesa' },
  ];

  // Filter parent categories and exclude current category
  const parentOptions = [
    { value: '', label: 'Nenhuma (categoria raiz)' },
    ...categories
      .filter(cat => cat.category_id !== category?.category_id)
      .filter(cat => cat.category_type === formData.type) // Only show same type as parent options
      .map(cat => ({ value: cat.category_id, label: cat.category_name }))
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={category ? 'Editar Categoria' : 'Nova Categoria'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input
              label="Nome da categoria"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Ex: Alimentação, Salário, Transporte"
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
              Categoria pai
            </label>
            <Dropdown
              options={parentOptions}
              value={formData.parent_id}
              onChange={(value) => handleInputChange('parent_id', value)}
              placeholder="Selecione uma categoria pai"
            />
          </div>

          <ColorPicker
            label="Cor da categoria"
            value={formData.color}
            onChange={(value) => handleInputChange('color', value)}
          />

          <IconPicker
            label="Ícone da categoria"
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
            placeholder="Descrição da categoria..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-yellow-500 focus:border-transparent"
            rows={3}
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={isLoading}>
            {category ? 'Atualizar' : 'Criar'} Categoria
          </Button>
        </div>
      </form>
    </Modal>
  );
}