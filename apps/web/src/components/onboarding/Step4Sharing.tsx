import React from 'react';
import { Lock, UserPlus } from 'lucide-react';
import { Button } from '../ui/Button';
import { useOnboarding } from '../../context/OnboardingContext';

const sharingOptions = [
  {
    value: false,
    label: 'Só eu',
    description: 'Apenas você terá acesso a este workspace',
    icon: Lock,
    color: 'from-gray-500 to-gray-600'
  },
  {
    value: true,
    label: 'Eu e outras pessoas',
    description: 'Você poderá convidar outras pessoas para colaborar',
    icon: UserPlus,
    color: 'from-blue-500 to-purple-600'
  }
];

export function Step4Sharing() {
  const { data, updateData, nextStep, prevStep } = useOnboarding();

  const handleSelect = (shared: boolean) => {
    updateData({ shared });
    nextStep();
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-text-primary">
          Quem vai usar esse espaço?
        </h2>
        <p className="text-text-secondary">
          Defina se outras pessoas poderão acessar este workspace
        </p>
      </div>

      <div className="grid gap-4 max-w-lg mx-auto">
        {sharingOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = data.shared === option.value;
          
          return (
            <button
              key={option.value.toString()}
              onClick={() => handleSelect(option.value)}
              className={`p-6 rounded-xl border-2 transition-all text-left hover:scale-105 ${
                isSelected 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-border hover:border-border'
              }`}
            >
              <div className="flex items-start space-x-4">
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${option.color} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-text-primary mb-1">
                    {option.label}
                  </h3>
                  <p className="text-sm text-text-secondary">
                    {option.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex justify-center">
        <Button variant="outline" onClick={prevStep}>
          Voltar
        </Button>
      </div>
    </div>
  );
}