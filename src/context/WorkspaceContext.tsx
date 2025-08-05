import React, { createContext, useContext, useEffect, useState } from 'react';
import { workspaceService } from '../services/workspace.service';
import { useAuth } from './AuthContext';
import type { WorkspaceContextType, Workspace } from '../types';

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWorkspaces = async () => {
    if (!user) {
      console.log('WorkspaceContext: No user, skipping workspace fetch');
      setLoading(false);
      setWorkspaces([]);
      setCurrentWorkspace(null);
      return;
    }
    
    try {
      console.log('WorkspaceContext: Starting workspace fetch for user:', user.id);
      setLoading(true);
      
      const data = await workspaceService.getUserWorkspaces();
      console.log('WorkspaceContext: Workspaces fetched:', data.length);
      
      setWorkspaces(data);
      
      // Set first workspace as current if none selected
      if (data.length === 0) {
        console.log('WorkspaceContext: No workspaces found');
        setWorkspaces([]);
        setCurrentWorkspace(null);
      } else if (!currentWorkspace) {
        console.log('WorkspaceContext: Setting first workspace as current:', data[0].workspace_id);
        setCurrentWorkspace(data[0]);
      }
    } catch (error) {
      console.error('WorkspaceContext: Error fetching workspaces:', error);
      // Em caso de erro, não bloquear - apenas definir estados vazios
      setWorkspaces([]);
      setCurrentWorkspace(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('WorkspaceContext: useEffect triggered, user:', user?.id || 'null');
    if (user) {
      fetchWorkspaces();
    } else {
      console.log('WorkspaceContext: No user, resetting workspace state');
      setWorkspaces([]);
      setCurrentWorkspace(null);
      setLoading(false);
    }
  }, [user]);

  const value: WorkspaceContextType = {
    currentWorkspace,
    workspaces,
    setCurrentWorkspace,
    loading,
    refetchWorkspaces: fetchWorkspaces,
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