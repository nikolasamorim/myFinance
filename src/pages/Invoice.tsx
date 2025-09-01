import React, { useState, useMemo } from 'react';
import { Filter, Calendar, DollarSign, TrendingUp, TrendingDown, AlertTriangle,
   Landmark, CreditCard, SquareKanban, CheckCircle, Clock, Circle, AlertCircle,
   XCircle
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Dropdown } from '../components/ui/Dropdown';
import { TransactionTypeSelector } from '../components/ui/TransactionTypeSelector';
import { TransactionModal } from '../components/transactions/TransactionModal';
import { AdvancedTransactionModal } from '../components/transactions/AdvancedTransactionModal';
import { useAdvancedTransactions } from '../hooks/useAdvancedTransactions';
// import { MonthlyChart } from '../components/Dashboard/MonthlyChart';
import { useInvoiceData } from '../hooks/useInvoiceData';
import { useWorkspace } from '../context/WorkspaceContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { cn } from '../lib/utils';
import type { Transaction, AdvancedTransactionData } from '../types';

interface InvoiceFilters {
  period: 'current_month' | 'last_month' | 'current_year' | 'custom' | 'all';
  category: string;
  search: string;
  // opcionais para período personalizado (YYYY-MM-DD)
  startDate?: string;
  endDate?: string;
}

interface MonthlyData {
  month: string;        // yyyy-MM
  monthName: string;    // ex: set. de 2025
  year: number;
  income: number;
  expense: number;
  debtReceived: number;
  debtPaid: number;
  isCurrentMonth: boolean;
  isSelected: boolean;
}

