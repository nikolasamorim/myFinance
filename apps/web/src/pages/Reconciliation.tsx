import React, { useState } from 'react';
import { GitMerge, Loader2, RotateCcw, ArrowLeft } from 'lucide-react';
import { TabSelector } from '../components/ui/TabSelector';
import { ReconciliationHeader } from '../components/reconciliation/ReconciliationHeader';
import { ReconciliationAccountGrid } from '../components/reconciliation/ReconciliationAccountGrid';
import { ImportedTransactionCard } from '../components/reconciliation/ImportedTransactionCard';
import { MatchPanel } from '../components/reconciliation/MatchPanel';
import { ReconciliationPairRow } from '../components/reconciliation/ReconciliationPairRow';
import {
  useImportedTransactions,
  useReconciledTransactions,
  useReconcile,
  useIgnore,
  useUnignore,
} from '../hooks/useReconciliation';
import type {
  ReconciliationFilters,
  ReconciliationTab,
  Transaction,
  ImportedTransactionWithStatus,
} from '@myfinance/shared';

// ─── Row in Pendentes tab ─────────────────────────────────────────────────────

function PendentesRow({
  item,
  filters,
}: {
  item: ImportedTransactionWithStatus;
  filters: ReconciliationFilters;
}) {
  const [selectedCandidate, setSelectedCandidate] = useState<Transaction | null>(null);
  const reconcile = useReconcile();
  const ignore = useIgnore();

  async function handleReconcile() {
    if (!selectedCandidate) return;
    try {
      await reconcile.mutateAsync({
        imported_transaction_id: item.transaction.transaction_id,
        system_transaction_id: selectedCandidate.transaction_id,
      });
      setSelectedCandidate(null);
    } catch {
      // erro exibido via reconcile.error abaixo
    }
  }

  return (
    <div className="flex items-start gap-3">
      {/* Left: imported transaction */}
      <div className="flex-1 min-w-0">
        <ImportedTransactionCard
          transaction={item.transaction}
          onIgnore={() => ignore.mutate(item.transaction.transaction_id)}
          ignoring={ignore.isPending}
        />
        {ignore.isError && (
          <p className="mt-1 text-xs text-rose-600">
            Erro ao ignorar: {(ignore.error as Error)?.message ?? 'Tente novamente.'}
          </p>
        )}
      </div>

      {/* Center: Conciliar button */}
      <div className="flex flex-col items-center gap-1 pt-8">
        <button
          type="button"
          onClick={handleReconcile}
          disabled={!selectedCandidate || reconcile.isPending}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {reconcile.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <GitMerge className="w-4 h-4" />
          )}
          Conciliar
        </button>
        {reconcile.isError && (
          <p className="text-xs text-rose-600 text-center max-w-[120px]">
            {(reconcile.error as Error)?.message ?? 'Erro. Tente novamente.'}
          </p>
        )}
      </div>

      {/* Right: match panel */}
      <div className="flex-1 min-w-0">
        <MatchPanel
          importedTransaction={item.transaction}
          filters={filters}
          selectedCandidate={selectedCandidate}
          onSelect={setSelectedCandidate}
        />
      </div>
    </div>
  );
}

// ─── Ignorados row ────────────────────────────────────────────────────────────

