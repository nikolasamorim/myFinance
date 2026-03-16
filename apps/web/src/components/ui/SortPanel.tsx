import { useState, useEffect, useRef } from 'react';
import { X, Check } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/utils';

export interface SortOption {
  value: string;
  label: string;
}

interface SortPanelProps {
  isOpen: boolean;
  onClose: () => void;
  options: SortOption[];
  currentSort: string;
  onApply: (sortOption: string) => void;
}

export function SortPanel({
  isOpen,
  onClose,
  options,
  currentSort,
  onApply,
}: SortPanelProps) {
  const [tempSort, setTempSort] = useState<string>(currentSort);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTempSort(currentSort);
    }
  }, [isOpen, currentSort]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleApply = () => {
    onApply(tempSort);
    onClose();
  };

  const hasChanges = tempSort !== currentSort;

  return (
    <div className="relative z-30">
      <div
        ref={panelRef}
        className={cn(
          'absolute right-0 top-2 w-72',
          'bg-bg-page rounded-xl border border-border shadow-xl',
          'animate-in fade-in slide-in-from-top-2 duration-200'
        )}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-text-primary">Ordenar por</h3>
          <button
            onClick={onClose}
            className="p-1 text-text-muted hover:text-text-secondary rounded-lg hover:bg-bg-elevated transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => setTempSort(option.value)}
              className={cn(
                'w-full px-3 py-2 rounded-lg text-left text-sm transition-all',
                'flex items-center justify-between',
                tempSort === option.value
                  ? 'bg-text-primary text-bg-page'
                  : 'bg-bg-surface text-text-secondary hover:bg-bg-elevated'
              )}
            >
              <span>{option.label}</span>
              {tempSort === option.value && (
                <Check className="w-4 h-4" />
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border bg-bg-surface rounded-b-xl">
          <Button
            type="button"
            size="sm"
            onClick={handleApply}
            className={cn(!hasChanges && 'opacity-70')}
          >
            <Check className="w-3.5 h-3.5 mr-1.5" />
            Aplicar Ordenacao
          </Button>
        </div>
      </div>
    </div>
  );
}
