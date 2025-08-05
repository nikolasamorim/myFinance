import { supabase } from '../lib/supabase';
import type { Workspace } from '../types';

export const workspaceService = {
  async getUserWorkspaces(): Promise<Workspace[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('WorkspaceService: User not authenticated');
      throw new Error('User not authenticated');
    }

    console.log('WorkspaceService: Querying workspaces for user:', user.id);
    
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('workspace_owner_user_id', user.id)
      .order('workspace_created_at', { ascending: false });

    if (error) {
      console.error('WorkspaceService: Error fetching workspaces:', error.message);
      throw error;
    }
    
    console.log('WorkspaceService: Query result:', data?.length || 0, 'workspaces');
    return data || [];
  },

  async createWorkspace(
    name: string, 
    type: 'personal' | 'family' | 'company' = 'personal',
    shared: boolean = false,
    mainGoal?: string
  ): Promise<Workspace> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('WorkspaceService: User not authenticated for workspace creation');
      throw new Error('User not authenticated');
    }

    console.log('WorkspaceService: Creating workspace:', name, 'for user:', user.id);
    
    const { data, error } = await supabase
      .from('workspaces')
      .insert({
        workspace_name: name,
        workspace_type: type,
        workspace_owner_user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('WorkspaceService: Error creating workspace:', error.message);
      console.error('WorkspaceService: Full error object:', error);
      throw error;
    }
    
    console.log('WorkspaceService: Workspace created successfully:', data);
    return data;
  },

  async updateWorkspace(id: string, updates: Partial<Pick<Workspace, 'workspace_name' | 'workspace_icon'>>): Promise<Workspace> {
    const { data, error } = await supabase
      .from('workspaces')
      .update(updates)
      .eq('workspace_id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteWorkspace(id: string): Promise<void> {
    const { error } = await supabase
      .from('workspaces')
      .delete()
      .eq('workspace_id', id);

    if (error) throw error;
  },
};