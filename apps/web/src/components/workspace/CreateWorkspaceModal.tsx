import React from 'react';
import { Modal } from '../ui/Modal';
import { OnboardingProvider, useOnboarding } from '../../context/OnboardingContext';
import { StepIndicator } from '../onboarding/StepIndicator';
import { Step1Welcome } from '../onboarding/Step1Welcome';
import { Step2Name } from '../onboarding/Step2Name';
import { Step3Type } from '../onboarding/Step3Type';
import { Step4Sharing } from '../onboarding/Step4Sharing';
import { Step5Goal } from '../onboarding/Step5Goal';
import { Step6Review } from '../onboarding/Step6Review';

function CreateWorkspaceContent() {
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
    <>
      <StepIndicator currentStep={currentStep} totalSteps={6} />
      <div className="mt-4">
        {renderStep()}
      </div>
    </>
  );
}

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateWorkspaceModal({ isOpen, onClose }: CreateWorkspaceModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Criar workspace" size="lg">
      <OnboardingProvider>
        <CreateWorkspaceContent />
      </OnboardingProvider>
    </Modal>
  );
}
