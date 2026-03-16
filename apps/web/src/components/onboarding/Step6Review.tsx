import React, { useState } from 'react';
import { Check, User, Users, Building2, Lock, UserPlus } from 'lucide-react';
import { Button } from '../ui/Button';
import { useOnboarding } from '../../context/OnboardingContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { workspaceService } from '../../services/workspace.service';
import { useNavigate } from 'react-router-dom';

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'personal': return User;
    case 'family': return Users;
    case 'company': return Building2;
    default: return User;
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'personal': return 'Pessoal';
    case 'family': return 'Familiar';
    case 'company': return 'Empresa';
    default: return type;
  }
};

export function Step6Review() {
  const { data, prevStep, resetOnboarding } = useOnboarding();
  const { refetchWorkspaces } = useWorkspace();
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();

  const TypeIcon = getTypeIcon(data.context_type);
  const SharingIcon = data.shared ? UserPlus : Lock;

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      console.log('Creating workspace with data:', data);
      
      await workspaceService.createWorkspace(
        data.name,
        data.context_type,
        data.shared,
        data.main_goal
      );
      
      console.log('Workspace created successfully');
      
      // Refetch workspaces to update the context
      await refetchWorkspaces();
      
      console.log('Workspaces refetched, resetting onboarding');
      resetOnboarding();
      
      // Navigate to dashboard - ProtectedRoute will handle the redirect
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('Error creating workspace:', error);
      alert('Error creating workspace. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl mx-auto flex items-center justify-center">
          <Check className="w-8 h-8 text-white" />
        </div>
        
        <h2 className="text-2xl font-bold text-text-primary">
          Perfeito! Vamos revisar
        </h2>
        <p className="text-text-secondary">
          Confirme as informações do seu workspace antes de criar
        </p>
      </div>

      <div className="max-w-md mx-auto bg-bg-page border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <span className="text-lg">📊</span>
          </div>
          <div>
            <p className="text-sm text-text-muted">Nome</p>
            <p className="font-semibold text-text-primary">{data.name}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <TypeIcon className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-sm text-text-muted">Tipo</p>
            <p className="font-semibold text-text-primary">{getTypeLabel(data.context_type)}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <SharingIcon className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-text-muted">Acesso</p>
            <p className="font-semibold text-text-primary">
              {data.shared ? 'Compartilhado' : 'Apenas você'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <span className="text-lg">🎯</span>
          </div>
          <div>
            <p className="text-sm text-text-muted">Objetivo</p>
            <p className="font-semibold text-text-primary">{data.main_goal}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-between max-w-md mx-auto">
        <Button variant="outline" onClick={prevStep} disabled={isCreating}>
          Voltar
        </Button>
        <Button 
          onClick={handleCreate}
          loading={isCreating}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          {isCreating ? 'Criando...' : 'Criar workspace e começar'}
        </Button>
      </div>
    </div>
  );
}