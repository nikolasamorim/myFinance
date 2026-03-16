import React, { useState } from 'react';
import { ChevronDown, TrendingUp, TrendingDown } from 'lucide-react';
import { useFloating, autoUpdate, offset, flip, shift, useClick, useDismiss, useInteractions, FloatingPortal } from '@floating-ui/react';
import { cn } from '../../lib/utils';

interface TransactionType {
  value: 'income' | 'expense' | 'debt' | 'investment';
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

interface TransactionTypeSelectorProps {
  onSelect: (type: 'income' | 'expense' | 'debt' | 'investment') => void;
  trigger?: React.ReactNode;
  className?: string;
}

const transactionTypes: TransactionType[] = [
  {
    value: 'income',
    label: 'Receita',
    description: 'Dinheiro que entra',
    icon: <TrendingUp className="w-5 h-5" />,
    color: 'from-green-500 to-emerald-600',
  },
  {
    value: 'expense',
    label: 'Despesa',
    description: 'Dinheiro que sai',
    icon: <TrendingDown className="w-5 h-5" />,
    color: 'from-red-500 to-pink-600',
  },
];

export function TransactionTypeSelector({ onSelect, trigger, className }: TransactionTypeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [
      offset(8),
      flip(),
      shift({ padding: 8 })
    ],
    placement: 'bottom-end',
    whileElementsMounted: autoUpdate,
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss]);

  const handleSelect = (type: 'income' | 'expense' | 'debt' | 'investment') => {
    onSelect(type);
    setIsOpen(false);
  };

  const defaultTrigger = (
    <button
      className={cn(
        'flex items-center space-x-2 px-3 py-1.5 text-sm font-medium bg-accent text-white rounded-lg hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-colors',
        className
      )}
    >
      <span>Nova Transação</span>
      <ChevronDown className={cn(
        'w-4 h-4 transition-transform',
        isOpen && 'rotate-180'
      )} />
    </button>
  );

  return (
    <>
      <div ref={refs.setReference} {...getReferenceProps()}>
        {trigger || defaultTrigger}
      </div>

      {isOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="bg-bg-page border border-border rounded-lg shadow-lg z-50 w-80 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-border bg-bg-surface">
              <h3 className="text-sm font-semibold text-text-primary">Selecione o tipo de transação</h3>
              <p className="text-xs text-text-secondary mt-1">Escolha o tipo antes de preencher os dados</p>
            </div>

            <div className="py-2">
              {transactionTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => handleSelect(type.value)}
                  className="w-full flex items-start space-x-3 px-4 py-3 hover:bg-bg-elevated transition-colors text-left"
                >
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${type.color} flex items-center justify-center flex-shrink-0`}>
                    <div className="text-white">
                      {type.icon}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-text-primary">
                      {type.label}
                    </h4>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {type.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </FloatingPortal>
      )}
    </>
  );
}
