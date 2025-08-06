import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, BarChart3, Grid3X3, Table, Plus, Edit2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Dropdown } from '../ui/Dropdown';
import { useVisualizations, useCreateVisualization, useUpdateVisualization, useSetDefaultVisualization } from '../../hooks/useVisualizations';
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

export function ViewSelector({ screenContext, currentVisualization, onVisualizationChange }: ViewSelectorProps) {
  const { currentWorkspace } = useWorkspace();
  const { data: visualizations = [], refetch } = useVisualizations(screenContext);
  const createVisualization = useCreateVisualization();
  const updateVisualization = useUpdateVisualization();
  const setDefaultVisualization = useSetDefaultVisualization();

  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newVisualizationName, setNewVisualizationName] = useState('');
  const [selectedType, setSelectedType] = useState<'cards' | 'graph' | 'table'>('cards');

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsEditing(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleVisualizationSelect = async (visualization: Visualization) => {
    onVisualizationChange(visualization);
    
    // Set as default if not already
    if (!visualization.visualization_is_default) {
      try {
        await setDefaultVisualization.mutateAsync({
          screenContext,
          visualizationId: visualization.visualization_id,
        });
        refetch();
      } catch (error) {
        console.error('Error setting default visualization:', error);
      }
    }
    
    setIsOpen(false);
  };

  const handleStartEditing = () => {
    if (!currentVisualization) return;
    setEditingName(currentVisualization.visualization_name);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!currentVisualization || !editingName.trim()) return;

    try {
      const updated = await updateVisualization.mutateAsync({
        id: currentVisualization.visualization_id,
        updates: { visualization_name: editingName.trim() },
      });
      onVisualizationChange(updated);
      setIsEditing(false);
      refetch();
    } catch (error) {
      console.error('Error updating visualization name:', error);
    }
  };

  const handleCreateVisualization = async () => {
    if (!currentWorkspace || !newVisualizationName.trim()) return;

    try {
      const newVisualization = await createVisualization.mutateAsync({
        visualization_workspace_id: currentWorkspace.workspace_id,
        visualization_name: newVisualizationName.trim(),
        visualization_type: selectedType,
        visualization_screen_context: screenContext,
        visualization_config: {},
        visualization_is_default: true, // New visualizations become default
      });

      onVisualizationChange(newVisualization);
      setShowCreateModal(false);
      setNewVisualizationName('');
      setSelectedType('cards');
      refetch();
    } catch (error) {
      console.error('Error creating visualization:', error);
    }
  };

  const CurrentIcon = currentVisualization ? getVisualizationIcon(currentVisualization.visualization_type) : Grid3X3;

  const typeOptions = visualizationTypes.map(type => ({
    value: type.value,
    label: type.label,
  }));

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 min-w-32"
        >
          <CurrentIcon className="w-3.5 h-3.5" />
          <span className="truncate">
            {currentVisualization?.visualization_name || 'Carregando...'}
          </span>
          <ChevronDown className={cn(
            'w-3.5 h-3.5 transition-transform',
            isOpen && 'rotate-180'
          )} />
        </Button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
            <div className="p-3 border-b border-gray-100">
              {isEditing ? (
                <div className="flex items-center space-x-2">
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit();
                      if (e.key === 'Escape') setIsEditing(false);
                    }}
                    className="flex-1 text-sm"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveEdit}
                    disabled={!editingName.trim()}
                  >
                    Salvar
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CurrentIcon className="w-4 h-4 text-gray-600" />
                    <span className="font-medium text-sm">
                      {currentVisualization?.visualization_name}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleStartEditing}
                    className="p-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>

            <div className="py-1 max-h-48 overflow-y-auto">
              {visualizations.map((visualization) => {
                const Icon = getVisualizationIcon(visualization.visualization_type);
                const isActive = currentVisualization?.visualization_id === visualization.visualization_id;
                
                return (
                  <button
                    key={visualization.visualization_id}
                    onClick={() => handleVisualizationSelect(visualization)}
                    className={cn(
                      'w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-50 transition-colors',
                      isActive && 'bg-blue-50 text-blue-700'
                    )}
                  >
                    <Icon className="w-4 h-4 text-gray-500" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {visualization.visualization_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {visualizationTypes.find(t => t.value === visualization.visualization_type)?.label}
                      </div>
                    </div>
                    {isActive && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>

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
        )}
      </div>

      {/* Create Visualization Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nova Visualização"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Nome da visualização"
            value={newVisualizationName}
            onChange={(e) => setNewVisualizationName(e.target.value)}
            placeholder="Ex: Resumo mensal detalhado"
          />

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Tipo de visualização
            </label>
            <Dropdown
              options={typeOptions}
              value={selectedType}
              onChange={(value) => setSelectedType(value as any)}
              placeholder="Selecione o tipo"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateVisualization}
              disabled={!newVisualizationName.trim()}
              loading={createVisualization.isPending}
            >
              Salvar e aplicar
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}