export function Invoice() {
  const { currentWorkspace, loading: workspaceLoading } = useWorkspace();
  const { createAdvancedTransaction } = useAdvancedTransactions();
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isAdvancedModalOpen, setIsAdvancedModalOpen] = useState(false);
  const [selectedTransactionType, setSelectedTransactionType] = useState<'income' | 'expense' | 'debt' | 'investment'>('expense');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<InvoiceFilters>({
    period: 'current_month',
    category: 'all',
    search: '',
  });

  // Dados principais (respeitam os filtros para cards de resumo/tabela)
  const { 
    data: invoiceData, 
    isLoading
  } = useInvoiceData(currentWorkspace?.workspace_id, filters);

  const recentTransactions = invoiceData?.recentTransactions ?? [];

  // Dados "ALL" só para o carrossel de meses (ignora período do filtro)
  const {
    data: invoiceAllData
  } = useInvoiceData(currentWorkspace?.workspace_id, { ...filters, period: 'all' });

  // Helpers de período selecionado (apenas para estilização/seleção do carrossel)
  const getPeriodRange = React.useCallback(() => {
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear(), 11, 31);

    switch (filters.period) {
      case 'current_month':
        return { start: startOfCurrentMonth, end: new Date(now.getFullYear(), now.getMonth() + 1, 0) };
      case 'last_month':
        return { start: startOfLastMonth, end: endOfLastMonth };
      case 'current_year':
        return { start: startOfYear, end: endOfYear };
      case 'custom': {
        // Se vierem no filtro, usa; senão, não seleciona nada especificamente
        if (filters.startDate && filters.endDate) {
          return { start: new Date(filters.startDate), end: new Date(filters.endDate) };
        }
        return null;
      }
      case 'all':
      default:
        return null; // "all" => não destacar por período
    }
  }, [filters]);

  const isMonthSelected = React.useCallback((date: Date) => {
    const range = getPeriodRange();
    if (!range) return false;
    // seleciona o mês se qualquer dia do mês cair dentro do range
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return endOfMonth >= range.start && startOfMonth <= range.end;
  }, [getPeriodRange]);

  // Geração dos meses (sempre 6 antes, atual e 5 depois) usando *invoiceAllData*
  const monthlyData = useMemo<MonthlyData[]>(() => {
    const months: MonthlyData[] = [];
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const monthsToGenerate: number[] = [];
    for (let i = 6; i >= 1; i--) monthsToGenerate.push(-i);
    monthsToGenerate.push(0);
    for (let i = 1; i <= 5; i++) monthsToGenerate.push(i);

    monthsToGenerate.forEach((i) => {
      const date = new Date(currentYear, currentMonth + i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      const breakdown = invoiceAllData?.monthlyBreakdown?.[monthKey] || {};
      const income = breakdown?.income || 0;
      const expense = breakdown?.expense || 0;
      const debtIn = breakdown?.debtIn || 0;
      const debtOut = breakdown?.debtOut || 0;

      months.push({
        month: monthKey,
        monthName: date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
        year: date.getFullYear(),
        income,
        expense,
        debtReceived: debtIn,
        debtPaid: debtOut,
        isCurrentMonth: i === 0,
        isSelected: isMonthSelected(date),
      });
    });

    return months;
  }, [invoiceAllData?.monthlyBreakdown, isMonthSelected]);

  // Auto-scroll: prioriza primeiro mês selecionado; se não houver, vai para o mês atual
  React.useEffect(() => {
    if (!invoiceAllData || monthlyData.length === 0) return;

    const scrollContainer = document.getElementById('monthly-scroll');
    const target =
      document.getElementById('selected-month-card') ||
      document.getElementById('current-month-card');

    if (scrollContainer && target) {
      const cs = getComputedStyle(scrollContainer);
      const paddingLeft = parseFloat(cs.paddingLeft) || 0;
      const extraOffset = 8;

      const containerRect = scrollContainer.getBoundingClientRect();
      const cardRect = target.getBoundingClientRect();

      const left =
        scrollContainer.scrollLeft + (cardRect.left - containerRect.left) - paddingLeft - extraOffset;

      scrollContainer.scrollTo({
        left: Math.max(0, Math.round(left)),
        behavior: 'smooth'
      });
    }
  }, [invoiceAllData, monthlyData]);

  const handleFilterChange = (key: keyof InvoiceFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value as any }));
  };

  const handleCreateTransaction = (type: 'income' | 'expense' | 'debt' | 'investment') => {
    setEditingTransaction(undefined);
    setSelectedTransactionType(type);
    setIsAdvancedModalOpen(true);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsTransactionModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsTransactionModalOpen(false);
    setIsAdvancedModalOpen(false);
    setEditingTransaction(undefined);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
      case 'received':
        return 'text-green-600 bg-green-50';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Pago';
      case 'received':
        return 'Recebido';
      case 'pending':
        return 'Pendente';
      default:
        return status;
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
      default:
        return type;
    }
  };

  const periodOptions = [
    { value: 'current_month', label: 'Mês atual' },
    { value: 'last_month', label: 'Último mês' },
    { value: 'current_year', label: 'Ano atual' },
    { value: 'custom', label: 'Personalizado' },
    { value: 'all', label: 'Tudo' },
  ];

  if (workspaceLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  function getTypeIcon(type: string) {
    switch (type) {
      case "income":
        return <TrendingUp className="p-1.5 rounded-lg bg-green-100 text-green-600" />;
      case "expense":
        return <TrendingDown className="p-1.5 rounded-lg bg-red-100 text-red-600" />;
      case "debt":
        return <AlertTriangle className="p-1.5 rounded-lg bg-orange-100 text-orange-600" />;
      case "investment":
        return <Landmark className="p-1.5 rounded-lg bg-blue-100 text-blue-600" />;
      default:
        return null;
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "paid":
        return <CheckCircle className="p-1.5 rounded-lg bg-green-600 text-green-50" />;
      case "pending":
        return <Clock className="p-1.5 rounded-lg bg-yellow-500 text-yellow-50" />;
      case "open":
        return <Circle className="p-1.5 rounded-lg bg-blue-500 text-blue-50" />;
      case "overdue":
        return <AlertCircle className="p-1.5 rounded-lg bg-red-600 text-red-50" />;
      case "scheduled":
        return <Calendar className="p-1.5 rounded-lg bg-indigo-500 text-indigo-50" />;
      case "canceled":
        return <XCircle className="p-1.5 rounded-lg bg-gray-500 text-gray-50" />;
      default:
        return null;
    }
  }

  return (
    <>
      <div className="space-y-4 sm:space-y-6 w-full min-w-0 ">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 px-1 sm:px-0">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="p-1.5 sm:p-2 bg-purple-100 rounded-lg flex-shrink-0">
              <SquareKanban className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Faturas</h1>
              <p className="text-sm sm:text-base text-gray-600">Visão geral das suas faturas</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3 flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Filtros
            </Button>
            <TransactionTypeSelector
              onSelect={handleCreateTransaction}
              className="h-7 px-2.5 text-xs"
            />
          </div>
        </div>
      </div>
    </>
  );
}