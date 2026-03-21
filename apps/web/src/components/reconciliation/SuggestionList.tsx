import React from 'react';
import { Loader2 } from 'lucide-react';
import { useSuggestions } from '../../hooks/useReconciliation';
import { CandidateCard } from './CandidateCard';
import type { Transaction } from '@myfinance/shared';

interface SuggestionListProps {
  importedId: string;
  selectedId: string | null;
  onSelect: (tx: Transaction) => void;
}

export function SuggestionList({ importedId, selectedId, onSelect }: SuggestionListProps) {
  const { data: suggestions, isLoading } = useSuggestions(importedId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6 text-text-muted">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        <span className="text-sm">Buscando sugestões...</span>
      </div>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return (
      <div className="flex items-center justify-center py-6">
        <span className="text-sm text-text-muted bg-bg-elevated rounded-lg px-4 py-2">
          Nenhum Lançamento Vinculado
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {suggestions.map(({ transaction, score }) => (
        <CandidateCard
          key={transaction.transaction_id}
          transaction={transaction}
          selected={selectedId === transaction.transaction_id}
          score={score}
          onClick={() => onSelect(transaction)}
        />
      ))}
    </div>
  );
}
