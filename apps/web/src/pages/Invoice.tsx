import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { KanbanSquare as SquareKanban, ChevronLeft, ChevronRight, CreditCard, Calendar, DollarSign, CheckCircle, AlertTriangle, Wallet, ArrowRightLeft } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Dropdown } from '../components/ui/Dropdown';
import { Modal } from '../components/ui/Modal';
import { BreadcrumbBar } from '../components/ui/BreadcrumbBar';
import { VisualizationToolbar } from '../components/ui/VisualizationToolbar';
import { FiltersPanel } from '../components/ui/FiltersPanel';
import { SortPanel } from '../components/ui/SortPanel';
import type { FilterField } from '../components/ui/FiltersPanel';
import type { SortOption } from '../components/ui/SortPanel';
import { useWorkspace } from '../context/WorkspaceContext';
import { useCreditCards } from '../hooks/useCreditCards';
import { useStatement, useStatementItems, useStatementMutations } from '../hooks/useStatements';
import { formatCurrency, formatDate } from '../lib/utils';

const typeOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'purchase', label: 'Compras' },
  { value: 'installment', label: 'Parcelas' },
  { value: 'refund', label: 'Estornos' },
  { value: 'payment', label: 'Pagamentos' },
  { value: 'adjustment', label: 'Ajustes' },
];

const paymentMethodOptions = [
  { value: 'pix', label: 'PIX' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'ted', label: 'TED' },
  { value: 'dda', label: 'Débito Automático' },
];

const invoiceFilterFields: FilterField[] = [
  { key: 'type', label: 'Tipo', type: 'dropdown', options: typeOptions },
  { key: 'search', label: 'Buscar', type: 'text', placeholder: 'Buscar itens...' },
];

const invoiceSortOptions: SortOption[] = [
  { value: 'date_desc', label: 'Data (mais recente)' },
  { value: 'date_asc', label: 'Data (mais antiga)' },
  { value: 'amount_desc', label: 'Valor (maior primeiro)' },
  { value: 'amount_asc', label: 'Valor (menor primeiro)' },
];

