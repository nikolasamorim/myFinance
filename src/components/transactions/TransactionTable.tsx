import React, { useState } from 'react';
import { Search, Plus, Edit, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useTransactions, useDeleteTransaction } from '../../hooks/useTransactions';
import { formatCurrency, formatDate } from '../../lib/utils';
import type { Transaction } from '../../types';

interface TransactionTableProps {
  onCreateTransaction: () => void;
  onEditTransaction: (transaction: Transaction) => void;
}

export function TransactionTable({ onCreateTransaction, onEditTransaction }: TransactionTableProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useTransactions(page, 10, search);
  const deleteTransaction = useDeleteTransaction();

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta transação?')) {
      await deleteTransaction.mutateAsync(id);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'income':
        return 'text-green-600 bg-green-50';
      case 'expense':
        return 'text-red-600 bg-red-50';
      case 'debt':
        return 'text-orange-600 bg-orange-50';
      case 'investment':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'income':
        return 'Receita';
      case 'expense':
        return 'Despesa';
      case 'debt':
        return 'Dívida';
      case 'investment':
        return 'Investimento';
      default:
        return type;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Últimas Transações</CardTitle>
          <Button onClick={onCreateTransaction}>
            <Plus className="w-4 h-4 mr-2" />
            Transação
          </Button>
        </div>
        <div className="flex items-center space-x-4 mt-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar transações..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Data</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Descrição</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Tipo</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-600">Valor</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody>
                {data?.data.map((transaction) => (
                  <tr key={transaction.transaction_id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 text-xs text-gray-600">
                      {formatDate(transaction.transaction_date)}
                    </td>
                    <td className="py-2 px-3 text-xs text-gray-900">
                      {transaction.transaction_description}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded-full ${getTypeColor(transaction.transaction_type)}`}>
                        {getTypeLabel(transaction.transaction_type)}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-xs text-right font-medium">
                      {formatCurrency(Number(transaction.transaction_amount))}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => onEditTransaction(transaction)}
                          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(transaction.transaction_id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {data?.data.length === 0 && (
              <div className="text-center py-6 text-xs text-gray-500">
                Nenhuma transação encontrada
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}