import { useState, useEffect, useRef } from 'react';
import { X, RotateCcw, Check } from 'lucide-react';
import { Button } from './Button';
import { Dropdown } from './Dropdown';
import { Input } from './Input';
import { cn } from '../../lib/utils';

export interface FilterField {
  key: string;
  label: string;
  type: 'dropdown' | 'text' | 'date';
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
  const [dateError, setDateError] = useState<string>('');
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTempFilters(currentFilters);
      setDateError('');
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
    if (dateError) setDateError('');
  };

  const validateDates = (): boolean => {
    if (tempFilters.period === 'custom') {
      const start = tempFilters.date_start;
      const end = tempFilters.date_end;

      if (!start || !end) {
        setDateError('Ambas as datas sao obrigatorias');
        return false;
      }

      if (new Date(start) > new Date(end)) {
        setDateError('Data inicial deve ser anterior a data final');
        return false;
      }
    }
    return true;
  };

  const handleApply = () => {
    if (!validateDates()) {
      return;
    }
    onApply(tempFilters);
    onClose();
  };

  const handleClear = () => {
    setTempFilters(defaultFilters);
    setDateError('');
  };

  const hasChanges = JSON.stringify(tempFilters) !== JSON.stringify(currentFilters);
  const isDefault = JSON.stringify(tempFilters) === JSON.stringify(defaultFilters);
  const showCustomDates = tempFilters.period === 'custom';

  return (
    <div className="relative z-30">
      <div
        ref={panelRef}
        className={cn(
          'absolute right-0 top-2 w-80 sm:w-96',
          'bg-bg-page rounded-xl border border-border shadow-xl',
          'animate-in fade-in slide-in-from-top-2 duration-200'
        )}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-text-primary">Filtros</h3>
          <button
            onClick={onClose}
            className="p-1 text-text-muted hover:text-text-secondary rounded-lg hover:bg-bg-elevated transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {fields.map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-medium text-text-muted mb-1.5">
                {field.label}
              </label>
              {field.type === 'dropdown' && field.options ? (
                <Dropdown
                  options={field.options}
                  value={tempFilters[field.key] || ''}
                  onChange={(value) => handleTempChange(field.key, value)}
                />
              ) : field.type === 'date' ? (
                <Input
                  type="date"
                  value={tempFilters[field.key] || ''}
                  onChange={(e) => handleTempChange(field.key, e.target.value)}
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

          {showCustomDates && (
            <>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">
                  Data Inicial
                </label>
                <Input
                  type="date"
                  value={tempFilters.date_start || ''}
                  onChange={(e) => handleTempChange('date_start', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">
                  Data Final
                </label>
                <Input
                  type="date"
                  value={tempFilters.date_end || ''}
                  onChange={(e) => handleTempChange('date_end', e.target.value)}
                />
              </div>
              {dateError && (
                <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950 px-2 py-1.5 rounded">
                  {dateError}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-border bg-bg-surface rounded-b-xl">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={isDefault}
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
