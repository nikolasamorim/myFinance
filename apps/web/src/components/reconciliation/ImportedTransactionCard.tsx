import React from 'react';
import { EyeOff, FileDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatCurrency, formatDate } from '../../lib/utils';
import type { Transaction } from '@myfinance/shared';

interface ImportedTransactionCardProps {
  transaction: Transaction;
  onIgnore?: () => void;
  ignoring?: boolean;
  className?: string;
}

export function ImportedTransactionCard({
  transaction,
  onIgnore,
  ignoring,
  className,
}: ImportedTransactionCardProps) {
  const isIncome = transaction.transaction_type === 'income';

  return (
    <div
      className={cn(
        'border border-border rounded-lg bg-bg-page p-3 flex flex-col gap-2',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-accent border border-accent rounded px-2 py-0.5 flex items-center gap-1">
          <FileDown className="w-3 h-3" />
          Transação
        </span>
        {onIgnore && (
          <button
            type="button"
            onClick={onIgnore}
            disabled={ignoring}
            title="Ignorar esta transação"
            className="text-text-muted hover:text-text-secondary transition-colors disabled:opacity-50"
          >
            <EyeOff className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-xs text-text-muted">
            {formatDate(transaction.transaction_date)}
          </span>
          <span className="text-sm text-text-primary truncate max-w-[200px]" title={transaction.transaction_description}>
            {transaction.transaction_description}
          </span>
        </div>
        <span
          className={cn(
            'text-sm font-semibold whitespace-nowrap',
            isIncome ? 'text-emerald-600' : 'text-rose-600'
          )}
        >
          {formatCurrency(transaction.transaction_amount)}
        </span>
      </div>
    </div>
  );
}
