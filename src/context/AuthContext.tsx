import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  checkWorkspaces: () => Promise<boolean>;
  refetchUserWorkspaces: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Listen to auth state changes
  useEffect(() => {
    console.log('🔄 AuthContext: Setting up auth state listener');

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 AuthContext: Auth state changed:', event);
        
        if (session?.user) {
          const userData: User = {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || session.user.email || '',
          };
          
          console.log('✅ AuthContext: User authenticated:', userData.email);
          setUser(userData);
          setIsAuthenticated(true);
        } else {
          console.log('❌ AuthContext: No valid session');
          setUser(null);
          setIsAuthenticated(false);
        }
        
        setLoading(false);
      }
    );

    return () => {
      console.log('🧹 AuthContext: Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    console.log('🔐 AuthContext: Starting login process');
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ AuthContext: Login error:', error);
        throw error;
      }

      if (!data.session?.access_token) {
        throw new Error('No access token received');
      }
      
      // Auth state will be updated by the listener
      
      console.log('✅ AuthContext: Login successful');
    } catch (error) {
      console.error('❌ AuthContext: Login failed:', error);
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string) => {
    console.log('📝 AuthContext: Starting registration process');
    
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
        console.error('❌ AuthContext: Registration error:', error);
        throw error;
      }

      console.log('✅ AuthContext: Registration successful');
    } catch (error) {
      console.error('❌ AuthContext: Registration failed:', error);
      throw error;
    }
  };

  const logout = () => {
    console.log('🚪 AuthContext: Logging out');
    supabase.auth.signOut();
    // Auth state will be updated by the listener
  };

  const checkWorkspaces = async (): Promise<boolean> => {
    console.log('🏢 AuthContext: Checking workspaces');
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
        console.error('❌ AuthContext: Error checking workspaces:', error);
        throw error;
      }

      const hasWorkspaces = (data?.length || 0) > 0;
      console.log('✅ AuthContext: User has workspaces:', hasWorkspaces);
      return hasWorkspaces;
    } catch (error) {
      console.error('❌ AuthContext: Error checking workspaces:', error);
      return false;
    }
  };

  const refetchUserWorkspaces = async () => {
    console.log('🔄 AuthContext: Refetching user workspaces');
    // This is a placeholder - actual workspace refetching should be handled by WorkspaceContext
    // But we keep this for backward compatibility
  };
  const value: AuthContextType = {
    user,
    isAuthenticated,
    loading,
    login,
    register,
    logout,
    checkWorkspaces,
    refetchUserWorkspaces,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}