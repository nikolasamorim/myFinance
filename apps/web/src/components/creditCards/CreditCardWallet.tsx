import React from 'react';
import { CreditCard, Edit, Trash2, Calendar, DollarSign, Wallet } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { cn } from '../../lib/utils';

interface CreditCardData {
  id: string;
  title: string;
  flag: string;
  limit: number;
  initial_balance: number;
  due_day: number;
  closing_day: number;
  color?: string;
  icon?: string;
  last_four_digits?: string;
}

interface CreditCardWalletProps {
  cards: CreditCardData[];
  onEdit: (card: CreditCardData) => void;
  onDelete: (id: string) => void;
}

export function CreditCardWallet({ cards, onEdit, onDelete }: CreditCardWalletProps) {
  const renderIcon = (iconName?: string) => {
    if (!iconName) return <CreditCard className="w-5 h-5" />;
    
    const IconComponent = LucideIcons[iconName as keyof typeof LucideIcons] as React.ComponentType<any>;
    if (!IconComponent) return <CreditCard className="w-5 h-5" />;
    
    return <IconComponent className="w-5 h-5" />;
  };

  const getUtilizationPercentage = (current: number, limit: number) => {
    if (limit === 0) return 0;
    return Math.min((current / limit) * 100, 100);
  };

  const getUtilizationColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (cards.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-bg-elevated rounded-xl mx-auto mb-4 flex items-center justify-center">
          <CreditCard className="w-8 h-8 text-text-muted" />
        </div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          Nenhum cartão cadastrado
        </h3>
        <p className="text-text-secondary">
          Comece adicionando seu primeiro cartão de crédito
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {cards.map((card) => {
        const utilizationPercentage = getUtilizationPercentage(card.initial_balance, card.limit);
        const utilizationColor = getUtilizationColor(utilizationPercentage);
        
        return (
          <div
            key={card.id}
            className="group relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 ignoreOverride"
            style={{
              background: card.color 
                ? `linear-gradient(135deg, ${card.color}, ${card.color}dd)`
                : 'linear-gradient(135deg, #1f2937, #374151)'
            }}
          >
            {/* Card Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-white bg-opacity-20 rounded-lg ignoreOverride">
                  {renderIcon(card.icon)}
                </div>
                <div>
                  <h3 className="font-semibold text-sm truncate max-w-32">
                    {card.title}
                  </h3>
                  <p className="text-xs opacity-80 capitalize">
                    {card.flag}
                  </p>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onEdit(card)}
                  className="p-1.5 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors ignoreOverride"
                  title="Editar"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDelete(card.id)}
                  className="p-1.5 bg-red-500 bg-opacity-80 rounded-lg hover:bg-opacity-100 transition-colors"
                  title="Excluir"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Card Number */}
            <div className="mb-4">
              <p className="text-xs opacity-60 mb-1">Número do cartão</p>
              <p className="font-mono text-lg tracking-wider">
                •••• •••• •••• {card.last_four_digits || '0000'}
              </p>
            </div>

            {/* Balance and Limit */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs opacity-60">Saldo inicial</p>
                  <p className="font-semibold">
                    {formatCurrency(card.initial_balance)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs opacity-60">Limite</p>
                  <p className="font-semibold">
                    {formatCurrency(card.limit)}
                  </p>
                </div>
              </div>

              {/* Utilization Bar */}
              <div>
                <div className="flex justify-between text-xs opacity-60 mb-1">
                  <span>Utilização</span>
                  <span>{utilizationPercentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-white bg-opacity-20 rounded-full h-2 ignoreOverride">
                  <div
                    className={cn('h-2 rounded-full transition-all', utilizationColor)}
                    style={{ width: `${utilizationPercentage}%` }}
                  />
                </div>
              </div>

              {/* Due Date */}
              <div className="space-y-2 pt-2 border-t border-white border-opacity-20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 opacity-60" />
                    <span className="text-xs opacity-60">Vencimento</span>
                  </div>
                  <span className="text-xs font-medium">
                    Dia {card.due_day}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}