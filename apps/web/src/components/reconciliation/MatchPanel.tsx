import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { TabSelector } from '../ui/TabSelector';
import { SuggestionList } from './SuggestionList';
import { CandidateSearchTab } from './CandidateSearchTab';
import { formatCurrency } from '../../lib/utils';
import type { Transaction, ReconciliationFilters } from '@myfinance/shared';

const TABS = [
  { id: 'sugestao', label: 'Sugestão' },
  { id: 'buscar', label: 'Buscar' },
];

interface MatchPanelProps {
  importedTransaction: Transaction;
  filters: ReconciliationFilters;
  selectedCandidate: Transaction | null;
  onSelect: (tx: Transaction) => void;
}

export function MatchPanel({
  importedTransaction,
  filters,
  selectedCandidate,
  onSelect,
}: MatchPanelProps) {
  const [activeTab, setActiveTab] = useState('sugestao');

  const importedAmount = importedTransaction.transaction_amount;
  const selectedAmount = selectedCandidate?.transaction_amount ?? 0;
  const difference = importedAmount - selectedAmount;

  return (
    <div className="border border-border rounded-lg bg-bg-page p-3 flex flex-col gap-3">
      <TabSelector
        tabs={TABS}
        activeTab={activeTab}
        onChange={setActiveTab}
        className="self-start"
      />

      {activeTab === 'sugestao' ? (
        <SuggestionList
          importedId={importedTransaction.transaction_id}
          selectedId={selectedCandidate?.transaction_id ?? null}
          onSelect={onSelect}
        />
      ) : (
        <CandidateSearchTab
          filters={filters}
          selectedId={selectedCandidate?.transaction_id ?? null}
          onSelect={onSelect}
        />
      )}

      {/* Mismatch warning */}
      {selectedCandidate && difference !== 0 && (
        <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>
            Valores divergem em{' '}
            <strong>{formatCurrency(Math.abs(difference))}</strong>. Você pode conciliar mesmo assim.
          </span>
        </div>
      )}

      {/* Totals */}
      <div className="flex items-center justify-end gap-6 text-xs text-text-muted border-t border-border pt-2">
        <div className="flex items-center gap-1">
          <span>Lançamento:</span>
          <span className="font-semibold text-text-primary">
            {formatCurrency(selectedAmount)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span>Diferença:</span>
          <span
            className={
              difference === 0
                ? 'font-semibold text-emerald-600'
                : 'font-semibold text-amber-600'
            }
          >
            {formatCurrency(Math.abs(difference))}
          </span>
        </div>
      </div>
    </div>
  );
}
