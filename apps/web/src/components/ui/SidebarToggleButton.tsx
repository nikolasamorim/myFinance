import React from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useSidebar } from '../../context/SidebarContext';
import { cn } from '../../lib/utils';

interface SidebarToggleButtonProps {
  onMobileToggle?: () => void;
}

export function SidebarToggleButton({ onMobileToggle }: SidebarToggleButtonProps) {
  const { isCollapsed, toggleSidebar } = useSidebar();

  const handleClick = () => {
    if (onMobileToggle) {
      onMobileToggle();
    } else {
      toggleSidebar();
    }
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'flex items-center justify-center p-2 text-text-secondary hover:text-text-primary hover:bg-bg-elevated rounded-lg transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-border focus:ring-offset-1',
        'flex'
      )}
      title={onMobileToggle ? 'Abrir menu' : (isCollapsed ? 'Expandir sidebar' : 'Recolher sidebar')}
    >
      {onMobileToggle || isCollapsed ? (
        <PanelLeftOpen className="w-5 h-5" />
      ) : (
        <PanelLeftClose className="w-5 h-5" />
      )}
    </button>
  );
}
