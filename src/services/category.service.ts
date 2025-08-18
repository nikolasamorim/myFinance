import { supabase } from '../lib/supabase';

interface CategoryFilters {
  type: string;
  search: string;
}

export interface CategoryData {
  title: string;
  type: 'income' | 'expense';
  parent_id?: string | null;
  description?: string;
}

export const categoryService = {
  async getCategories(workspaceId: string, filters: CategoryFilters) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('Error getting user:', userError);
        throw new Error('Authentication failed: ' + userError.message);
      }
      if (!user) throw new Error('User not authenticated');

      let query = supabase
        .from('categories')
        .select(`
          id,
          workspace_id,
          title,
          type,
          parent_id,
          description,
          created_at,
          updated_at
        `)
        .eq('workspace_id', workspaceId)
        .order('title', { ascending: true });

      if (filters.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }

      if (filters.type !== 'all') {
        query = query.eq('type', filters.type);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching categories:', error);
        throw new Error('Failed to fetch categories: ' + error.message);
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getCategories:', error);
      throw error;
    }
  },

  async createCategory(workspaceId: string, categoryData: CategoryData) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw new Error('Authentication failed: ' + userError.message);
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('categories')
        .insert([{
          workspace_id: workspaceId,
          title: categoryData.title,
          type: categoryData.type,
          parent_id: categoryData.parent_id,
          description: categoryData.description,
        }])
        .select()
        .single();

      if (error) throw new Error('Failed to create category: ' + error.message);
      return data;
    } catch (error) {
      console.error('Error in createCategory:', error);
      throw error;
    }
  },

  async updateCategory(id: string, updates: Partial<CategoryData>) {
    try {
      const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error('Failed to update category: ' + error.message);
      return data;
    } catch (error) {
      console.error('Error in updateCategory:', error);
      throw error;
    }
  },

  async deleteCategory(id: string) {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw new Error('Failed to delete category: ' + error.message);
    } catch (error) {
      console.error('Error in deleteCategory:', error);
      throw error;
    }
  },
};