import { Settings, Share, ArrowUpDown, Filter } from 'lucide-react';
import { cn } from '../../lib/utils';

interface VisualizationToolbarProps {
  onFilter?: () => void;
  onSort?: () => void;
  onSettings?: () => void;
  onShare?: () => void;
  activeFilter?: boolean;
  activeFilterCount?: number;
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
        'text-text-muted hover:text-text-primary hover:bg-bg-elevated',
        active && 'text-text-primary bg-bg-elevated'
      )}
    >
      {icon}
      {active && (
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-accent" />
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
  activeFilterCount,
  className,
}: VisualizationToolbarProps) {
  const filterActive = activeFilterCount != null ? activeFilterCount > 0 : !!activeFilter;
  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {onSort && (
        <ToolbarButton
          onClick={onSort}
          icon={<ArrowUpDown className="w-4 h-4" />}
          title="Ordenar"
        />
      )}
      {onFilter && (
        <div className="relative">
          <ToolbarButton
            onClick={onFilter}
            icon={<Filter className="w-4 h-4" />}
            title="Filtrar"
            active={filterActive}
          />
          {activeFilterCount != null && activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-emerald-500 text-white text-[10px] font-bold leading-none pointer-events-none">
              {activeFilterCount}
            </span>
          )}
        </div>
      )}
      {onShare && (
        <ToolbarButton
          onClick={onShare}
          icon={<Share className="w-4 h-4" />}
          title="Compartilhar"
        />
      )}
      {onSettings && (
        <ToolbarButton
          onClick={onSettings}
          icon={<Settings className="w-4 h-4" />}
          title="Configuracoes"
        />
      )}
    </div>
  );
}
