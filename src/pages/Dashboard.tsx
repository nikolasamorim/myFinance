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
    <>
      <div className="space-y-8">
        {/* Mostrar mensagem se não há workspace, mas não bloquear */}
        {!workspaceLoading && !currentWorkspace && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 text-sm">
              Nenhum workspace encontrado. Você pode precisar criar um workspace primeiro.
            </p>
          </div>
        )}

        <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">Visualize um resumo das suas transações</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </Button>
            <Button onClick={handleCreateReceita}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Receita
            </Button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <Dropdown
                    options={statusOptions}
                    value={filters.status}
                    onChange={(value) => handleFilterChange('status', value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <Dropdown
                    options={typeOptions}
                    value={filters.type}
                    onChange={(value) => handleFilterChange('type', value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Parceladas</label>
                  <Dropdown
                    options={installmentOptions}
                    value={filters.installments}
                    onChange={(value) => handleFilterChange('installments', value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
                  <Dropdown
                    options={periodOptions}
                    value={filters.period}
                    onChange={(value) => handleFilterChange('period', value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
                  <Input
                    placeholder="Buscar por título..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
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
    </>
  );
}