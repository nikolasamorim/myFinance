import React, { useState } from 'react';
import { DollarSign, TrendingDown, CreditCard } from 'lucide-react';
import { StatsCard } from '../components/dashboard/StatsCard';
import { MonthlyChart } from '../components/dashboard/MonthlyChart';
import { TransactionTable } from '../components/transactions/TransactionTable';
import { TransactionModal } from '../components/transactions/TransactionModal';
import { useDashboardStats } from '../hooks/useDashboard';
import { useWorkspace } from '../context/WorkspaceContext';
import type { Transaction } from '../types';

export function Dashboard() {
  const { data: stats, isLoading } = useDashboardStats();
  const { currentWorkspace, loading: workspaceLoading } = useWorkspace();
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>();

  const handleCreateTransaction = () => {
    setEditingTransaction(undefined);
    setIsTransactionModalOpen(true);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsTransactionModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsTransactionModalOpen(false);
    setEditingTransaction(undefined);
  };

  return (
    <div className="space-y-8">
        {/* Mostrar mensagem se não há workspace, mas não bloquear */}
        {!workspaceLoading && !currentWorkspace && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 text-sm">
              Nenhum workspace encontrado. Você pode precisar criar um workspace primeiro.
            </p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCard
            title="Saldo Atual"
            value={isLoading ? 0 : (stats?.currentBalance || 0)}
            icon={<DollarSign className="w-6 h-6 text-gray-600" />}
          />
          <StatsCard
            title="Gastos Acumulados"
            value={isLoading ? 0 : (stats?.totalExpenses || 0)}
            icon={<TrendingDown className="w-6 h-6 text-gray-600" />}
          />
          <StatsCard
            title="Dívidas"
            value={isLoading ? 0 : (stats?.totalDebts || 0)}
            icon={<CreditCard className="w-6 h-6 text-gray-600" />}
          />
        </div>

        {/* Monthly Chart */}
        <div>
          <MonthlyChart data={isLoading ? [] : (stats?.monthlyComparison || [])} />
        </div>

        {/* Transactions Table */}
        <TransactionTable
          onCreateTransaction={handleCreateTransaction}
          onEditTransaction={handleEditTransaction}
        />
      </div>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={handleCloseModal}
        transaction={editingTransaction}
      />
  );
}