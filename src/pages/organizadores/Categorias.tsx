import React, { useState, useMemo } from 'react';
import { Tag, Plus, Filter, Edit, Trash2, Table, TreePine } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Dropdown } from '../../components/ui/Dropdown';
import { Modal } from '../../components/ui/Modal';
import { TabSelector } from '../../components/ui/TabSelector';
import { HierarchyView } from '../../components/hierarchy/HierarchyView';
import { KanbanBoard } from '../../components/ui/KanbanBoard';
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

const typeOptions = [
  { value: 'all', label: 'Todas' },
  { value: 'income', label: 'Receita' },
  { value: 'expense', label: 'Despesa' },
];

export function Categorias() {
  const [activeTab, setActiveTab] = useState('table');
  const [filters, setFilters] = useState<CategoryFilters>({
    type: 'all',
    search: '',
  });

  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [parentCategoryId, setParentCategoryId] = useState<string | undefined>();
  const [showFilters, setShowFilters] = useState(false);

  const { 
    data: categories = [], 
    isLoading, 
    createCategory, 
    updateCategory, 
    deleteCategory,
    updateCategoryOrder,
  } = useCategories(filters);

  const handleFilterChange = (key: keyof CategoryFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleCreateCategory = (parentId?: string) => {
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

  const handleReorderCategories = async (updates: Array<{ id: string; parent_id: string | null; sort_order: number }>) => {
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
    { id: 'table', label: 'Tabela', icon: <Table className="w-4 h-4" /> },
    { id: 'hierarchy', label: 'Hierarquia', icon: <TreePine className="w-4 h-4" /> },
  ];

  const renderCategoryContent = (category: any) => {
    return (
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center space-x-3">
          <div>
            <p className="font-medium text-gray-900">{category.category_name}</p>
            {category.description && (
              <p className="text-sm text-gray-500">{category.description}</p>
            )}
          </div>
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(category.category_type)}`}>
            {getTypeLabel(category.category_type)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="space-y-4 sm:space-y-6 w-full min-w-0 overflow-x-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 px-1 sm:px-0">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="p-1.5 sm:p-2 bg-yellow-100 rounded-lg flex-shrink-0">
              <Tag className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Categorias</h1>
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3 flex-wrap gap-2">
            <TabSelector
              tabs={tabs}
              activeTab={activeTab}
              onChange={setActiveTab}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Filtros
            </Button>
            <Button onClick={() => handleCreateCategory()} size="sm">
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Nova Categoria
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
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Tipo</label>
                    <Dropdown
                      options={typeOptions}
                      value={filters.type}
                      onChange={(value) => handleFilterChange('type', value)}
                    />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-1">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Buscar</label>
                    <Input
                      placeholder="Buscar categorias..."
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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600" />
            </div>
          ) : (
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
      setFormData({
        title: '',
        type: (typeof parentCategoryId === 'string' && (parentCategoryId === 'expense' || parentCategoryId === 'income') ? parentCategoryId : 'expense') as 'income' | 'expense',
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
  }, [category, parentCategoryId]);

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