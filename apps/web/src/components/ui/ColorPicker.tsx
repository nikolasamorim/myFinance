import React, { useState, useRef, useEffect } from 'react';
import { Palette } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  className?: string;
}

const predefinedColors = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308',
  '#84CC16', '#22C55E', '#10B981', '#06B6D4',
  '#0EA5E9', '#3B82F6', '#6366F1', '#8B5CF6',
  '#A855F7', '#D946EF', '#EC4899', '#F43F5E',
  '#6B7280', '#374151',
];

export function ColorPicker({ value, onChange, label, className }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customColor, setCustomColor] = useState(value);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleColorSelect = (color: string) => {
    onChange(color);
    setCustomColor(color);
    setIsOpen(false);
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setCustomColor(color);
    onChange(color);
  };

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-text-secondary mb-2">
          {label}
        </label>
      )}

      <button
        type="button"
        className="w-full flex items-center justify-between bg-bg-page border border-border rounded-md shadow-sm px-3 py-2 text-left focus:outline-none focus:ring-1 focus:ring-accent focus:border-transparent"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center space-x-2">
          <div
            className="w-5 h-5 rounded border border-border"
            style={{ backgroundColor: value }}
          />
          <span className="text-sm text-text-primary">{value}</span>
        </div>
        <Palette className="w-4 h-4 text-text-muted" />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 bg-bg-page border border-border rounded-md shadow-lg p-3 w-64">
          <div className="mb-3">
            <p className="text-xs font-medium text-text-secondary mb-2">Cores predefinidas</p>
            <div className="grid grid-cols-6 gap-2">
              {predefinedColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={cn(
                    'w-8 h-8 rounded border-2 transition-all hover:scale-110',
                    value === color ? 'border-text-primary' : 'border-border'
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorSelect(color)}
                  title={color}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-text-secondary mb-2">Cor personalizada</p>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={customColor}
                onChange={handleCustomColorChange}
                className="w-8 h-8 border border-border rounded cursor-pointer"
              />
              <input
                type="text"
                value={customColor}
                onChange={(e) => {
                  setCustomColor(e.target.value);
                  if (e.target.value.match(/^#[0-9A-F]{6}$/i)) {
                    onChange(e.target.value);
                  }
                }}
                className="flex-1 px-2 py-1 text-xs bg-bg-surface text-text-primary border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent placeholder-text-muted"
                placeholder="#000000"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
