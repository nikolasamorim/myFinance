import { supabase } from '../lib/supabase';

export const authService = {
  // Make login (deprecated - use AuthContext instead)
  async login(email: string, password: string) {
    console.log('🔐 AuthService: Attempting login for:', email);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ AuthService: Login error:', error);
        throw error;
      }

      if (!data.session?.access_token) {
        throw new Error('No access token received');
      }

      console.log('✅ AuthService: Login successful');
      return data;
    } catch (error) {
      console.error('❌ AuthService: Login failed:', error);
      throw error;
    }
  },

  // Register user (deprecated - use AuthContext instead)
  async register(email: string, password: string, name: string): Promise<void> {
    console.log('📝 AuthService: Attempting registration for:', email);
    
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
          }
        }
      });

      if (error) {
        console.error('❌ AuthService: Registration error:', error);
        throw error;
      }

      console.log('✅ AuthService: Registration successful');
    } catch (error) {
      console.error('❌ AuthService: Registration failed:', error);
      throw error;
    }
  },

  // Logout (deprecated - use AuthContext instead)
  logout(): void {
    console.log('🚪 AuthService: Logging out');
    supabase.auth.signOut();
  },

  // Check if authenticated (deprecated - use AuthContext instead)
  isAuthenticated(): boolean {
    // This is now handled by AuthContext
    return false;
  },

  // Get current token (deprecated - use Supabase session instead)
  getToken(): string | null {
    // This is now handled by Supabase session
    return null;
  },

  // Get current user (deprecated - use AuthContext instead)
  getCurrentUser() {
    // This is now handled by AuthContext
    return null;
  },

  // Check if user has workspaces (deprecated - use AuthContext instead)
  async hasWorkspaces(): Promise<boolean> {
    console.log('🏢 AuthService: Checking user workspaces');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('No authenticated user');
      }

      const { data, error } = await supabase
        .from('workspaces')
        .select('workspace_id')
        .limit(1);

      if (error) {
        console.error('❌ AuthService: Error checking workspaces:', error);
        throw error;
      }

      const hasWorkspaces = (data?.length || 0) > 0;
      console.log('✅ AuthService: User has workspaces:', hasWorkspaces);
      return hasWorkspaces;
    } catch (error) {
      console.error('❌ AuthService: Failed to check workspaces:', error);
      return false;
    }
  },
};