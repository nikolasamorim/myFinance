import React from 'react';
import { OnboardingProvider, useOnboarding } from '../context/OnboardingContext';
import { StepIndicator } from '../components/onboarding/StepIndicator';
import { Step1Welcome } from '../components/onboarding/Step1Welcome';
import { Step2Name } from '../components/onboarding/Step2Name';
import { Step3Type } from '../components/onboarding/Step3Type';
import { Step4Sharing } from '../components/onboarding/Step4Sharing';
import { Step5Goal } from '../components/onboarding/Step5Goal';
import { Step6Review } from '../components/onboarding/Step6Review';

function OnboardingContent() {
  const { currentStep } = useOnboarding();

  const renderStep = () => {
    switch (currentStep) {
      case 1: return <Step1Welcome />;
      case 2: return <Step2Name />;
      case 3: return <Step3Type />;
      case 4: return <Step4Sharing />;
      case 5: return <Step5Goal />;
      case 6: return <Step6Review />;
      default: return <Step1Welcome />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <StepIndicator currentStep={currentStep} totalSteps={6} />
          
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
            {renderStep()}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Onboarding() {
  return (
    <OnboardingProvider>
      <OnboardingContent />
    </OnboardingProvider>
  );
}