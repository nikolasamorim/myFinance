import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, BarChart3, Grid3X3, Table, Plus, Edit2, Trash2, Check } from 'lucide-react';
import { useFloating, autoUpdate, offset, flip, shift, useClick, useDismiss, useInteractions, FloatingPortal } from '@floating-ui/react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Dropdown } from '../ui/Dropdown';
import { useVisualizations, useCreateVisualization, useUpdateVisualization, useDeleteVisualization, useSetDefaultVisualization } from '../../hooks/useVisualizations';
import { useWorkspace } from '../../context/WorkspaceContext';
import { cn } from '../../lib/utils';
import type { Visualization } from '../../types';

interface ViewSelectorProps {
  screenContext: string;
  currentVisualization: Visualization | null;
  onVisualizationChange: (visualization: Visualization) => void;
}

const visualizationTypes = [
  { value: 'cards', label: 'Cards', icon: Grid3X3 },
  { value: 'graph', label: 'Gráfico', icon: BarChart3 },
  { value: 'table', label: 'Tabela', icon: Table },
];

const getVisualizationIcon = (type: string) => {
  const vizType = visualizationTypes.find(t => t.value === type);
  return vizType ? vizType.icon : Grid3X3;
};

interface ViewDropdownItemProps {
  visualization: Visualization;
  isActive: boolean;
  onSelect: (visualization: Visualization) => void;
  onEdit: (visualization: Visualization) => void;
  onDelete: (visualization: Visualization) => void;
}

function ViewDropdownItem({ visualization, isActive, onSelect, onEdit, onDelete }: ViewDropdownItemProps) {
  const Icon = getVisualizationIcon(visualization.visualization_type);
  
  return (
    <div className={cn(
      'group flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors',
      isActive && 'bg-blue-50'
    )}>
      <button
        onClick={() => onSelect(visualization)}
        className="flex items-center space-x-3 flex-1 text-left"
      >
        <Icon className={cn(
          'w-4 h-4',
          isActive ? 'text-blue-600' : 'text-gray-500'
        )} />
        <div className="flex-1 min-w-0">
          <div className={cn(
            'text-sm font-medium truncate',
            isActive ? 'text-blue-700' : 'text-gray-900'
          )}>
            {visualization.visualization_name}
          </div>
          <div className="text-xs text-gray-500">
            {visualizationTypes.find(t => t.value === visualization.visualization_type)?.label}
          </div>
        </div>
        {isActive && (
          <div className="flex items-center space-x-1">
            <Check className="w-3 h-3 text-blue-600" />
            <span className="text-xs text-blue-600 font-medium">Atual</span>
          </div>
        )}
      </button>
      
      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(visualization);
          }}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          title="Editar"
        >
          <Edit2 className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(visualization);
          }}
          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
          title="Excluir"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

interface NewVisualizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, type: 'cards' | 'graph' | 'table') => void;
  isLoading: boolean;
}

function NewVisualizationModal({ isOpen, onClose, onSave, isLoading }: NewVisualizationModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'cards' | 'graph' | 'table'>('cards');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim(), type);
    }
  };

  const handleClose = () => {
    setName('');
    setType('cards');
    onClose();
  };

  const typeOptions = visualizationTypes.map(t => ({
    value: t.value,
    label: t.label,
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Nova Visualização"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nome da visualização"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Resumo mensal detalhado"
          autoFocus
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo de visualização
          </label>
          <Dropdown
            options={typeOptions}
            value={type}
            onChange={(value) => setType(value as any)}
            placeholder="Selecione o tipo"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={!name.trim() || isLoading}
            loading={isLoading}
          >
            Criar visualização
          </Button>
        </div>
      </form>
    </Modal>
  );
}

interface EditVisualizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  visualization: Visualization | null;
  isLoading: boolean;
}

