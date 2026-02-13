import { useState, useEffect, useRef } from 'react';
import { X, RotateCcw, Check } from 'lucide-react';
import { Button } from './Button';
import { Dropdown } from './Dropdown';
import { Input } from './Input';
import { cn } from '../../lib/utils';

export interface FilterField {
  key: string;
  label: string;
  type: 'dropdown' | 'text';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

interface FiltersPanelProps {
  isOpen: boolean;
  onClose: () => void;
  fields: FilterField[];
  currentFilters: Record<string, string>;
  defaultFilters: Record<string, string>;
  onApply: (filters: Record<string, string>) => void;
}

export function FiltersPanel({
  isOpen,
  onClose,
  fields,
  currentFilters,
  defaultFilters,
  onApply,
}: FiltersPanelProps) {
  const [tempFilters, setTempFilters] = useState<Record<string, string>>(currentFilters);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTempFilters(currentFilters);
    }
  }, [isOpen, currentFilters]);

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

  const handleTempChange = (key: string, value: string) => {
    setTempFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleApply = () => {
    onApply(tempFilters);
    onClose();
  };

  const handleClear = () => {
    setTempFilters(defaultFilters);
  };

  const hasChanges = JSON.stringify(tempFilters) !== JSON.stringify(currentFilters);
  const isDefault = JSON.stringify(tempFilters) === JSON.stringify(defaultFilters);

  return (
    <div className="relative z-30">
      <div
        ref={panelRef}
        className={cn(
          'absolute right-0 top-2 w-80 sm:w-96',
          'bg-white rounded-xl border border-gray-200 shadow-xl',
          'animate-in fade-in slide-in-from-top-2 duration-200'
        )}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Filtros</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {fields.map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                {field.label}
              </label>
              {field.type === 'dropdown' && field.options ? (
                <Dropdown
                  options={field.options}
                  value={tempFilters[field.key] || ''}
                  onChange={(value) => handleTempChange(field.key, value)}
                />
              ) : (
                <Input
                  placeholder={field.placeholder || ''}
                  value={tempFilters[field.key] || ''}
                  onChange={(e) => handleTempChange(field.key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-gray-100 bg-gray-50 rounded-b-xl">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={isDefault}
            className="text-gray-500"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Limpar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleApply}
            className={cn(!hasChanges && 'opacity-70')}
          >
            <Check className="w-3.5 h-3.5 mr-1.5" />
            Aplicar Filtros
          </Button>
        </div>
      </div>
    </div>
  );
}
