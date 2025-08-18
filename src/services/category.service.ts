import { supabase } from '../lib/supabase';

interface CategoryFilters {
  type: string;
  search: string;
}

export interface CategoryData {
  title: string;
  type: 'income' | 'expense';
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
          category_id,
          category_workspace_id,
          category_name,
          category_type,
          category_created_at,
          category_updated_at
        `)
        .eq('category_workspace_id', workspaceId)
        .order('category_name', { ascending: true });

      if (filters.search) {
        query = query.ilike('category_name', `%${filters.search}%`);
      }

      if (filters.type !== 'all') {
        query = query.eq('category_type', filters.type);
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
          category_workspace_id: workspaceId,
          category_name: categoryData.title,
          category_type: categoryData.type,
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
        .update({
          category_name: updates.title,
          category_type: updates.type,
        })
        .eq('category_id', id)
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
        .eq('category_id', id);

      if (error) throw new Error('Failed to delete category: ' + error.message);
    } catch (error) {
      console.error('Error in deleteCategory:', error);
      throw error;
    }
  },

  async updateCategoryOrder(workspaceId: string, updates: Array<{ id: string; parent_id: string | null; sort_order: number }>) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw new Error('Authentication failed: ' + userError.message);
      if (!user) throw new Error('User not authenticated');

      // Update multiple categories in a single transaction-like operation
      const promises = updates.map(update => 
        supabase
          .from('categories')
          .update({
            parent_id: update.parent_id,
            sort_order: update.sort_order,
          })
          .eq('category_id', update.id)
          .eq('category_workspace_id', workspaceId)
      );

      const results = await Promise.all(promises);
      
      // Check for errors
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        throw new Error('Failed to update category order: ' + errors[0].error.message);
      }

      return true;
    } catch (error) {
      console.error('Error in updateCategoryOrder:', error);
      throw error;
    }
  },
};