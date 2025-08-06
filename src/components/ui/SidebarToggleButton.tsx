import React from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useSidebar } from '../../context/SidebarContext';
import { cn } from '../../lib/utils';

export function SidebarToggleButton() {
  const { isCollapsed, toggleSidebar } = useSidebar();

  return (
    <button
      onClick={toggleSidebar}
      className={cn(
        'flex items-center justify-center p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-1',
        'hidden lg:flex' // Only show on desktop where sidebar is always visible
      )}
      title={isCollapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
    >
      {isCollapsed ? (
        <PanelLeftOpen className="w-5 h-5" />
      ) : (
        <PanelLeftClose className="w-5 h-5" />
      )}
    </button>
  );
}