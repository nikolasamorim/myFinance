import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { userService } from '../services/user.service';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<Theme>('light');
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize theme on mount
  useEffect(() => {
    const initializeTheme = async () => {
      try {
        if (user?.id) {
          // Try to get user's saved theme preference
          try {
            const profile = await userService.getUserProfile(user.id);
            const savedTheme = profile?.theme as Theme;
            
            if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
              setThemeState(savedTheme);
              applyTheme(savedTheme);
            } else {
              // Fallback to system preference
              const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
              setThemeState(systemTheme);
              applyTheme(systemTheme);
            }
          } catch (profileError) {
            console.warn('Could not load user theme preference, using system default:', profileError);
            // Fallback to system preference
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            setThemeState(systemTheme);
            applyTheme(systemTheme);
          }
        } else {
          // No user, use system preference
          const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
          setThemeState(systemTheme);
          applyTheme(systemTheme);
        }
      } catch (error) {
        console.error('Error initializing theme:', error);
        // Fallback to light theme
        setThemeState('light');
        applyTheme('light');
      } finally {
        setIsInitialized(true);
      }
    };

    initializeTheme();
  }, [user?.id]);

  // Apply theme to document
  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement;
    
    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    applyTheme(newTheme);

    // Save to user profile if logged in
    if (user?.id) {
      try {
        await userService.updateUserProfile(user.id, { theme: newTheme });
      } catch (error) {
        console.warn('Could not save theme preference to database:', error);
        // Continue with local theme change even if save fails
      }
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  // Don't render children until theme is initialized to prevent flash
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}