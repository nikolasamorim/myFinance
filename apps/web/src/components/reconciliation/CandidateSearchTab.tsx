import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { CandidateCard } from './CandidateCard';
import { SelectCandidateModal } from './SelectCandidateModal';
import type { Transaction, ReconciliationFilters } from '@myfinance/shared';

interface CandidateSearchTabProps {
  filters: ReconciliationFilters;
  selectedId: string | null;
  onSelect: (tx: Transaction) => void;
}

export function CandidateSearchTab({ filters, selectedId, onSelect }: CandidateSearchTabProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">
          Busque vários lançamentos a conciliar até completar o valor total da transação.
        </p>
      </div>

      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent-hover transition-colors w-fit"
      >
        <Search className="w-4 h-4" />
        Buscar
      </button>

      <SelectCandidateModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={onSelect}
        filters={filters}
      />
    </div>
  );
}
