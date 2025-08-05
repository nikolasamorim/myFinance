import { supabase } from '../lib/supabase';

interface LoginResponse {
  user: {
    id: string;
    email: string;
    name: string;
  };
  token: string;
}

interface User {
  id: string;
  email: string;
  name: string;
}

export const authService = {
  // Fazer login e salvar token
  async login(email: string, password: string): Promise<LoginResponse> {
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

      const user = {
        id: data.user.id,
        email: data.user.email || '',
        name: data.user.user_metadata?.name || data.user.email || '',
      };

      const loginResponse = {
        user,
        token: data.session.access_token,
      };

      // Salvar token no localStorage
      localStorage.setItem('auth_token', data.session.access_token);
      localStorage.setItem('user_data', JSON.stringify(user));

      console.log('✅ AuthService: Login successful');
      return loginResponse;
    } catch (error) {
      console.error('❌ AuthService: Login failed:', error);
      throw error;
    }
  },

  // Registrar usuário
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

  // Logout
  logout(): void {
    console.log('🚪 AuthService: Logging out');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    supabase.auth.signOut();
  },

  // Verificar se está autenticado
  isAuthenticated(): boolean {
    const token = localStorage.getItem('auth_token');
    return !!token;
  },

  // Obter token atual
  getToken(): string | null {
    return localStorage.getItem('auth_token');
  },

  // Obter dados do usuário
  getCurrentUser(): User | null {
    const userData = localStorage.getItem('user_data');
    if (!userData) return null;
    
    try {
      return JSON.parse(userData);
    } catch {
      return null;
    }
  },

  // Verificar se o usuário tem workspaces
  async hasWorkspaces(): Promise<boolean> {
    console.log('🏢 AuthService: Checking user workspaces');
    
    try {
      const token = this.getToken();
      if (!token) {
        throw new Error('No auth token');
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