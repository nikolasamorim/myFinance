import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { workspaceService } from '../services/workspace.service';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import type { WorkspaceContextType, Workspace, WorkspaceRole } from '../types';

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [currentWorkspace, setCurrentWorkspaceState] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<WorkspaceRole | null>(null);
  const hasLoadedWorkspaces = useRef(false);

  const deriveRole = (workspace: Workspace, userId: string): WorkspaceRole => {
    return workspace.workspace_owner_user_id === userId ? 'owner' : 'member';
  };

  const setCurrentWorkspace = (workspace: Workspace) => {
    setCurrentWorkspaceState(workspace);
    if (user) setUserRole(deriveRole(workspace, user.id));
  };

  const fetchWorkspaces = async () => {
    if (!user || !isAuthenticated || hasLoadedWorkspaces.current) {
      return;
    }

    // Ensure a valid token exists before calling the API
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.access_token) {
      console.warn('🏢 WorkspaceContext: No valid token yet, skipping fetch');
      return;
    }

    try {
      console.log('🏢 WorkspaceContext: Starting workspace fetch for user:', user.id);
      setLoading(true);
      hasLoadedWorkspaces.current = true;

      const data = await workspaceService.getUserWorkspaces();
      console.log('🏢 WorkspaceContext: Workspaces fetched:', data.length);

      setWorkspaces(data);

      if (data.length > 0) {
        console.log('🏢 WorkspaceContext: Setting first workspace as current:', data[0].workspace_id);
        setCurrentWorkspaceState(data[0]);
        setUserRole(deriveRole(data[0], user.id));
      } else {
        console.log('🏢 WorkspaceContext: No workspaces found');
        setCurrentWorkspaceState(null);
        setUserRole(null);
      }
    } catch (error) {
      console.error('❌ WorkspaceContext: Error fetching workspaces:', error);
      setWorkspaces([]);
      setCurrentWorkspaceState(null);
      setUserRole(null);
    } finally {
      setLoading(false);
    }
  };

  const refetchWorkspaces = async () => {
    hasLoadedWorkspaces.current = false;
    await fetchWorkspaces();
  };

  useEffect(() => {
    if (!authLoading && isAuthenticated && user && !hasLoadedWorkspaces.current) {
      console.log('🏢 WorkspaceContext: Auth completed, fetching workspaces');
      fetchWorkspaces();
    } else if (!isAuthenticated) {
      console.log('🏢 WorkspaceContext: User not authenticated, resetting workspace state');
      setWorkspaces([]);
      setCurrentWorkspaceState(null);
      setUserRole(null);
      hasLoadedWorkspaces.current = false;
    }
  }, [user, isAuthenticated, authLoading]);

  // Listen to Supabase session changes directly to handle the race condition
  // where isAuthenticated is already true but getSession() hasn't persisted the
  // token yet when WorkspaceContext first tries to fetch.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.access_token) {
        if (!hasLoadedWorkspaces.current) {
          console.log('🏢 WorkspaceContext: Session token confirmed via onAuthStateChange, fetching workspaces');
          // Call the service directly here so we always have a fresh token context
          try {
            setLoading(true);
            hasLoadedWorkspaces.current = true;
            const data = await workspaceService.getUserWorkspaces();
            setWorkspaces(data);
            if (data.length > 0) {
              setCurrentWorkspaceState(data[0]);
              setUserRole(data[0].workspace_owner_user_id === session.user.id ? 'owner' : 'member');
            } else {
              setCurrentWorkspaceState(null);
              setUserRole(null);
            }
          } catch (error) {
            console.error('❌ WorkspaceContext: Error fetching workspaces (onAuthStateChange):', error);
            hasLoadedWorkspaces.current = false;
            setWorkspaces([]);
            setCurrentWorkspaceState(null);
            setUserRole(null);
          } finally {
            setLoading(false);
          }
        }
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const value: WorkspaceContextType = {
    currentWorkspace,
    workspaces,
    setCurrentWorkspace,
    loading,
    refetchWorkspaces,
    userRole,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