function EditVisualizationModal({ isOpen, onClose, onSave, visualization, isLoading }: EditVisualizationModalProps) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (visualization) {
      setName(visualization.visualization_name);
    }
  }, [visualization]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim());
    }
  };

  const handleClose = () => {
    setName('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Editar Visualização"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nome da visualização"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Digite o nome da visualização"
          autoFocus
        />

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={!name.trim() || isLoading}
            loading={isLoading}
          >
            Salvar alterações
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function ViewSelector({ screenContext, currentVisualization, onVisualizationChange }: ViewSelectorProps) {
  const { currentWorkspace } = useWorkspace();
  const { data: visualizations = [], refetch } = useVisualizations(screenContext);
  const createVisualization = useCreateVisualization();
  const updateVisualization = useUpdateVisualization();
  const deleteVisualization = useDeleteVisualization();
  const setDefaultVisualization = useSetDefaultVisualization();

  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingVisualization, setEditingVisualization] = useState<Visualization | null>(null);

  // Floating UI setup
  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [
      offset(4),
      flip(),
      shift({ padding: 8 })
    ],
    placement: 'bottom-start',
    whileElementsMounted: autoUpdate,
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss]);

  const handleVisualizationSelect = async (visualization: Visualization) => {
    try {
      // Set as current visualization
      onVisualizationChange(visualization);
      
      // Set as default if not already
      if (!visualization.visualization_is_default) {
        await setDefaultVisualization.mutateAsync({
          screenContext,
          visualizationId: visualization.visualization_id,
        });
      }
      
      setIsOpen(false);
    } catch (error) {
      console.error('Error selecting visualization:', error);
    }
  };

  const handleCreateVisualization = async (name: string, type: 'cards' | 'graph' | 'table') => {
    if (!currentWorkspace) return;

    try {
      const newVisualization = await createVisualization.mutateAsync({
        visualization_workspace_id: currentWorkspace.workspace_id,
        visualization_name: name,
        visualization_type: type,
        visualization_screen_context: screenContext,
        visualization_config: {},
        visualization_is_default: false, // Create as non-default first
      });

      // Set as default after creation to avoid constraint violation
      await setDefaultVisualization.mutateAsync({
        screenContext,
        visualizationId: newVisualization.visualization_id,
      });

      onVisualizationChange(newVisualization);
      setShowCreateModal(false);
      setIsOpen(false);
      
      // Refetch to ensure we have the latest data
      await refetch();
    } catch (error) {
      console.error('Error creating visualization:', error);
    }
  };

  const handleEditVisualization = (visualization: Visualization) => {
    setEditingVisualization(visualization);
    setShowEditModal(true);
    setIsOpen(false);
  };

  const handleSaveEdit = async (name: string) => {
    if (!editingVisualization) return;

    try {
      const updated = await updateVisualization.mutateAsync({
        id: editingVisualization.visualization_id,
        updates: { visualization_name: name },
      });

      // Update current visualization if it's the one being edited
      if (currentVisualization?.visualization_id === editingVisualization.visualization_id) {
        onVisualizationChange(updated);
      }

      setShowEditModal(false);
      setEditingVisualization(null);
      
      // Refetch to ensure we have the latest data
      await refetch();
    } catch (error) {
      console.error('Error updating visualization:', error);
    }
  };

  const handleDeleteVisualization = async (visualization: Visualization) => {
    const confirmDelete = window.confirm(
      `Tem certeza que deseja excluir a visualização "${visualization.visualization_name}"?`
    );

    if (!confirmDelete) return;

    try {
      await deleteVisualization.mutateAsync(visualization.visualization_id);

      // If we're deleting the current visualization, switch to the first available one
      if (currentVisualization?.visualization_id === visualization.visualization_id) {
        const remainingVisualizations = visualizations.filter(
          v => v.visualization_id !== visualization.visualization_id
        );
        
        if (remainingVisualizations.length > 0) {
          onVisualizationChange(remainingVisualizations[0]);
        }
      }

      setIsOpen(false);
      
      // Refetch to ensure we have the latest data
      await refetch();
    } catch (error) {
      console.error('Error deleting visualization:', error);
    }
  };

  const CurrentIcon = currentVisualization ? getVisualizationIcon(currentVisualization.visualization_type) : Grid3X3;

  return (
    <>
      {/* Trigger button */}
      <button
        ref={refs.setReference}
        {...getReferenceProps()}
        className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-black focus:border-transparent transition-colors min-w-40"
      >
        <CurrentIcon className="w-3.5 h-3.5 text-gray-600" />
        <span className="truncate flex-1 text-left">
          {currentVisualization?.visualization_name || 'Carregando...'}
        </span>
        <ChevronDown className={cn(
          'w-3.5 h-3.5 text-gray-400 transition-transform',
          isOpen && 'rotate-180'
        )} />
      </button>

      {/* Desktop Dropdown */}
      {isOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-80 max-h-96 overflow-hidden"
          >
            {/* Header */}
            <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
              <h3 className="text-sm font-medium text-gray-900">Visualizações</h3>
            </div>

            {/* Visualizations list */}
            <div className="py-1 max-h-64 overflow-y-auto">
              {visualizations.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-gray-500">
                  Nenhuma visualização encontrada
                </div>
              ) : (
                visualizations.map((visualization) => (
                  <ViewDropdownItem
                    key={visualization.visualization_id}
                    visualization={visualization}
                    isActive={currentVisualization?.visualization_id === visualization.visualization_id}
                    onSelect={handleVisualizationSelect}
                    onEdit={handleEditVisualization}
                    onDelete={handleDeleteVisualization}
                  />
                ))
              )}
            </div>

            {/* Create new button */}
            <div className="border-t border-gray-100 p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowCreateModal(true);
                  setIsOpen(false);
                }}
                className="w-full flex items-center space-x-2 justify-start"
              >
                <Plus className="w-4 h-4" />
                <span>Nova visualização</span>
              </Button>
            </div>
          </div>
        </FloatingPortal>
      )}

      {/* Create Visualization Modal */}
      <NewVisualizationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreateVisualization}
        isLoading={createVisualization.isPending}
      />

      {/* Edit Visualization Modal */}
      <EditVisualizationModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingVisualization(null);
        }}
        onSave={handleSaveEdit}
        visualization={editingVisualization}
        isLoading={updateVisualization.isPending}
      />
    </>
  );
}