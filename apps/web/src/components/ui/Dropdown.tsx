import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface DropdownProps {
  options: DropdownOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  isMobile?: boolean;
}

export function Dropdown({ options, value, onChange, placeholder = 'Selecione...', className, isMobile = false }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(option => option.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <button
        type="button"
        className={cn(
          "w-full flex items-center justify-between bg-bg-page border border-border rounded-md shadow-sm text-left focus:outline-none focus:ring-1 focus:ring-accent focus:border-transparent min-w-0",
          isMobile ? "px-1.5 py-2 text-xs min-h-[32px]" : "px-2 py-1.5 text-sm"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center min-w-0 flex-1">
          {selectedOption?.icon && (
            <span className={cn("mr-1 flex-shrink-0 text-text-secondary", isMobile ? "text-sm" : "text-sm")}>{selectedOption.icon}</span>
          )}
          <span className={cn(
            'block truncate min-w-0',
            isMobile ? 'text-xs font-medium' : 'text-sm',
            selectedOption ? 'text-text-primary' : 'text-text-muted'
          )}>
            {selectedOption?.label || placeholder}
          </span>
        </div>
        <ChevronDown className={cn(
          'text-text-muted transition-transform flex-shrink-0 ml-1',
          isMobile ? 'w-3 h-3' : 'w-3.5 h-3.5',
          isOpen && 'transform rotate-180'
        )} />
      </button>

      {isOpen && (
        <div className={cn(
          "absolute z-10 mt-0.5 bg-bg-page border border-border rounded-md shadow-lg",
          isMobile ? "w-48 right-0" : "w-full"
        )}>
          <div className="py-0.5 max-h-48 overflow-auto">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                className={cn(
                  'w-full flex items-center text-left hover:bg-bg-elevated focus:outline-none focus:bg-bg-elevated min-w-0 text-text-primary',
                  isMobile ? 'px-3 py-2.5 text-sm' : 'px-2 py-1.5 text-sm',
                  value === option.value && 'bg-bg-elevated'
                )}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                {option.icon && (
                  <span className={cn("mr-2 flex-shrink-0 text-text-secondary", isMobile ? "text-sm" : "text-sm")}>{option.icon}</span>
                )}
                <span className={cn("block truncate min-w-0", isMobile ? "text-sm font-medium" : "text-sm")}>{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
