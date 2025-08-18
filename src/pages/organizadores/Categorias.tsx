import React, { useState, useMemo } from 'react';
import { Tag, Plus, Filter, Edit, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Dropdown } from '../../components/ui/Dropdown';
import { Modal } from '../../components/ui/Modal';
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
}

const typeOptions = [
  { value: 'all', label: 'Todas' },
  { value: 'income', label: 'Receita' },
  { value: 'expense', label: 'Despesa' },
];

export function Categorias() {
  const [filters, setFilters] = useState<CategoryFilters>({
    type: 'all',
    search: '',
  });

  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const { 
    data: categories = [], 
    isLoading, 
    createCategory, 
    updateCategory, 
    deleteCategory 
  } = useCategories(filters);

  // Organize categories hierarchically
  const hierarchicalCategories = useMemo(() => {
    return categories;
  }, [categories]);

  const handleFilterChange = (key: keyof CategoryFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleCreateCategory = () => {
    setEditingCategory(null);
    setShowModal(true);
  };

  const handleEditCategory = (category: any) => {
    setEditingCategory(category);
    setShowModal(true);
  };

  const handleDeleteCategory = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta categoria?')) {
      await deleteCategory.mutateAsync(id);
    }
  };

  const toggleExpanded = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
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

  const renderCategory = (category: any, level: number = 0) => {
    return (
      <tr key={category.category_id} className="border-b border-gray-100 hover:bg-gray-50">
          <td className="py-2 sm:py-3 px-2 sm:px-4">
            <div className="flex items-center">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{category.category_name}</p>
                {category.description && (
                  <p className="text-xs text-gray-500 truncate">{category.description}</p>
                )}
              </div>
            </div>
          </td>
          <td className="py-2 sm:py-3 px-2 sm:px-4 text-center">
            <span className={`inline-flex px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-medium rounded-full ${getTypeColor(category.category_type)}`}>
              {getTypeLabel(category.category_type)}
            </span>
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
          <div className="flex items-center space-x-2 sm:space-x-3 flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Filtros
            </Button>
            <Button onClick={handleCreateCategory} size="sm">
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

        {/* Categories Table */}
        <div className="px-1 sm:px-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Categorias Cadastradas</CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600" />
                </div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 min-w-[200px]">Nome</th>
                        <th className="text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 min-w-[80px]">Tipo</th>
                        <th className="text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 min-w-[80px]">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((category) => renderCategory(category))}
                    </tbody>
                  </table>
                  
                  {categories.length === 0 && (
                    <div className="text-center py-6 sm:py-8 text-gray-500 px-4">
                      <Tag className="w-8 h-8 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
                      <p className="text-base sm:text-lg font-medium">Nenhuma categoria encontrada</p>
                      <p className="text-xs sm:text-sm">Comece criando sua primeira categoria</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <CategoryModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        category={editingCategory}
        categories={categories}
        onSave={async (data) => {
          if (editingCategory) {
            await updateCategory.mutateAsync({ id: editingCategory.id, updates: data });
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
  categories: any[];
  onSave: (data: any) => Promise<void>;
}

function CategoryModal({ isOpen, onClose, category, categories, onSave }: CategoryModalProps) {
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
    } else {
      setFormData({
        title: '',
        type: 'expense',
        parent_id: '',
        description: '',
      });
    }
  }, [category]);

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

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo
            </label>
            <Dropdown
              options={typeFormOptions}
              value={formData.type}
              onChange={(value) => handleInputChange('type', value)}
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