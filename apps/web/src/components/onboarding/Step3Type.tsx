import React from 'react';
import { User, Users, Building2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { useOnboarding } from '../../context/OnboardingContext';

const typeOptions = [
  {
    value: 'personal' as const,
    label: 'Pessoal',
    description: 'Para suas finanças individuais',
    icon: User,
    color: 'from-green-500 to-emerald-600'
  },
  {
    value: 'family' as const,
    label: 'Familiar',
    description: 'Para o orçamento da família',
    icon: Users,
    color: 'from-blue-500 to-cyan-600'
  },
  {
    value: 'company' as const,
    label: 'Empresa',
    description: 'Para finanças empresariais',
    icon: Building2,
    color: 'from-purple-500 to-violet-600'
  }
];

export function Step3Type() {
  const { data, updateData, nextStep, prevStep } = useOnboarding();

  const handleSelect = (type: 'personal' | 'family' | 'company') => {
    updateData({ context_type: type });
    nextStep();
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-text-primary">
          Você está criando esse espaço para quem?
        </h2>
        <p className="text-text-secondary">
          Isso nos ajuda a personalizar sua experiência
        </p>
      </div>

      <div className="grid gap-4 max-w-lg mx-auto">
        {typeOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = data.context_type === option.value;
          
          return (
            <button
              key={option.value}
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