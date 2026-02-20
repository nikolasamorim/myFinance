import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, TrendingUp, TrendingDown, AlertTriangle, PiggyBank } from 'lucide-react';
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
  // {
  //   value: 'debt',
  //   label: 'Dívida',
  //   description: 'Valores devidos',
  //   icon: <AlertTriangle className="w-5 h-5" />,
  //   color: 'from-orange-500 to-red-600',
  // },
  // {
  //   value: 'investment',
  //   label: 'Investimento',
  //   description: 'Aplicações financeiras',
  //   icon: <PiggyBank className="w-5 h-5" />,
  //   color: 'from-blue-500 to-indigo-600',
  // },
];

export function TransactionTypeSelector({ onSelect, trigger, className }: TransactionTypeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Floating UI setup
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
        'flex items-center space-x-2 px-3 py-1.5 text-sm font-medium bg-black text-white rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors',
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
      {/* Trigger button */}
      <div
        ref={refs.setReference}
        {...getReferenceProps()}
      >
        {trigger || defaultTrigger}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-80 overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-900">Selecione o tipo de transação</h3>
              <p className="text-xs text-gray-600 mt-1">Escolha o tipo antes de preencher os dados</p>
            </div>

            {/* Transaction Types */}
            <div className="py-2">
              {transactionTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => handleSelect(type.value)}
                  className="w-full flex items-start space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${type.color} flex items-center justify-center flex-shrink-0`}>
                    <div className="text-white ignoreOverride">
                      {type.icon}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-gray-900">
                      {type.label}
                    </h4>
                    <p className="text-xs text-gray-600 mt-0.5">
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