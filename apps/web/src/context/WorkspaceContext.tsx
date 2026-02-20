import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { workspaceService } from '../services/workspace.service';
import { useAuth } from './AuthContext';
import type { WorkspaceContextType, Workspace } from '../types';

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(false);
  const hasLoadedWorkspaces = useRef(false);

  const fetchWorkspaces = async () => {
    if (!user || !isAuthenticated || hasLoadedWorkspaces.current) {
      return;
    }

    try {
      console.log('🏢 WorkspaceContext: Starting workspace fetch for user:', user.id);
      setLoading(true);
      hasLoadedWorkspaces.current = true;
      
      const data = await workspaceService.getUserWorkspaces();
      console.log('🏢 WorkspaceContext: Workspaces fetched:', data.length);
      
      setWorkspaces(data);
      
      // Set first workspace as current if available
      if (data.length > 0) {
        console.log('🏢 WorkspaceContext: Setting first workspace as current:', data[0].workspace_id);
        setCurrentWorkspace(data[0]);
      } else {
        console.log('🏢 WorkspaceContext: No workspaces found');
        setCurrentWorkspace(null);
      }
    } catch (error) {
      console.error('❌ WorkspaceContext: Error fetching workspaces:', error);
      setWorkspaces([]);
      setCurrentWorkspace(null);
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
      setCurrentWorkspace(null);
      hasLoadedWorkspaces.current = false;
    }
  }, [user, isAuthenticated, authLoading]);

  const value: WorkspaceContextType = {
    currentWorkspace,
    workspaces,
    setCurrentWorkspace,
    loading,
    refetchWorkspaces,
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