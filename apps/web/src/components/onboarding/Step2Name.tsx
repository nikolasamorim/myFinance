import React, { useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useOnboarding } from '../../context/OnboardingContext';

const suggestions = [
  'Meu Financeiro',
  'Finanças Pessoais',
  'Orçamento Familiar',
  'Controle Financeiro',
  'Minha Empresa',
  'Finanças da Casa'
];

export function Step2Name() {
  const { data, updateData, nextStep, prevStep } = useOnboarding();
  const [name, setName] = useState(data.name);

  const handleNext = () => {
    if (name.trim()) {
      updateData({ name: name.trim() });
      nextStep();
    }
  };

  const handleSuggestion = (suggestion: string) => {
    setName(suggestion);
    updateData({ name: suggestion });
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-text-primary">
          Como você quer chamar seu espaço financeiro?
        </h2>
        <p className="text-text-secondary">
          Escolha um nome que faça sentido para você
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        <Input
          label="Nome do workspace"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Digite o nome do seu workspace"
          className="text-center text-lg"
        />

        <div className="space-y-3">
          <div className="flex items-center justify-center text-sm text-text-muted">
            <Lightbulb className="w-4 h-4 mr-1" />
            Sugestões
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleSuggestion(suggestion)}
                className="p-3 text-sm border border-border rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-text-secondary"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-between max-w-md mx-auto">
        <Button variant="outline" onClick={prevStep}>
          Voltar
        </Button>
        <Button 
          onClick={handleNext}
          disabled={!name.trim()}
        >
          Continuar
        </Button>
      </div>
    </div>
  );
}