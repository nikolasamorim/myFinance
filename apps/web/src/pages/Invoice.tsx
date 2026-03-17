import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { KanbanSquare as SquareKanban, CreditCard, DollarSign } from 'lucide-react';
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
import { MonthlyTimeline } from '../components/MonthlyTimeline';
import type { MonthData } from '../components/MonthlyTimeline';
import { useWorkspace } from '../context/WorkspaceContext';
import { useCreditCards } from '../hooks/useCreditCards';
import {
  useMultipleStatements,
  useMultipleStatementItems,
  useStatementMutations,
  useStatementsForPeriods,
} from '../hooks/useStatements';
import { statementsService } from '../services/statements.service';
import { useQueryClient } from '@tanstack/react-query';
import { formatCurrency, cn } from '../lib/utils';

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

function buildTimelinePeriods(): string[] {
  const now = new Date();
  const periods: string[] = [];
  for (let i = -6; i <= 5; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    periods.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return periods;
}

const TIMELINE_PERIODS = buildTimelinePeriods();
const TODAY_MONTH = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

function getDaysUntil(dateStr: string): number {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - today.getTime()) / 86400000);
}

function getNextClosingDate(closingDay: number): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let d = new Date(today.getFullYear(), today.getMonth(), closingDay);
  if (d <= today) d = new Date(today.getFullYear(), today.getMonth() + 1, closingDay);
  return d;
}

