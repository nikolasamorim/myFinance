import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, BarChart3, Grid3X3, Table, Plus, Edit2, X } from 'lucide-react';
import { useFloating, autoUpdate, offset, flip, shift, useClick, useDismiss, useInteractions } from '@floating-ui/react';
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
  const [isMobile, setIsMobile] = useState(false);

  // Floating UI setup
  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [
      offset(4),
      flip(),
      shift({ padding: 8 })
    ],
    whileElementsMounted: autoUpdate,
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss]);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobile && isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobile, isOpen]);

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
      setIsOpen(false);
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

  // Mobile overlay component
  const MobileOverlay = () => (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 md:hidden">
      <div className="fixed inset-x-0 bottom-0 bg-white rounded-t-xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Visualizações</h3>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(80vh-80px)]">
          {/* Current visualization editing */}
          <div className="p-4 border-b border-gray-100">
            {isEditing ? (
              <div className="space-y-3">
                <Input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit();
                    if (e.key === 'Escape') setIsEditing(false);
                  }}
                  className="text-base"
                  autoFocus
                />
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={handleSaveEdit}
                    disabled={!editingName.trim()}
                    className="flex-1 h-11"
                  >
                    Salvar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 h-11"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <CurrentIcon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {currentVisualization?.visualization_name}
                    </div>
                    <div className="text-sm text-gray-500">Visualização atual</div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleStartEditing}
                  className="h-11 w-11"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Visualizations list */}
          <div className="p-4 space-y-2">
            {visualizations.map((visualization) => {
              const Icon = getVisualizationIcon(visualization.visualization_type);
              const isActive = currentVisualization?.visualization_id === visualization.visualization_id;
              
              return (
                <button
                  key={visualization.visualization_id}
                  onClick={() => handleVisualizationSelect(visualization)}
                  className={cn(
                    'w-full flex items-center space-x-3 p-3 text-left rounded-lg transition-colors h-14',
                    isActive 
                      ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                      : 'hover:bg-gray-50 border border-transparent'
                  )}
                >
                  <div className={cn(
                    'p-2 rounded-lg',
                    isActive ? 'bg-blue-100' : 'bg-gray-100'
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {visualization.visualization_name}
                    </div>
                    <div className="text-sm text-gray-500">
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

          {/* Create new button */}
          <div className="p-4 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(true);
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-center space-x-2 h-11"
            >
              <Plus className="w-4 h-4" />
              <span>Nova visualização</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  // Desktop dropdown component
  const DesktopDropdown = () => (
    <div
      ref={refs.setFloating}
      style={floatingStyles}
      {...getFloatingProps()}
      className="bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-72"
    >
      {/* Current visualization editing */}
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

      {/* Visualizations list */}
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
  );

  return (
    <>
      {/* Trigger button */}
      <button
        ref={refs.setReference}
        {...getReferenceProps()}
        className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-black focus:border-transparent transition-colors min-w-32"
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

      {/* Dropdown/Overlay */}
      {isOpen && (isMobile ? <MobileOverlay /> : <DesktopDropdown />)}

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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {visualizationTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    onClick={() => setSelectedType(type.value as any)}
                    className={cn(
                      'p-3 rounded-lg border-2 transition-all h-16 sm:h-auto',
                      selectedType === type.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <div className="flex flex-col items-center space-y-1">
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-medium">{type.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(false)}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateVisualization}
              disabled={!newVisualizationName.trim()}
              loading={createVisualization.isPending}
              className="w-full sm:w-auto"
            >
              Salvar e aplicar
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}