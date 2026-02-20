import React, { createContext, useContext, useState } from 'react';

export interface OnboardingData {
  name: string;
  context_type: 'personal' | 'family' | 'company';
  shared: boolean;
  main_goal: string;
}

interface OnboardingContextType {
  data: OnboardingData;
  currentStep: number;
  updateData: (updates: Partial<OnboardingData>) => void;
  nextStep: () => void;
  prevStep: () => void;
  resetOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const initialData: OnboardingData = {
  name: '',
  context_type: 'personal',
  shared: false,
  main_goal: '',
};

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<OnboardingData>(initialData);
  const [currentStep, setCurrentStep] = useState(1);

  const updateData = (updates: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    setCurrentStep(prev => Math.min(prev + 1, 6));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const resetOnboarding = () => {
    setData(initialData);
    setCurrentStep(1);
  };

  return (
    <OnboardingContext.Provider value={{
      data,
      currentStep,
      updateData,
      nextStep,
      prevStep,
      resetOnboarding,
    }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
}