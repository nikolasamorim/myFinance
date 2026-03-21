import React, { useState } from 'react';
import { Search, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useCandidates } from '../../hooks/useReconciliation';
import { formatCurrency, formatDate, cn } from '../../lib/utils';
import type { Transaction, ReconciliationFilters } from '@myfinance/shared';

interface SelectCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (transaction: Transaction) => void;
  filters: ReconciliationFilters;
}

const PAGE_SIZE = 20;

export function SelectCandidateModal({
  isOpen,
  onClose,
  onSelect,
  filters,
}: SelectCandidateModalProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Transaction | null>(null);

  const { data, isLoading } = useCandidates(
    { ...filters, search, page, limit: PAGE_SIZE },
    isOpen
  );
  const candidates = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function handleConfirm() {
    if (selected) {
      onSelect(selected);
      setSelected(null);
      setSearch('');
      setPage(1);
      onClose();
    }
  }

  function handleClose() {
    setSelected(null);
    setSearch('');
    setPage(1);
    onClose();
  }

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Selecionar Lançamentos" size="xl">
      {/* Search */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar lançamento..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-bg-page border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto max-h-[380px] rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-elevated">
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Data</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Descrição</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Tipo</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Status</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Valor</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="text-center py-8 text-text-muted">
                  <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                  Carregando...
                </td>
              </tr>
            )}
            {!isLoading && candidates.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-8 text-text-muted text-sm">
                  Nenhum lançamento encontrado
                </td>
              </tr>
            )}
            {candidates.map((tx: Transaction) => {
              const isSelected = selected?.transaction_id === tx.transaction_id;
              const isIncome = tx.transaction_type === 'income';
              const typeLabel = tx.transaction_type === 'income' ? 'Receita'
                : tx.transaction_type === 'expense' ? 'Despesa'
                : tx.transaction_type === 'debt' ? 'Dívida'
                : 'Investimento';
              return (
                <tr
                  key={tx.transaction_id}
                  onClick={() => setSelected(isSelected ? null : tx)}
                  className={cn(
                    'border-b border-border cursor-pointer transition-colors',
                    isSelected
                      ? 'bg-amber-50 dark:bg-amber-900/20'
                      : 'hover:bg-bg-elevated'
                  )}
                >
                  <td className="px-4 py-3 text-text-secondary whitespace-nowrap">
                    {formatDate(tx.transaction_date)}
                  </td>
                  <td className="px-4 py-3 max-w-[220px]">
                    <span className="text-text-primary font-medium truncate block" title={tx.transaction_description}>
                      {tx.transaction_description}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'text-xs font-medium px-2 py-0.5 rounded-full',
                      isIncome
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                    )}>
                      {typeLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-xs">
                    {tx.transaction_status ?? '—'}
                  </td>
                  <td className={cn(
                    'px-4 py-3 text-right font-semibold whitespace-nowrap',
                    isIncome ? 'text-emerald-600' : 'text-rose-600'
                  )}>
                    {formatCurrency(tx.transaction_amount)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-border">
        {/* Pagination */}
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || isLoading}
            className="p-1 rounded hover:bg-bg-elevated disabled:opacity-40 transition-colors"
            aria-label="Página anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span>
            {total > 0
              ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} de ${total}`
              : '0 resultados'}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || isLoading}
            className="p-1 rounded hover:bg-bg-elevated disabled:opacity-40 transition-colors"
            aria-label="Próxima página"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-text-secondary border border-border rounded-lg hover:bg-bg-elevated transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selected}
            className="px-4 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Utilizar Selecionados
          </button>
        </div>
      </div>
    </Modal>
  );
}