function Invoice() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [activePaymentCard, setActivePaymentCard] = useState<{ cardId: string; statementId: string } | null>(null);
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

  const period = searchParams.get('period') || TODAY_MONTH;

  const { data: creditCards = [] } = useCreditCards({ search: '' });
  const allCardIds = useMemo(() => creditCards.map((c: any) => c.id), [creditCards]);
  const cardMap = useMemo(() => new Map(creditCards.map((c: any) => [c.id, c])), [creditCards]);

  // Init selection with first card once creditCards loads
  useEffect(() => {
    if (creditCards.length > 0 && selectedCards.length === 0) {
      setSelectedCards([(creditCards[0] as any).id]);
    }
  }, [creditCards.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Current period statements
  const allStatementResults = useMultipleStatements(allCardIds, period);

  const statementMap = useMemo(() => {
    const map = new Map<string, any>();
    allStatementResults.forEach((result, i) => {
      if (result.data && allCardIds[i]) map.set(allCardIds[i], result.data);
    });
    return map;
  }, [allStatementResults, allCardIds]);

  // Timeline: all periods × all cards
  const timelineResults = useStatementsForPeriods(allCardIds, TIMELINE_PERIODS);

  const timelineStatementsByPeriod = useMemo(() => {
    const map = new Map<string, any[]>();
    let idx = 0;
    for (const _cardId of allCardIds) {
      for (const p of TIMELINE_PERIODS) {
        const result = timelineResults[idx++];
        if (result?.data) {
          if (!map.has(p)) map.set(p, []);
          map.get(p)!.push(result.data);
        }
      }
    }
    return map;
  }, [timelineResults, allCardIds]);

  const monthsData = useMemo((): MonthData[] => {
    return TIMELINE_PERIODS.map(monthKey => {
      const statements = timelineStatementsByPeriod.get(monthKey) ?? [];
      const totalAmount = statements.reduce((sum: number, s: any) => sum + (s.statement_amount ?? 0), 0);
      const statuses: string[] = statements.map((s: any) => s.status).filter(Boolean);

      const date = new Date(monthKey + '-15T12:00:00');
      const monthName = date
        .toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
        .replace(/\./g, '')
        .replace(/\s+de\s+/, ' ')
        .toUpperCase();

      const status: MonthData['status'] =
        statuses.length === 0 ? undefined
        : statuses.some(s => s === 'open') ? 'open'
        : statuses.every(s => s === 'paid_full') ? 'paid'
        : 'closed';

      return { monthKey, monthName, year: date.getFullYear(), totalAmount, status };
    });
  }, [timelineStatementsByPeriod]);

  const isLoading = allCardIds.length > 0 && allStatementResults.some(r => r.isLoading);

  const activeCardIds = selectedCards.length > 0 ? selectedCards : allCardIds;

  const statementInfos = useMemo(() => {
    return activeCardIds
      .map(cardId => {
        const stmt = statementMap.get(cardId);
        if (!stmt) return null;
        return { cardId, statementId: stmt.id, color: stmt.credit_card?.color ?? null };
      })
      .filter(Boolean) as Array<{ cardId: string; statementId: string; color: string | null }>;
  }, [activeCardIds, statementMap]);

  const allItemResults = useMultipleStatementItems(statementInfos, filters);

  const mergedItems = useMemo(
    () => allItemResults.flatMap(r => r.data ?? []),
    [allItemResults]
  );

  const sortedItems = useMemo(() => {
    return [...mergedItems].sort((a: any, b: any) => {
      switch (sortBy) {
        case 'date_desc': return new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime();
        case 'date_asc':  return new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime();
        case 'amount_desc': return Math.abs(b.amount) - Math.abs(a.amount);
        case 'amount_asc':  return Math.abs(a.amount) - Math.abs(b.amount);
        default: return 0;
      }
    });
  }, [mergedItems, sortBy]);

  const itemsByDate = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const item of sortedItems) {
      const key = item.occurred_at.slice(0, 10);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    return groups;
  }, [sortedItems]);

  const totalAmount = useMemo(
    () => mergedItems.reduce((sum: number, item: any) => sum + item.amount, 0),
    [mergedItems]
  );

  // Aggregate summary values for selected cards
  const selectedStatements = useMemo(
    () => selectedCards.map((id: string) => statementMap.get(id)).filter(Boolean) as any[],
    [selectedCards, statementMap]
  );

  const summaryStatementAmount = useMemo(
    () => selectedStatements.reduce((s, stmt) => s + (stmt?.statement_amount ?? 0), 0),
    [selectedStatements]
  );

  const summaryPaidAmount = useMemo(
    () => selectedStatements.reduce((s, stmt) => s + (stmt?.paid_amount ?? 0), 0),
    [selectedStatements]
  );

  const summaryLimit = useMemo(
    () => selectedCards.reduce((s: number, id: string) => s + ((cardMap.get(id) as any)?.credit_limit ?? 0), 0),
    [selectedCards, cardMap]
  );

  const earliestDueDate = useMemo(() => {
    const dates = selectedStatements.map((s: any) => s?.due_date).filter(Boolean) as string[];
    return dates.length ? dates.sort()[0] : null;
  }, [selectedStatements]);

  const primaryCard = useMemo(
    () => selectedCards.length === 1 ? (cardMap.get(selectedCards[0]) as any) : null,
    [selectedCards, cardMap]
  );

  const dueDays = earliestDueDate ? getDaysUntil(earliestDueDate) : null;
  const dueDayColor =
    dueDays === null ? 'text-text-primary'
    : dueDays <= 3 ? 'text-red-500'
    : dueDays <= 7 ? 'text-amber-500'
    : 'text-text-primary';

  const closingDays = useMemo(() => {
    if (!primaryCard?.closing_day) return null;
    const nextClose = getNextClosingDate(primaryCard.closing_day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.ceil((nextClose.getTime() - today.getTime()) / 86400000);
  }, [primaryCard]);

  // Mutations
  const { registerPayment } = useStatementMutations(activePaymentCard?.cardId);

  const handleMonthSelect = (monthKey: string) => {
    setSelectedMonth(prev => (prev === monthKey ? null : monthKey));
  };

  const handleApplyFilter = (monthKey: string) => {
    setSearchParams({ period: monthKey });
    setSelectedCards([]);
    setSelectedMonth(null);
  };

  const toggleCardSelection = (cardId: string) => {
    setSelectedCards(prev => {
      if (prev.includes(cardId)) {
        return prev.length === 1 ? prev : prev.filter(id => id !== cardId);
      }
      return [...prev, cardId];
    });
  };

  const openPaymentModal = (cardId: string, statementId: string) => {
    setActivePaymentCard({ cardId, statementId });
    setPaymentData({ amount: 0, paid_at: new Date().toISOString().split('T')[0], method: 'pix' });
    setShowPaymentModal(true);
  };

  // Direct service call avoids the stale-closure issue with useStatementMutations
  const handleCloseStatement = async (cardId: string, statementId: string) => {
    if (!window.confirm('Fechar esta fatura? Esta ação não pode ser desfeita.')) return;
    try {
      await statementsService.closeStatement(currentWorkspace!.workspace_id, cardId, statementId);
      queryClient.invalidateQueries({ queryKey: ['statement'] });
      queryClient.invalidateQueries({ queryKey: ['statement-items'] });
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
    } catch {
      alert('Erro ao fechar fatura');
    }
  };

  const handleRegisterPayment = async () => {
    if (!activePaymentCard) return;
    try {
      await registerPayment.mutateAsync({ statementId: activePaymentCard.statementId, paymentData });
      setShowPaymentModal(false);
      setActivePaymentCard(null);
    } catch {
      alert('Erro ao registrar pagamento');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400';
      case 'closed': return 'text-text-secondary bg-bg-surface';
      case 'paid_partial': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'paid_full': return 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400';
      default: return 'text-text-secondary bg-bg-surface';
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
      case 'purchase': return 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400';
      case 'installment': return 'text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400';
      case 'refund': return 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400';
      case 'payment': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400';
      case 'adjustment': return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400';
      case 'carry_forward': return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400';
      default: return 'text-text-secondary bg-bg-surface';
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

  const formatDateLabel = (dateStr: string) =>
    new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

  const periodDate = new Date(period + '-01');
  const periodLabel = periodDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <>
      {isLoading ? (
        <div className="min-h-screen bg-bg-surface flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6 w-full min-w-0">

          {/* Top Bar */}
          <div className="flex items-center justify-between px-1 sm:px-0">
            <BreadcrumbBar segments={['Gerenciadores', 'Faturas']} onBack={() => navigate('/dashboard')} />
            <div className="relative">
              <VisualizationToolbar
                onFilter={() => setShowFilters(prev => !prev)}
                onSort={() => setShowSort(prev => !prev)}
                onShare={() => {}}
                onSettings={() => {}}
                activeFilter={filters.type !== 'all' || filters.search !== ''}
              />
              <FiltersPanel
                isOpen={showFilters}
                onClose={() => setShowFilters(false)}
                fields={invoiceFilterFields}
                currentFilters={filters as unknown as Record<string, string>}
                defaultFilters={{ type: 'all', search: '' }}
                onApply={newF => setFilters({ type: newF.type || 'all', search: newF.search || '' })}
              />
              <SortPanel
                isOpen={showSort}
                onClose={() => setShowSort(false)}
                options={invoiceSortOptions}
                currentSort={sortBy}
                onApply={setSortBy}
              />
            </div>
          </div>

          {/* Page Header */}
          <div className="flex items-center space-x-2 sm:space-x-3 px-1 sm:px-0">
            <div className="p-1.5 sm:p-2 bg-purple-100 rounded-lg flex-shrink-0">
              <SquareKanban className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Faturas</h1>
              <p className="text-sm sm:text-base text-text-secondary">Gerencie faturas de cartão de crédito</p>
            </div>
          </div>

          {/* Monthly Timeline */}
          <div className="px-1 sm:px-0">
            <Card>
              <CardContent className="p-3 sm:p-4">
                <MonthlyTimeline
                  monthsData={monthsData}
                  onMonthSelect={handleMonthSelect}
                  selectedMonth={selectedMonth}
                  currentMonth={period}
                  onApplyFilter={handleApplyFilter}
                  showApplyButton={true}
                />
              </CardContent>
            </Card>
          </div>

          {/* Card Selector */}
          {creditCards.length > 0 && (
            <div className="px-1 sm:px-0">
              <div className="overflow-x-auto scrollbar-hide">
                <div className="flex gap-3 pb-2">
                  {creditCards.map((card: any) => {
                    const stmt = statementMap.get(card.id);
                    const isSelected = selectedCards.includes(card.id);
                    const usagePercent = card.credit_limit > 0
                      ? Math.min(100, ((stmt?.statement_amount ?? 0) / card.credit_limit) * 100)
                      : 0;
                    const isOverLimit = usagePercent > 80;

                    return (
                      <div
                        key={card.id}
                        onClick={() => toggleCardSelection(card.id)}
                        className={cn(
                          'flex-shrink-0 w-60 rounded-2xl border p-4 cursor-pointer transition-all duration-200',
                          isSelected
                            ? 'border-purple-400 bg-purple-50 dark:bg-purple-900/20 shadow-sm'
                            : 'border-border bg-bg-page hover:border-border'
                        )}
                      >
                        {/* Card name + status badge */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <CreditCard className="w-4 h-4 flex-shrink-0" style={{ color: card.color ?? '#6B7280' }} />
                            <span className="font-semibold text-sm text-text-primary truncate">{card.title}</span>
                          </div>
                          {stmt && (
                            <span className={cn(
                              'flex-shrink-0 inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded-full',
                              getStatusColor(stmt.status)
                            )}>
                              {getStatusLabel(stmt.status)}
                            </span>
                          )}
                        </div>

                        {/* Statement amount */}
                        <p className="text-xl font-bold text-text-primary">
                          {stmt ? formatCurrency(stmt.statement_amount) : '—'}
                        </p>
                        {card.credit_limit > 0 && (
                          <p className="text-xs text-text-muted mb-3">de {formatCurrency(card.credit_limit)}</p>
                        )}

                        {/* Usage bar */}
                        {card.credit_limit > 0 && (
                          <>
                            <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden mb-1">
                              <div
                                className={cn('h-full rounded-full transition-all', isOverLimit ? 'bg-red-500' : 'bg-purple-500')}
                                style={{ width: `${usagePercent}%` }}
                              />
                            </div>
                            <p className="text-[11px] text-text-muted mb-3">
                              Disponível: {formatCurrency(card.credit_limit - (stmt?.statement_amount ?? 0))}
                            </p>
                          </>
                        )}

                        {/* Metadata grid */}
                        <div className="border-t border-border pt-2">
                          <div className="grid grid-cols-3 gap-1">
                            <div>
                              <p className="text-[9px] text-text-muted uppercase tracking-wide">Fechamento</p>
                              <p className="text-[11px] font-medium text-text-secondary">
                                {card.closing_day ? `Dia ${card.closing_day}` : '—'}
                              </p>
                            </div>
                            <div>
                              <p className="text-[9px] text-text-muted uppercase tracking-wide">Vencimento</p>
                              <p className="text-[11px] font-medium text-text-secondary">
                                {card.due_day ? `Dia ${card.due_day}` : '—'}
                              </p>
                            </div>
                            <div>
                              <p className="text-[9px] text-text-muted uppercase tracking-wide">Pago</p>
                              <p className="text-[11px] font-medium text-green-600">
                                {stmt ? formatCurrency(stmt.paid_amount ?? 0) : '—'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Per-card actions */}
                        {stmt?.status === 'open' && (
                          <div className="flex gap-2 mt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={e => { e.stopPropagation(); openPaymentModal(card.id, stmt.id); }}
                            >
                              <DollarSign className="w-3 h-3 mr-1" />Pagar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={e => { e.stopPropagation(); handleCloseStatement(card.id, stmt.id); }}
                            >
                              Fechar
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              {selectedCards.length > 1 && (
                <button
                  onClick={() => setSelectedCards([(creditCards[0] as any).id])}
                  className="mt-2 text-xs text-text-muted hover:text-text-secondary transition-colors"
                >
                  Limpar seleção
                </button>
              )}
            </div>
          )}

          {/* Summary Panel */}
          {selectedStatements.length > 0 && (
            <div className="px-1 sm:px-0">
              <Card>
                <CardContent className="p-0">
                  <div className="grid grid-cols-1 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border">

                    {/* Col 1+2: Payment progress */}
                    <div className="col-span-1 sm:col-span-2 px-5 py-4">
                      <p className="text-xs font-medium text-text-muted mb-2">Progresso do Pagamento</p>
                      {summaryStatementAmount > 0 ? (
                        <>
                          <div className="h-2 bg-bg-elevated rounded-full overflow-hidden mb-2">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all',
                                summaryPaidAmount >= summaryStatementAmount ? 'bg-green-500' : 'bg-purple-500'
                              )}
                              style={{ width: `${Math.min(100, (summaryPaidAmount / summaryStatementAmount) * 100)}%` }}
                            />
                          </div>
                          {summaryPaidAmount >= summaryStatementAmount ? (
                            <p className="text-green-600 text-xs font-medium">Fatura quitada</p>
                          ) : (
                            <div className="flex justify-between">
                              <span className="text-[11px] text-green-600">
                                Pago: {formatCurrency(summaryPaidAmount)}
                              </span>
                              <span className="text-[11px] text-amber-600">
                                Restante: {formatCurrency(summaryStatementAmount - summaryPaidAmount)}
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-text-muted">Sem lançamentos neste período</p>
                      )}
                    </div>

                    {/* Col 3: Closing day */}
                    <div className="px-5 py-4">
                      <p className="text-[10px] text-text-muted uppercase tracking-wide mb-1">Fechamento em</p>
                      {primaryCard?.closing_day ? (
                        <>
                          <p className="text-2xl font-bold text-text-primary leading-none">
                            {closingDays}<span className="text-base font-semibold">d</span>
                          </p>
                          <p className="text-[11px] text-text-muted mt-1">dia {primaryCard.closing_day}</p>
                        </>
                      ) : (
                        <p className="text-2xl font-bold text-text-muted">—</p>
                      )}
                    </div>

                    {/* Col 4: Due date */}
                    <div className="px-5 py-4">
                      <p className="text-[10px] text-text-muted uppercase tracking-wide mb-1">Vencimento em</p>
                      {dueDays !== null ? (
                        <>
                          <p className={cn('text-2xl font-bold leading-none', dueDayColor)}>
                            {dueDays}<span className="text-base font-semibold">d</span>
                          </p>
                          <p className="text-[11px] text-text-muted mt-1">
                            {new Date(earliestDueDate! + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </p>
                        </>
                      ) : (
                        <p className="text-2xl font-bold text-text-muted">—</p>
                      )}
                    </div>

                  </div>

                  {/* Available limit — full-width bottom row */}
                  {summaryLimit > 0 && (
                    <div className="border-t border-border px-5 py-3 flex items-center justify-between">
                      <p className="text-[10px] text-text-muted uppercase tracking-wide">Limite Disponível</p>
                      <div className="text-right">
                        <span className="text-base font-bold text-text-primary">
                          {formatCurrency(summaryLimit - summaryStatementAmount)}
                        </span>
                        <span className="text-[11px] text-text-muted ml-1.5">
                          de {formatCurrency(summaryLimit)}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Items Grid */}
          <div className="px-1 sm:px-0">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg sm:text-xl capitalize">
                      Lançamentos — {periodLabel}
                    </CardTitle>
                    <p className="text-sm text-text-muted mt-0.5">{mergedItems.length} transações</p>
                  </div>
                  <span className="text-base sm:text-lg font-bold text-text-primary">
                    {formatCurrency(totalAmount)}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {Object.keys(itemsByDate).length > 0 ? (
                  Object.entries(itemsByDate).map(([date, dateItems]) => (
                    <div key={date} className="mb-6 last:mb-0">
                      <h3 className="text-xs sm:text-sm font-semibold text-text-secondary mb-3 pb-2 border-b border-border capitalize">
                        {formatDateLabel(date)}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {(dateItems as any[]).map((item: any) => {
                          const cardInfo = cardMap.get(item._cardId);
                          return (
                            <div
                              key={item.id}
                              className="border-l-4 p-3 sm:p-4 rounded-lg bg-bg-page border border-border hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                              style={{ borderLeftColor: item._cardColor ?? '#E5E7EB' }}
                            >
                              <div className="mb-2">
                                <span className={cn(
                                  'inline-flex px-1.5 py-0.5 text-xs font-medium rounded-full',
                                  getTypeColor(item.type)
                                )}>
                                  {getTypeLabel(item.type)}
                                </span>
                              </div>
                              <p className="text-sm font-medium text-text-primary line-clamp-2">{item.description}</p>
                              {item.category?.category_name && (
                                <p className="text-xs text-text-muted mt-1">{item.category.category_name}</p>
                              )}
                              <div className="flex items-center justify-between mt-3">
                                {cardInfo && (
                                  <span
                                    className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium text-white truncate max-w-[120px]"
                                    style={{ backgroundColor: item._cardColor ?? '#9CA3AF' }}
                                  >
                                    {(cardInfo as any).title}
                                  </span>
                                )}
                                <span className={cn(
                                  'text-sm font-semibold ml-auto',
                                  item.amount < 0 ? 'text-green-600' : 'text-text-primary'
                                )}>
                                  {formatCurrency(Math.abs(item.amount))}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-text-muted">
                    <SquareKanban className="w-10 h-10 sm:w-12 sm:h-12 text-text-muted mx-auto mb-3" />
                    <p className="text-base sm:text-lg font-medium">Nenhum item na fatura</p>
                    <p className="text-xs sm:text-sm text-text-muted">
                      Itens aparecerão automaticamente quando transações forem criadas
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        </div>
      )}

      {/* Payment Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => { setShowPaymentModal(false); setActivePaymentCard(null); }}
        title="Registrar Pagamento"
      >
        <div className="space-y-4">
          <Input
            label="Valor do Pagamento"
            type="number"
            step="0.01"
            value={paymentData.amount}
            onChange={e => setPaymentData(prev => ({ ...prev, amount: Number(e.target.value) }))}
            required
          />
          <Input
            label="Data do Pagamento"
            type="date"
            value={paymentData.paid_at}
            onChange={e => setPaymentData(prev => ({ ...prev, paid_at: e.target.value }))}
            required
          />
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Método de Pagamento</label>
            <Dropdown
              options={paymentMethodOptions}
              value={paymentData.method}
              onChange={value => setPaymentData(prev => ({ ...prev, method: value }))}
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => { setShowPaymentModal(false); setActivePaymentCard(null); }}>
              Cancelar
            </Button>
            <Button onClick={handleRegisterPayment} loading={registerPayment.isPending}>
              Registrar Pagamento
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default Invoice;
