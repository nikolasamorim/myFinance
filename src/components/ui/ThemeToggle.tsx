import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
    >
      {theme === 'light' ? (
        <Moon className="w-4 h-4 mr-3" />
      ) : (
        <Sun className="w-4 h-4 mr-3" />
      )}
      <span className="flex-1 text-left">
        Tema: {theme === 'light' ? 'Claro' : 'Escuro'}
      </span>
    </button>
  );
}