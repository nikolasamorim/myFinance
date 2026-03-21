import React, { useState } from 'react';
import { Unlink, Loader2 } from 'lucide-react';
import { ImportedTransactionCard } from './ImportedTransactionCard';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { formatCurrency, formatDate, cn } from '../../lib/utils';
import type { ReconciliationRow } from '@myfinance/shared';
import { useDereconcile } from '../../hooks/useReconciliation';

interface ReconciliationPairRowProps {
  row: ReconciliationRow;
}

export function ReconciliationPairRow({ row }: ReconciliationPairRowProps) {
  const dereconcile = useDereconcile();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isIncome = row.system.transaction_type === 'income';

  function handleDereconcile() {
    dereconcile.mutate(row.reconciliation.id);
    setConfirmOpen(false);
  }

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-start">
      {/* Left: imported */}
      <ImportedTransactionCard transaction={row.imported} />

      {/* Center: link indicator */}
      <div className="flex flex-col items-center justify-center gap-2 pt-2">
        <div className="w-px h-8 bg-emerald-200" />
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={dereconcile.isPending}
          title="Desconciliar"
          className="p-1.5 text-text-muted hover:text-rose-500 border border-border rounded-lg hover:border-rose-300 transition-colors disabled:opacity-50"
        >
          {dereconcile.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Unlink className="w-4 h-4" />
          )}
        </button>
        {dereconcile.isError && (
          <p className="text-xs text-rose-600 text-center max-w-[60px]">
            Erro ao desfazer
          </p>
        )}
        <div className="w-px h-8 bg-emerald-200" />
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Desconciliar"
        description="O vínculo entre o extrato bancário e o lançamento do sistema será removido. Os lançamentos voltarão para a fila de pendentes."
        confirmLabel="Desconciliar"
        destructive
        loading={dereconcile.isPending}
        onConfirm={handleDereconcile}
        onCancel={() => setConfirmOpen(false)}
      />

      {/* Right: system transaction */}
      <div className="border border-emerald-200 bg-emerald-50/50 rounded-lg p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-emerald-700 border border-emerald-300 rounded px-2 py-0.5">
            Sistema
          </span>
          <span className="text-xs text-text-muted">
            Conciliado em {formatDate(row.reconciliation.reconciled_at)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col">
            <span className="text-xs text-text-muted">
              {formatDate(row.system.transaction_date)}
            </span>
            <span
              className="text-sm text-text-primary truncate max-w-[200px]"
              title={row.system.transaction_description}
            >
              {row.system.transaction_description}
            </span>
          </div>
          <span
            className={cn(
              'text-sm font-semibold whitespace-nowrap',
              isIncome ? 'text-emerald-600' : 'text-rose-600'
            )}
          >
            {formatCurrency(row.system.transaction_amount)}
          </span>
        </div>
      </div>
    </div>
  );
}
