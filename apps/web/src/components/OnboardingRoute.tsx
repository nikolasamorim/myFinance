import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface OnboardingRouteProps {
  children: React.ReactNode;
}

export function OnboardingRoute({ children }: OnboardingRouteProps) {
  const { shouldRedirectToDashboard } = useAuth();
  const location = useLocation();

  console.log('=== OnboardingRoute ===');
  console.log('Current path:', location.pathname);
  console.log('Should redirect to dashboard:', shouldRedirectToDashboard);

  // Se o usuário já tem workspaces e está tentando acessar o dashboard, permitir
  if (shouldRedirectToDashboard && location.pathname === '/dashboard') {
    console.log('OnboardingRoute: User has workspaces, allowing dashboard access');
    return <>{children}</>;
  }

  // Se o usuário já tem workspaces mas não está no dashboard, redirecionar
  if (shouldRedirectToDashboard && location.pathname !== '/dashboard') {
    console.log('OnboardingRoute: User has workspaces, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  // Se o usuário não tem workspaces, mostrar o conteúdo (onboarding)
  console.log('OnboardingRoute: User needs onboarding, showing content');
  return <>{children}</>;
}