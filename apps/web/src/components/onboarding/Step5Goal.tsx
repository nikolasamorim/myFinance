import React from 'react';
import { Target, TrendingDown, Calendar, BarChart3 } from 'lucide-react';
import { Button } from '../ui/Button';
import { useOnboarding } from '../../context/OnboardingContext';

const goalOptions = [
  {
    value: 'Controlar gastos',
    label: 'Controlar gastos',
    description: 'Acompanhar onde seu dinheiro está sendo gasto',
    icon: TrendingDown,
    color: 'from-red-500 to-pink-600'
  },
  {
    value: 'Sair das dívidas',
    label: 'Sair das dívidas',
    description: 'Organizar e quitar suas dívidas pendentes',
    icon: Target,
    color: 'from-orange-500 to-red-600'
  },
  {
    value: 'Planejar melhor',
    label: 'Planejar melhor',
    description: 'Criar um planejamento financeiro eficiente',
    icon: Calendar,
    color: 'from-blue-500 to-indigo-600'
  },
  {
    value: 'Acompanhar entradas e saídas',
    label: 'Acompanhar fluxo',
    description: 'Monitorar todas as entradas e saídas de dinheiro',
    icon: BarChart3,
    color: 'from-green-500 to-emerald-600'
  }
];

export function Step5Goal() {
  const { data, updateData, nextStep, prevStep } = useOnboarding();

  const handleSelect = (goal: string) => {
    updateData({ main_goal: goal });
    nextStep();
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-text-primary">
          Qual seu objetivo principal agora?
        </h2>
        <p className="text-text-secondary">
          Isso nos ajuda a configurar seu workspace da melhor forma
        </p>
      </div>

      <div className="grid gap-4 max-w-lg mx-auto">
        {goalOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = data.main_goal === option.value;
          
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