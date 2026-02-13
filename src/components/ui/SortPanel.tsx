import { useState, useEffect, useRef } from 'react';
import { X, Check, ArrowUpDown } from 'lucide-react';
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
          'bg-white rounded-xl border border-gray-200 shadow-xl',
          'animate-in fade-in slide-in-from-top-2 duration-200'
        )}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Ordenar por</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
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
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              )}
            >
              <span>{option.label}</span>
              {tempSort === option.value && (
                <Check className="w-4 h-4" />
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-100 bg-gray-50 rounded-b-xl">
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
