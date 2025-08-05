import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { useOnboarding } from '../../context/OnboardingContext';

export function Step1Welcome() {
  const { nextStep } = useOnboarding();

  return (
    <div className="text-center space-y-8">
      <div className="space-y-4">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900">
          Bem-vindo ao FinanceApp
        </h1>
        
        <p className="text-lg text-gray-600 max-w-md mx-auto leading-relaxed">
          Vamos criar seu primeiro espaço financeiro para você começar a organizar suas finanças de forma inteligente.
        </p>
      </div>

      <div className="bg-blue-50 rounded-xl p-6 max-w-sm mx-auto">
        <h3 className="font-semibold text-blue-900 mb-2">O que você vai conseguir:</h3>
        <ul className="text-sm text-blue-800 space-y-1 text-left">
          <li>• Controlar receitas e despesas</li>
          <li>• Acompanhar suas metas financeiras</li>
          <li>• Visualizar relatórios detalhados</li>
          <li>• Organizar por categorias</li>
        </ul>
      </div>

      <Button 
        onClick={nextStep}
        size="lg"
        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
      >
        Começar
        <ArrowRight className="w-5 h-5 ml-2" />
      </Button>
    </div>
  );
}