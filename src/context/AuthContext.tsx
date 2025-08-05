import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '../services/auth.service';

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Verificar autenticação ao carregar
  useEffect(() => {
    console.log('🔄 AuthContext: Checking authentication on mount');
    
    const token = authService.getToken();
    const userData = authService.getCurrentUser();
    
    if (token && userData) {
      console.log('✅ AuthContext: User found in localStorage:', userData.email);
      setUser(userData);
      setIsAuthenticated(true);
    } else {
      console.log('❌ AuthContext: No valid authentication found');
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    console.log('🔐 AuthContext: Starting login process');
    
    try {
      const response = await authService.login(email, password);
      
      setUser(response.user);
      setIsAuthenticated(true);
      
      console.log('✅ AuthContext: Login successful');
    } catch (error) {
      console.error('❌ AuthContext: Login failed:', error);
      setUser(null);
      setIsAuthenticated(false);
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string) => {
    console.log('📝 AuthContext: Starting registration process');
    
    try {
      await authService.register(email, password, name);
      console.log('✅ AuthContext: Registration successful');
    } catch (error) {
      console.error('❌ AuthContext: Registration failed:', error);
      throw error;
    }
  };

  const logout = () => {
    console.log('🚪 AuthContext: Logging out');
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  const checkWorkspaces = async (): Promise<boolean> => {
    console.log('🏢 AuthContext: Checking workspaces');
    try {
      return await authService.hasWorkspaces();
    } catch (error) {
      console.error('❌ AuthContext: Error checking workspaces:', error);
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    login,
    register,
    logout,
    checkWorkspaces,
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