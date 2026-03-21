import React from 'react';
import { cn } from '../../lib/utils';
import { formatCurrency, formatDate } from '../../lib/utils';
import type { Transaction } from '@myfinance/shared';

interface CandidateCardProps {
  transaction: Transaction;
  selected?: boolean;
  score?: number;
  onClick: () => void;
}

function ScorePill({ score }: { score: number }) {
  const color =
    score >= 80
      ? 'bg-emerald-100 text-emerald-700'
      : score >= 50
      ? 'bg-amber-100 text-amber-700'
      : 'bg-bg-elevated text-text-muted';
  return (
    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', color)}>
      {score}%
    </span>
  );
}

export function CandidateCard({ transaction, selected, score, onClick }: CandidateCardProps) {
  const isIncome = transaction.transaction_type === 'income';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left border rounded-lg p-3 flex items-center justify-between gap-2 transition-all',
        selected
          ? 'border-accent bg-accent/5'
          : 'border-border bg-bg-page hover:border-accent/50 hover:bg-bg-elevated'
      )}
    >
      <div className="flex flex-col min-w-0">
        <span className="text-xs text-text-muted">{formatDate(transaction.transaction_date)}</span>
        <span
          className="text-sm text-text-primary truncate"
          title={transaction.transaction_description}
        >
          {transaction.transaction_description}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {score !== undefined && <ScorePill score={score} />}
        <span
          className={cn(
            'text-sm font-semibold',
            isIncome ? 'text-emerald-600' : 'text-rose-600'
          )}
        >
          {formatCurrency(transaction.transaction_amount)}
        </span>
      </div>
    </button>
  );
}