function Invoice() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [sortBy, setSortBy] = useState<string>('date_desc');
  const [filters, setFilters] = useState({ type: 'all', search: '' });
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    paid_at: new Date().toISOString().split('T')[0],
    method: 'pix',
  });

  const { data: creditCards = [] } = useCreditCards({ search: '' });

  const cardId = searchParams.get('cardId') || creditCards[0]?.id;
  const period = searchParams.get('period') || new Date().toISOString().slice(0, 7);

  const { data: statement, isLoading } = useStatement(cardId, period);
  const { data: items = [] } = useStatementItems(cardId, statement?.id, filters);
  const { closeStatement, registerPayment, moveItemToNextCycle } = useStatementMutations(cardId);

  useEffect(() => {
    if (creditCards.length > 0 && !searchParams.get('cardId')) {
      setSearchParams({ cardId: creditCards[0].id, period });
    }
  }, [creditCards, searchParams, setSearchParams, period]);

  const handleCardChange = (newCardId: string) => {
    setSearchParams({ cardId: newCardId, period });
  };

  const handlePeriodChange = (direction: 'prev' | 'next') => {
    const currentDate = new Date(period + '-01');
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    const newPeriod = newDate.toISOString().slice(0, 7);
    setSearchParams({ cardId: cardId!, period: newPeriod });
  };

  const handleCloseStatement = async () => {
    if (!statement?.id) return;
    if (!window.confirm('Fechar esta fatura? Esta ação não pode ser desfeita.')) return;

    try {
      await closeStatement.mutateAsync(statement.id);
    } catch (error) {
      alert('Erro ao fechar fatura');
    }
  };

  const handleRegisterPayment = async () => {
    if (!statement?.id) return;

    try {
      await registerPayment.mutateAsync({
        statementId: statement.id,
        paymentData,
      });
      setShowPaymentModal(false);
      setPaymentData({
        amount: 0,
        paid_at: new Date().toISOString().split('T')[0],
        method: 'pix',
      });
    } catch (error) {
      alert('Erro ao registrar pagamento');
    }
  };

  const handleMoveItem = async (itemId: string) => {
    try {
      await moveItemToNextCycle.mutateAsync(itemId);
    } catch (error) {
      alert('Erro ao mover item');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-blue-600 bg-blue-50';
      case 'closed': return 'text-gray-600 bg-gray-50';
      case 'paid_partial': return 'text-yellow-600 bg-yellow-50';
      case 'paid_full': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return 'Aberta';
      case 'closed': return 'Fechada';
      case 'paid_partial': return 'Pago Parcial';
      case 'paid_full': return 'Pago Total';
      default: return status;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'purchase': return 'text-red-600 bg-red-50';
      case 'installment': return 'text-purple-600 bg-purple-50';
      case 'refund': return 'text-green-600 bg-green-50';
      case 'payment': return 'text-blue-600 bg-blue-50';
      case 'adjustment': return 'text-orange-600 bg-orange-50';
      case 'carry_forward': return 'text-amber-600 bg-amber-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'purchase': return 'Compra';
      case 'installment': return 'Parcela';
      case 'refund': return 'Estorno';
      case 'payment': return 'Pagamento';
      case 'adjustment': return 'Ajuste';
      case 'carry_forward': return 'Saldo Ant.';
      default: return type;
    }
  };

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'pix': return 'PIX';
      case 'boleto': return 'Boleto';
      case 'ted': return 'TED';
      case 'dda': return 'Débito Automático';
      default: return method;
    }
  };

  const handleApplyFilters = (newFilters: Record<string, string>) => {
    setFilters({
      type: newFilters.type || 'all',
      search: newFilters.search || '',
    });
  };

  const handleApplySort = (newSort: string) => {
    setSortBy(newSort);
  };

  const cardOptions = creditCards.map(card => ({
    value: card.id,
    label: card.title,
    icon: <CreditCard className="w-4 h-4" />,
  }));

  const periodDate = new Date(period + '-01');
  const periodLabel = periodDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      switch (sortBy) {
        case 'date_desc':
          return new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime();
        case 'date_asc':
          return new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime();
        case 'amount_desc':
          return Math.abs(b.amount) - Math.abs(a.amount);
        case 'amount_asc':
          return Math.abs(a.amount) - Math.abs(b.amount);
        default:
          return 0;
      }
    });
  }, [items, sortBy]);

  return (
    <>
      {isLoading ? (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6 w-full min-w-0">
          {/* Standard Top Bar (Navigation + Global Actions) */}
          <div className="flex items-center justify-between px-1 sm:px-0">
            <BreadcrumbBar segments={['Gerenciadores', 'Faturas']} onBack={() => navigate('/dashboard')} />
            <div className="relative">
              <VisualizationToolbar
                onFilter={() => setShowFilters(prev => !prev)}
                onSort={() => setShowSort(prev => !prev)}
                onShare={() => { }}
                onSettings={() => { }}
                activeFilter={filters.type !== 'all' || filters.search !== ''}
              />
              <FiltersPanel
                isOpen={showFilters}
                onClose={() => setShowFilters(false)}
                fields={invoiceFilterFields}
                currentFilters={filters as unknown as Record<string, string>}
                defaultFilters={{ type: 'all', search: '' }}
                onApply={handleApplyFilters}
              />
              <SortPanel
                isOpen={showSort}
                onClose={() => setShowSort(false)}
                options={invoiceSortOptions}
                currentSort={sortBy}
                onApply={handleApplySort}
              />
            </div>
          </div>

          {/* Page Header (Title + Local Actions) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 px-1 sm:px-0">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="p-1.5 sm:p-2 bg-purple-100 rounded-lg flex-shrink-0">
                <SquareKanban className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Faturas</h1>
                <p className="text-sm sm:text-base text-gray-600">Gerencie faturas de cartão de crédito</p>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="px-1 sm:px-0">
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                  <div className="flex items-center space-x-3">
                    <div className="w-48">
                      <Dropdown
                        options={cardOptions}
                        value={cardId || ''}
                        onChange={handleCardChange}
                        placeholder="Selecione um cartão"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePeriodChange('prev')}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="text-sm font-medium text-gray-900 min-w-32 text-center capitalize">
                        {periodLabel}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePeriodChange('next')}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {statement && (
                    <div className="flex items-center space-x-2">
                      {statement.status === 'open' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowPaymentModal(true)}
                          >
                            <DollarSign className="w-4 h-4 mr-1" />
                            Registrar Pagamento
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCloseStatement}
                          >
                            Fechar Fatura
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>


          {/* Statement Summary */}
          {statement && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 px-1 sm:px-0">
              <Card>
                <CardContent className="p-3 sm:p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-gray-600">Valor da Fatura</p>
                      <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mt-1">
                        {formatCurrency(statement.statement_amount)}
                      </p>
                      {statement.total_paid > 0 && (
                        <p className="text-xs text-green-600 mt-0.5">
                          Pago: {formatCurrency(statement.total_paid)}
                        </p>
                      )}
                    </div>
                    <div className="p-2 sm:p-3 bg-purple-100 rounded-lg flex-shrink-0">
                      <SquareKanban className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-gray-600">Pagamento Mínimo</p>
                      <p className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-600 mt-1">
                        {formatCurrency(statement.min_payment_amount)}
                      </p>
                    </div>
                    <div className="p-2 sm:p-3 bg-orange-100 rounded-lg flex-shrink-0">
                      <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-gray-600">Vencimento</p>
                      <p className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600 mt-1">
                        {formatDate(statement.due_date)}
                      </p>
                    </div>
                    <div className="p-2 sm:p-3 bg-blue-100 rounded-lg flex-shrink-0">
                      <Calendar className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-gray-600">Status</p>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full mt-1 ${getStatusColor(statement.status)}`}>
                        {getStatusLabel(statement.status)}
                      </span>
                    </div>
                    <div className="p-2 sm:p-3 bg-gray-100 rounded-lg flex-shrink-0">
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-gray-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {statement.carry_forward_amount > 0 && (
                <Card>
                  <CardContent className="p-3 sm:p-4 lg:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-600">Saldo Anterior</p>
                        <p className="text-lg sm:text-xl lg:text-2xl font-bold text-amber-600 mt-1">
                          {formatCurrency(statement.carry_forward_amount)}
                        </p>
                      </div>
                      <div className="p-2 sm:p-3 bg-amber-100 rounded-lg flex-shrink-0">
                        <ArrowRightLeft className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-amber-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {statement.credit_card && (
                <Card>
                  <CardContent className="p-3 sm:p-4 lg:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-600">Limite Disponível</p>
                        <p className="text-lg sm:text-xl lg:text-2xl font-bold text-emerald-600 mt-1">
                          {formatCurrency((statement.credit_card.credit_card_limit ?? 0) - (statement.credit_card.current_balance ?? 0))}
                        </p>
                      </div>
                      <div className="p-2 sm:p-3 bg-emerald-100 rounded-lg flex-shrink-0">
                        <Wallet className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-emerald-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Statement Items */}
          <div className="px-1 sm:px-0">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Itens da Fatura</CardTitle>
              </CardHeader>
              <CardContent className="py-0 px-1 sm:px-6">
                <div className="w-full overflow-x-auto">
                  <table className="w-full min-w-[800px]">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 w-[60px]">Tipo</th>
                        <th className="text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 min-w-[90px]">Data</th>
                        <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 min-w-[200px]">Descrição</th>
                        <th className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 min-w-[100px]">Valor</th>
                        <th className="text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 min-w-[100px]">Categoria</th>
                        <th className="text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 min-w-[80px]">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedItems.map((item) => (
                        <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 sm:py-3 px-2 sm:px-4 text-center">
                            <span className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded-full ${getTypeColor(item.type)}`}>
                              {getTypeLabel(item.type)}
                            </span>
                          </td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4 text-center text-xs sm:text-sm text-gray-600">
                            {formatDate(item.occurred_at)}
                          </td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-gray-900">
                            {item.description}
                          </td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-xs sm:text-sm font-medium">
                            <span className={item.amount < 0 ? 'text-green-600' : 'text-gray-900'}>
                              {formatCurrency(Math.abs(item.amount))}
                            </span>
                          </td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4 text-center text-xs sm:text-sm text-gray-600">
                            {item.category?.category_name || '-'}
                          </td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4">
                            <div className="flex justify-center space-x-1">
                              {statement?.status === 'open' && item.type !== 'payment' && (
                                <button
                                  onClick={() => handleMoveItem(item.id)}
                                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                  title="Mover para próximo ciclo"
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {items.length === 0 && (
                    <div className="text-center py-6 sm:py-8 text-gray-500 px-4">
                      <SquareKanban className="w-8 h-8 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
                      <p className="text-base sm:text-lg font-medium">Nenhum item na fatura</p>
                      <p className="text-xs sm:text-sm">Itens aparecerão automaticamente quando transações forem criadas</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payments History */}
          {statement?.payments && statement.payments.length > 0 && (
            <div className="px-1 sm:px-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">Pagamentos Registrados</CardTitle>
                </CardHeader>
                <CardContent className="py-0 px-1 sm:px-6 pb-4">
                  <div className="w-full overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600">Data</th>
                          <th className="text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600">Método</th>
                          <th className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statement.payments.map((payment: any) => (
                          <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-2 sm:py-3 px-2 sm:px-4 text-center text-xs sm:text-sm text-gray-600">
                              {formatDate(payment.paid_at)}
                            </td>
                            <td className="py-2 sm:py-3 px-2 sm:px-4 text-center text-xs sm:text-sm text-gray-600">
                              {getMethodLabel(payment.method)}
                            </td>
                            <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-xs sm:text-sm font-medium text-green-600">
                              {formatCurrency(payment.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Payment Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Registrar Pagamento"
      >
        <div className="space-y-4">
          <Input
            label="Valor do Pagamento"
            type="number"
            step="0.01"
            value={paymentData.amount}
            onChange={(e) => setPaymentData(prev => ({ ...prev, amount: Number(e.target.value) }))}
            required
          />

          <Input
            label="Data do Pagamento"
            type="date"
            value={paymentData.paid_at}
            onChange={(e) => setPaymentData(prev => ({ ...prev, paid_at: e.target.value }))}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Método de Pagamento
            </label>
            <Dropdown
              options={paymentMethodOptions}
              value={paymentData.method}
              onChange={(value) => setPaymentData(prev => ({ ...prev, method: value }))}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPaymentModal(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRegisterPayment}
              loading={registerPayment.isPending}
            >
              Registrar Pagamento
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default Invoice;