function IgnoradosRow({ item }: { item: ImportedTransactionWithStatus }) {
  const unignore = useUnignore();

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <ImportedTransactionCard transaction={item.transaction} />
      </div>
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={() => unignore.mutate(item.transaction.transaction_id)}
          disabled={unignore.isPending}
          className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary border border-border rounded-lg hover:bg-bg-elevated transition-colors disabled:opacity-50"
          title="Remover ignorado"
        >
          {unignore.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RotateCcw className="w-4 h-4" />
          )}
          Restaurar
        </button>
        {unignore.isError && (
          <p className="text-xs text-rose-600">
            {(unignore.error as Error)?.message ?? 'Erro. Tente novamente.'}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <GitMerge className="w-12 h-12 text-text-muted mb-4" />
      <p className="text-text-muted text-sm">{message}</p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function Reconciliation() {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ReconciliationTab>('pendentes');
  const [filters, setFilters] = useState<ReconciliationFilters>({});

  // Landing: account grid
  if (!selectedAccountId) {
    return (
      <ReconciliationAccountGrid
        onSelectAccount={(id) => {
          setSelectedAccountId(id);
          setFilters({});
          setActiveTab('pendentes');
        }}
      />
    );
  }

  // Detail view filtered by selected account
  const effectiveFilters: ReconciliationFilters = { ...filters, account_id: selectedAccountId };

  return <ReconciliationDetail
    onBack={() => setSelectedAccountId(null)}
    activeTab={activeTab}
    setActiveTab={setActiveTab}
    filters={effectiveFilters}
    setFilters={(f) => setFilters({ ...f, account_id: undefined })}
  />;
}

interface ReconciliationDetailProps {
  onBack: () => void;
  activeTab: ReconciliationTab;
  setActiveTab: (tab: ReconciliationTab) => void;
  filters: ReconciliationFilters;
  setFilters: (f: ReconciliationFilters) => void;
}

function ReconciliationDetail({
  onBack,
  activeTab,
  setActiveTab,
  filters,
  setFilters,
}: ReconciliationDetailProps) {
  const pendentesQuery = useImportedTransactions(filters, 'pendentes');
  const conciliadosQuery = useReconciledTransactions(filters);
  const ignoradosQuery = useImportedTransactions(filters, 'ignorados');

  const pendentes = pendentesQuery.data ?? [];
  const conciliados = conciliadosQuery.data ?? [];
  const ignorados = ignoradosQuery.data ?? [];

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        Todas as contas
      </button>

      {/* Header */}
      <ReconciliationHeader filters={filters} onChange={setFilters} />

      {/* Tabs */}
      <div className="flex justify-center">
        <TabSelector
          tabs={[
            { id: 'conciliados', label: `Conciliados${conciliados.length > 0 ? ` (${conciliados.length})` : ''}` },
            { id: 'pendentes', label: `Pendentes${pendentes.length > 0 ? ` (${pendentes.length})` : ''}` },
            { id: 'ignorados', label: `Ignorados${ignorados.length > 0 ? ` (${ignorados.length})` : ''}` },
          ]}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as ReconciliationTab)}
        />
      </div>

      {/* Content */}
      {activeTab === 'pendentes' && (
        <div className="flex flex-col gap-6">
          {/* Column headers */}
          {pendentes.length > 0 && (
            <div className="grid grid-cols-[1fr_auto_1fr] gap-3 px-1">
              <h3 className="text-sm font-semibold text-text-primary">Transações Importadas</h3>
              <div />
              <h3 className="text-sm font-semibold text-text-primary">Lançamentos a Conciliar</h3>
            </div>
          )}

          {pendentesQuery.isLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
            </div>
          )}

          {!pendentesQuery.isLoading && pendentes.length === 0 && (
            <EmptyState message="Nenhuma transação pendente de conciliação." />
          )}

          {pendentes.map((item) => (
            <PendentesRow
              key={item.transaction.transaction_id}
              item={item}
              filters={filters}
            />
          ))}
        </div>
      )}

      {activeTab === 'conciliados' && (
        <div className="flex flex-col gap-4">
          {conciliadosQuery.isLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
            </div>
          )}

          {!conciliadosQuery.isLoading && conciliados.length === 0 && (
            <EmptyState message="Nenhuma conciliação realizada ainda." />
          )}

          {conciliados.map((row) => (
            <ReconciliationPairRow key={row.reconciliation.id} row={row} />
          ))}
        </div>
      )}

      {activeTab === 'ignorados' && (
        <div className="flex flex-col gap-3">
          {ignoradosQuery.isLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
            </div>
          )}

          {!ignoradosQuery.isLoading && ignorados.length === 0 && (
            <EmptyState message="Nenhuma transação ignorada." />
          )}

          {ignorados.map((item) => (
            <IgnoradosRow key={item.transaction.transaction_id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
