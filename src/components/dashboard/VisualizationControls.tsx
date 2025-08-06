import React, { useState } from 'react';
import { Settings, BarChart3, Grid3X3, Table, Star, Plus, Check } from 'lucide-react';
import { Button } from '../ui/Button';
import { Dropdown } from '../ui/Dropdown';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { useVisualizations, useCreateVisualization, useSetDefaultVisualization } from '../../hooks/useVisualizations';
import { useWorkspace } from '../../context/WorkspaceContext';
import type { Visualization } from '../../types';

interface VisualizationControlsProps {
  screenContext: string;
  currentVisualization: Visualization | null;
  onVisualizationChange: (visualization: Visualization | null) => void;
}

const visualizationTypes = [
  { value: 'graph', label: 'Gráfico', icon: <BarChart3 className="w-4 h-4" /> },
  { value: 'cards', label: 'Cards', icon: <Grid3X3 className="w-4 h-4" /> },
  { value: 'table', label: 'Tabela', icon: <Table className="w-4 h-4" /> },
];

export function VisualizationControls({ 
  screenContext, 
  currentVisualization, 
  onVisualizationChange 
}: VisualizationControlsProps) {
  const { currentWorkspace } = useWorkspace();
  const { data: visualizations = [] } = useVisualizations(screenContext);
  const createVisualization = useCreateVisualization();
  const setDefaultVisualization = useSetDefaultVisualization();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newVisualizationName, setNewVisualizationName] = useState('');
  const [selectedType, setSelectedType] = useState<'graph' | 'cards' | 'table'>('cards');

  const handleTypeChange = (type: string) => {
    // Create a temporary visualization for immediate preview
    const tempVisualization: Visualization = {
      visualization_id: 'temp',
      visualization_workspace_id: currentWorkspace?.workspace_id || '',
      visualization_user_id: '',
      visualization_name: `Visualização ${visualizationTypes.find(t => t.value === type)?.label}`,
      visualization_type: type as 'graph' | 'cards' | 'table',
      visualization_screen_context: screenContext,
      visualization_config: {},
      visualization_is_default: false,
      visualization_created_at: new Date().toISOString(),
      visualization_updated_at: new Date().toISOString(),
    };
    
    onVisualizationChange(tempVisualization);
  };

  const handleVisualizationSelect = (visualizationId: string) => {
    if (visualizationId === 'new') {
      setShowCreateModal(true);
      return;
    }

    const visualization = visualizations.find(v => v.visualization_id === visualizationId);
    onVisualizationChange(visualization || null);
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
        visualization_is_default: false,
      });

      onVisualizationChange(newVisualization);
      setShowCreateModal(false);
      setNewVisualizationName('');
      setSelectedType('cards');
    } catch (error) {
      console.error('Error creating visualization:', error);
    }
  };

  const handleSetDefault = async () => {
    if (!currentVisualization || currentVisualization.visualization_id === 'temp') return;

    try {
      await setDefaultVisualization.mutateAsync({
        screenContext,
        visualizationId: currentVisualization.visualization_id,
      });
    } catch (error) {
      console.error('Error setting default visualization:', error);
    }
  };

  const visualizationOptions = [
    ...visualizations.map(v => ({
      value: v.visualization_id,
      label: v.visualization_name,
      icon: visualizationTypes.find(t => t.value === v.visualization_type)?.icon,
    })),
    {
      value: 'new',
      label: 'Nova visualização...',
      icon: <Plus className="w-4 h-4" />,
    },
  ];

  return (
    <>
      <div className="flex items-center space-x-2">
        {/* Quick Type Selector */}
        <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
          {visualizationTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => handleTypeChange(type.value)}
              className={`p-1.5 rounded transition-colors ${
                currentVisualization?.visualization_type === type.value
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title={type.label}
            >
              {type.icon}
            </button>
          ))}
        </div>

        {/* Visualization Selector */}
        <div className="w-48">
          <Dropdown
            options={visualizationOptions}
            value={currentVisualization?.visualization_id || ''}
            onChange={handleVisualizationSelect}
            placeholder="Selecionar visualização"
          />
        </div>

        {/* Set as Default */}
        {currentVisualization && currentVisualization.visualization_id !== 'temp' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSetDefault}
            disabled={currentVisualization.visualization_is_default}
            title={currentVisualization.visualization_is_default ? 'Já é padrão' : 'Definir como padrão'}
          >
            {currentVisualization.visualization_is_default ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <Star className="w-4 h-4" />
            )}
          </Button>
        )}
      </div>

      {/* Create Visualization Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nova Visualização"
      >
        <div className="space-y-4">
          <Input
            label="Nome da visualização"
            value={newVisualizationName}
            onChange={(e) => setNewVisualizationName(e.target.value)}
            placeholder="Ex: Minha visualização personalizada"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de visualização
            </label>
            <div className="grid grid-cols-3 gap-2">
              {visualizationTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setSelectedType(type.value as any)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedType === type.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-center space-y-1">
                    {type.icon}
                    <span className="text-xs font-medium">{type.label}</span>
                  </div>
                </button>
              ))}
            </div>
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
              Criar
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}