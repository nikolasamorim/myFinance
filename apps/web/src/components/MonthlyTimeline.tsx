import React, { useMemo, useRef, useEffect } from 'react';
import { cn } from '../lib/utils';
import { formatCurrency } from '../lib/utils';
import { Button } from './ui/Button';

export interface MonthData {
  monthKey: string;
  monthName: string;
  year: number;
  totalAmount: number;
  income?: number;
  expense?: number;
  balance?: number;
  status?: 'open' | 'closed' | 'paid';
}

interface MonthlyTimelineProps {
  monthsData: MonthData[];
  onMonthSelect: (monthKey: string) => void;
  selectedMonth: string | null;
  currentMonth: string;
  onApplyFilter: (monthKey: string) => void;
  showApplyButton?: boolean;
  className?: string;
}

const MAX_BAR_HEIGHT = 60;
const MIN_BAR_HEIGHT = 4;
const COL_WIDTH = 72;
const COL_GAP = 12;

export function MonthlyTimeline({
  monthsData,
  onMonthSelect,
  selectedMonth,
  currentMonth,
  onApplyFilter,
  showApplyButton = true,
  className,
}: MonthlyTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const maxAmount = useMemo(
    () => Math.max(...monthsData.map(m => m.totalAmount), 1),
    [monthsData]
  );

  const getBarHeight = (amount: number) =>
    amount <= 0
      ? MIN_BAR_HEIGHT
      : Math.max(MIN_BAR_HEIGHT, (amount / maxAmount) * MAX_BAR_HEIGHT);

  // Scroll so current month is near center on mount
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const idx = monthsData.findIndex(m => m.monthKey === currentMonth);
    if (idx < 0) return;
    const colStride = COL_WIDTH + COL_GAP;
    const target = Math.max(0, idx * colStride - container.clientWidth / 2 + colStride / 2);
    container.scrollTo({ left: target, behavior: 'smooth' });
  }, [currentMonth, monthsData]);

  const selectedData = useMemo(
    () => monthsData.find(m => m.monthKey === selectedMonth) ?? null,
    [selectedMonth, monthsData]
  );

  const canApply = showApplyButton && !!selectedMonth && selectedMonth !== currentMonth;

  const statusLabel = (s?: string) => {
    if (s === 'open') return 'Aberta';
    if (s === 'closed') return 'Fechada';
    if (s === 'paid') return 'Paga';
    return null;
  };

  const statusColor = (s?: string) => {
    if (s === 'open') return 'text-blue-600 bg-blue-50';
    if (s === 'closed') return 'text-text-secondary bg-bg-surface';
    if (s === 'paid') return 'text-green-600 bg-green-50';
    return 'text-text-muted bg-bg-surface';
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Scroll area */}
      <div ref={scrollRef} className="overflow-x-auto scrollbar-hide">
        <div
          className="flex pb-2 px-1"
          style={{ gap: COL_GAP, minWidth: 'max-content' }}
        >
          {monthsData.map(month => {
            const isSelected = month.monthKey === selectedMonth;
            const isCurrent = month.monthKey === currentMonth;
            const barH = getBarHeight(month.totalAmount);

            return (
              <button
                key={month.monthKey}
                onClick={() => onMonthSelect(month.monthKey)}
                aria-label={`Selecionar ${month.monthName}`}
                aria-pressed={isSelected}
                className="flex flex-col items-center gap-1 cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 rounded"
                style={{ width: COL_WIDTH }}
              >
                {/* Bar */}
                <div
                  className="flex items-end justify-center w-full"
                  style={{ height: MAX_BAR_HEIGHT + 8 }}
                >
                  <div
                    className={cn(
                      'w-7 rounded-t transition-all duration-200',
                      isSelected
                        ? 'shadow-md'
                        : 'group-hover:opacity-80'
                    )}
                    style={{
                      height: barH,
                      transform: isSelected ? 'scaleX(1.15)' : undefined,
                      backgroundColor: isSelected
                        ? 'var(--color-accent)'
                        : isCurrent
                        ? 'var(--color-accent)'
                        : 'var(--color-bg-elevated)',
                      opacity: isSelected ? 1 : isCurrent ? 0.9 : 0.65,
                    }}
                  />
                </div>

                {/* Month label */}
                <span
                  className={cn(
                    'text-xs font-semibold uppercase tracking-wide transition-colors leading-none',
                    isSelected
                      ? 'text-accent'
                      : isCurrent
                      ? 'text-accent/70'
                      : 'text-text-muted group-hover:text-text-secondary'
                  )}
                >
                  {month.monthName}
                </span>

                {/* Value */}
                <span
                  className={cn(
                    'text-xs leading-none transition-colors',
                    isSelected ? 'text-accent font-medium' : 'text-text-muted/60 group-hover:text-text-muted'
                  )}
                >
                  {month.totalAmount > 0
                    ? formatCurrency(month.totalAmount)
                        .replace('R$\u00a0', '')
                        .replace('R$ ', '')
                    : '—'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Info card */}
      {selectedData && (
        <div className="mt-3 p-3 sm:p-4 rounded-lg border border-border bg-bg-surface animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary capitalize">
                {selectedData.monthName}
              </p>

              <div className="mt-2 space-y-1.5">
                {selectedData.totalAmount > 0 && (
                  <Row label="Total da fatura">
                    <span className="font-medium text-text-primary">
                      {formatCurrency(selectedData.totalAmount)}
                    </span>
                  </Row>
                )}
                {selectedData.income != null && selectedData.income > 0 && (
                  <Row label="Receita">
                    <span className="font-medium text-green-600">
                      {formatCurrency(selectedData.income)}
                    </span>
                  </Row>
                )}
                {selectedData.expense != null && selectedData.expense > 0 && (
                  <Row label="Despesa">
                    <span className="font-medium text-red-600">
                      {formatCurrency(selectedData.expense)}
                    </span>
                  </Row>
                )}
                {selectedData.balance != null && (
                  <Row label="Saldo">
                    <span
                      className={cn(
                        'font-medium',
                        selectedData.balance >= 0 ? 'text-green-600' : 'text-red-600'
                      )}
                    >
                      {formatCurrency(selectedData.balance)}
                    </span>
                  </Row>
                )}
              </div>
            </div>

            {selectedData.status && statusLabel(selectedData.status) && (
              <span
                className={cn(
                  'inline-flex flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded-full',
                  statusColor(selectedData.status)
                )}
              >
                {statusLabel(selectedData.status)}
              </span>
            )}
          </div>

          {canApply && (
            <div className="mt-3 pt-3 border-t border-border flex items-center gap-3">
              <Button size="sm" onClick={() => onApplyFilter(selectedMonth!)}>
                Aplicar — {selectedData.monthName}
              </Button>
              <button
                onClick={() => onMonthSelect(selectedMonth!)}
                className="text-xs text-text-muted hover:text-text-secondary transition-colors"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm gap-4">
      <span className="text-text-muted">{label}</span>
      {children}
    </div>
  );
}
