import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { workspaces, loading: workspaceLoading } = useWorkspace();
  const location = useLocation();

  console.log('🛡️ ProtectedRoute: Current path:', location.pathname);
  console.log('🛡️ ProtectedRoute: Auth loading:', authLoading);
  console.log('🛡️ ProtectedRoute: Workspace loading:', workspaceLoading);
  console.log('🛡️ ProtectedRoute: Is authenticated:', isAuthenticated);
  console.log('🛡️ ProtectedRoute: Workspaces count:', workspaces.length);

  // Show loading while auth or workspace state is being determined
  if (authLoading || (isAuthenticated && workspaceLoading)) {
    console.log('⏳ ProtectedRoute: Loading, showing spinner');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    console.log('🚫 ProtectedRoute: User not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Check if user has workspaces
  const hasWorkspaces = workspaces.length > 0;

  // Redirect logic based on workspaces and current path
  if (!hasWorkspaces && location.pathname !== '/onboarding') {
    console.log('🎯 ProtectedRoute: No workspaces, redirecting to onboarding');
    return <Navigate to="/onboarding" replace />;
  }

  if (hasWorkspaces && location.pathname === '/onboarding') {
    console.log('🎯 ProtectedRoute: Has workspaces, redirecting to dashboard');
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