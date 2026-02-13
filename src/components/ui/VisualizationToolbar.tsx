import { Settings, Share2, ArrowUpDown, Filter } from 'lucide-react';
import { cn } from '../../lib/utils';

interface VisualizationToolbarProps {
  onFilter?: () => void;
  onSort?: () => void;
  onSettings?: () => void;
  onShare?: () => void;
  activeFilter?: boolean;
  className?: string;
}

function ToolbarButton({
  onClick,
  icon,
  title,
  active,
}: {
  onClick?: () => void;
  icon: React.ReactNode;
  title: string;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'relative p-2 rounded-lg transition-all duration-150',
        'text-gray-500 hover:text-gray-900 hover:bg-gray-100',
        active && 'text-gray-900 bg-gray-100'
      )}
    >
      {icon}
      {active && (
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-blue-500" />
      )}
    </button>
  );
}

export function VisualizationToolbar({
  onFilter,
  onSort,
  onSettings,
  onShare,
  activeFilter,
  className,
}: VisualizationToolbarProps) {
  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {onSettings && (
        <ToolbarButton
          onClick={onSettings}
          icon={<Settings className="w-4 h-4" />}
          title="Configuracoes"
        />
      )}
      {onShare && (
        <ToolbarButton
          onClick={onShare}
          icon={<Share2 className="w-4 h-4" />}
          title="Compartilhar"
        />
      )}
      {onSort && (
        <ToolbarButton
          onClick={onSort}
          icon={<ArrowUpDown className="w-4 h-4" />}
          title="Ordenar"
        />
      )}
      {onFilter && (
        <ToolbarButton
          onClick={onFilter}
          icon={<Filter className="w-4 h-4" />}
          title="Filtrar"
          active={activeFilter}
        />
      )}
    </div>
  );
}
