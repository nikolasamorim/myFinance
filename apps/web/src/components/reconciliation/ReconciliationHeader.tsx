import React from 'react';
import { X } from 'lucide-react';
import { useAccounts } from '../../hooks/useAccounts';
import type { Account, ReconciliationFilters } from '@myfinance/shared';

interface ReconciliationHeaderProps {
  filters: ReconciliationFilters;
  onChange: (filters: ReconciliationFilters) => void;
}

export function ReconciliationHeader({ filters, onChange }: ReconciliationHeaderProps) {
  const { data: accounts } = useAccounts({ type: 'all', search: '' });
  const bankAccounts = (accounts ?? []).filter((a: Account) => !a.parent_id);

  const selectedAccount = bankAccounts.find((a: Account) => a.id === filters.account_id);
  const hasDateFilter = !!(filters.start_date || filters.end_date);

  function clearDates() {
    onChange({ ...filters, start_date: undefined, end_date: undefined });
  }

  return (
    <div className="flex items-center justify-between gap-4 bg-bg-page border border-border rounded-xl px-5 py-4">
      {/* Account info */}
      <div className="flex flex-col gap-1">
        {selectedAccount ? (
          <>
            <span className="text-base font-semibold text-text-primary">{selectedAccount.title}</span>
            <span className="text-xs text-text-muted">Agência / Conta</span>
          </>
        ) : (
          <span className="text-base font-semibold text-text-muted">Selecione uma conta</span>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {/* Account select */}
        <select
          value={filters.account_id ?? ''}
          onChange={(e) => onChange({ ...filters, account_id: e.target.value || undefined })}
          className="text-sm bg-bg-page border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          <option value="">Todas as contas</option>
          {bankAccounts.map((a: Account) => (
            <option key={a.id} value={a.id}>{a.title}</option>
          ))}
        </select>

        {/* Date range */}
        <div className="flex items-center gap-1 border border-border rounded-lg px-3 py-2 bg-bg-page">
          <input
            type="date"
            value={filters.start_date ?? ''}
            onChange={(e) => onChange({ ...filters, start_date: e.target.value || undefined })}
            className="text-sm bg-transparent text-text-primary focus:outline-none"
          />
          <span className="text-text-muted text-sm">à</span>
          <input
            type="date"
            value={filters.end_date ?? ''}
            onChange={(e) => onChange({ ...filters, end_date: e.target.value || undefined })}
            className="text-sm bg-transparent text-text-primary focus:outline-none"
          />
        </div>

        {/* Clear dates button — só aparece quando há filtro ativo */}
        {hasDateFilter && (
          <button
            type="button"
            onClick={clearDates}
            title="Limpar filtro de datas"
            className="flex items-center gap-1 px-2.5 py-2 text-xs text-text-secondary border border-border rounded-lg hover:bg-bg-elevated hover:text-rose-500 hover:border-rose-300 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Limpar datas
          </button>
        )}
      </div>
    </div>
  );
}
