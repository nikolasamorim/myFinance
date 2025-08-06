import { supabase } from '../lib/supabase';
import type { Visualization } from '../types';

export const visualizationService = {
  async getUserVisualizations(workspaceId: string, screenContext: string): Promise<Visualization[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('visualizations')
      .select('*')
      .eq('visualization_workspace_id', workspaceId)
      .eq('visualization_user_id', user.id)
      .eq('visualization_screen_context', screenContext)
      .order('visualization_created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getDefaultVisualization(workspaceId: string, screenContext: string): Promise<Visualization | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('visualizations')
      .select('*')
      .eq('visualization_workspace_id', workspaceId)
      .eq('visualization_user_id', user.id)
      .eq('visualization_screen_context', screenContext)
      .eq('visualization_is_default', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },

  async createVisualization(visualization: Omit<Visualization, 'visualization_id' | 'visualization_created_at' | 'visualization_updated_at'>): Promise<Visualization> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('visualizations')
      .insert({
        ...visualization,
        visualization_user_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateVisualization(id: string, updates: Partial<Visualization>): Promise<Visualization> {
    const { data, error } = await supabase
      .from('visualizations')
      .update(updates)
      .eq('visualization_id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async setDefaultVisualization(workspaceId: string, screenContext: string, visualizationId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // First, remove default from all visualizations in this context
    await supabase
      .from('visualizations')
      .update({ visualization_is_default: false })
      .eq('visualization_workspace_id', workspaceId)
      .eq('visualization_user_id', user.id)
      .eq('visualization_screen_context', screenContext);

    // Then set the new default
    const { error } = await supabase
      .from('visualizations')
      .update({ visualization_is_default: true })
      .eq('visualization_id', visualizationId);

    if (error) throw error;
  },

  async deleteVisualization(id: string): Promise<void> {
    const { error } = await supabase
      .from('visualizations')
      .delete()
      .eq('visualization_id', id);

    if (error) throw error;
  },
};