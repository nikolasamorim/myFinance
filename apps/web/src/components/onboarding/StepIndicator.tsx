import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center space-x-2 mb-8">
      {Array.from({ length: totalSteps }, (_, i) => {
        const stepNumber = i + 1;
        const isCompleted = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;
        
        return (
          <div
            key={stepNumber}
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all',
              isCompleted && 'bg-green-500 text-white',
              isCurrent && 'bg-blue-500 text-white',
              !isCompleted && !isCurrent && 'bg-bg-elevated text-text-muted'
            )}
          >
            {isCompleted ? (
              <Check className="w-4 h-4" />
            ) : (
              stepNumber
            )}
          </div>
        );
      })}
    </div>
  );
}