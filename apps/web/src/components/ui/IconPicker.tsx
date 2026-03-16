import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { cn } from '../../lib/utils';

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
  label?: string;
  className?: string;
}

const popularIcons = [
  'Wallet', 'CreditCard', 'DollarSign', 'PiggyBank', 'Target', 'Tag',
  'Building', 'Home', 'Car', 'ShoppingCart', 'Coffee', 'Utensils',
  'Zap', 'Wifi', 'Phone', 'Tv', 'Gamepad2', 'Book',
  'Heart', 'Plane', 'MapPin', 'Gift', 'Star', 'Briefcase',
  'GraduationCap', 'Stethoscope', 'Wrench', 'Palette', 'Music', 'Camera'
];

const allIconNames = Object.keys(LucideIcons).filter(
  name => name !== 'default' && name !== 'createLucideIcon' && typeof LucideIcons[name as keyof typeof LucideIcons] === 'function'
);

export function IconPicker({ value, onChange, label, className }: IconPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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

  const filteredIcons = searchTerm
    ? allIconNames.filter(name =>
        name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : popularIcons;

  const renderIcon = (iconName: string) => {
    const IconComponent = LucideIcons[iconName as keyof typeof LucideIcons] as React.ComponentType<any>;
    if (!IconComponent) return null;
    return <IconComponent className="w-4 h-4" />;
  };

  const selectedIcon = renderIcon(value);

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
          <div className="w-5 h-5 flex items-center justify-center text-text-secondary">
            {selectedIcon || <div className="w-4 h-4 bg-bg-elevated rounded" />}
          </div>
          <span className="text-sm text-text-primary">{value || 'Selecione um ícone'}</span>
        </div>
        <ChevronDown className="w-4 h-4 text-text-muted" />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 bg-bg-page border border-border rounded-md shadow-lg w-80 max-h-96 overflow-hidden">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar ícones..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-sm bg-bg-surface text-text-primary border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent placeholder-text-muted"
              />
            </div>
          </div>

          <div className="p-3 max-h-64 overflow-y-auto">
            {!searchTerm && (
              <div className="mb-3">
                <p className="text-xs font-medium text-text-secondary mb-2">Ícones populares</p>
              </div>
            )}

            <div className="grid grid-cols-6 gap-2">
              {filteredIcons.map((iconName) => {
                const IconComponent = LucideIcons[iconName as keyof typeof LucideIcons] as React.ComponentType<any>;
                if (!IconComponent) return null;

                return (
                  <button
                    key={iconName}
                    type="button"
                    className={cn(
                      'w-9 h-9 flex items-center justify-center rounded border-2 transition-all hover:bg-bg-elevated',
                      value === iconName ? 'border-accent bg-bg-elevated' : 'border-border'
                    )}
                    onClick={() => {
                      onChange(iconName);
                      setIsOpen(false);
                    }}
                    title={iconName}
                  >
                    <IconComponent className="w-4 h-4 text-text-secondary" />
                  </button>
                );
              })}
            </div>

            {filteredIcons.length === 0 && (
              <div className="text-center py-4 text-text-muted">
                <p className="text-sm">Nenhum ícone encontrado</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
