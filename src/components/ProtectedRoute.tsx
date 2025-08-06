import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useOnboarding } from '../context/OnboardingContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading: authLoading, checkWorkspaces } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { resetOnboarding } = useOnboarding();
  const location = useLocation();

  // Always call useEffect before any conditional returns
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      console.log('🏢 ProtectedRoute: Checking workspaces for authenticated user');
      
      checkWorkspaces().catch((error) => {
        console.error('❌ ProtectedRoute: Error checking workspaces:', error);
      });
    }
  }, [isAuthenticated, authLoading, checkWorkspaces]);

  console.log('🛡️ ProtectedRoute: Current path:', location.pathname);
  console.log('🛡️ ProtectedRoute: Is authenticated:', isAuthenticated);
  console.log('🛡️ ProtectedRoute: Auth loading:', authLoading);

  // Show loading while auth state is being determined
  if (authLoading) {
    console.log('⏳ ProtectedRoute: Auth loading, showing spinner');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Now safe to return early after all hooks are called
  if (!isAuthenticated) {
    console.log('🚫 ProtectedRoute: User not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Check if user has workspaces
  const hasWorkspaces = currentWorkspace !== null;

  // Redirect logic based on workspaces
  if (!hasWorkspaces && location.pathname !== '/onboarding') {
    console.log('🎯 ProtectedRoute: No workspaces, redirecting to onboarding');
    return <Navigate to="/onboarding" replace />;
  }

  if (hasWorkspaces && location.pathname === '/onboarding') {
    console.log('🎯 ProtectedRoute: Has workspaces, redirecting to dashboard');
    resetOnboarding();
    return <Navigate to="/dashboard" replace />;
  }

  // Handle root path
  if (location.pathname === '/') {
    if (hasWorkspaces) {
      console.log('🎯 ProtectedRoute: Root access with workspaces, redirecting to dashboard');
      return <Navigate to="/dashboard" replace />;
    } else {
      console.log('🎯 ProtectedRoute: Root access without workspaces, redirecting to onboarding');
      return <Navigate to="/onboarding" replace />;
    }
  }

  console.log('✅ ProtectedRoute: All checks passed, showing protected content');
  return <>{children}</>;
}