import React from 'react';
import * as Lucide from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Activity } from 'lucide-react';
import type { DashboardTransaction } from '../../lib/dashboardUtils';
import { getNextDueDate, groupByCategory } from '../../lib/dashboardUtils';

interface Summary {
  balancePaid: number;
  income: { paid: number; unpaid: number };
  expenses: { paid: number; unpaid: number };
  invested: { paid: number; unpaid: number };
}

interface DashboardFluxoPeriodoProps {
  summary: Summary | undefined;
  transactions: DashboardTransaction[];
}

export function DashboardFluxoPeriodo({ summary, transactions }: DashboardFluxoPeriodoProps) {
  const s = summary ?? {
    balancePaid: 0,
    income: { paid: 0, unpaid: 0 },
    expenses: { paid: 0, unpaid: 0 },
    invested: { paid: 0, unpaid: 0 },
  };

  const net = s.income.paid - s.expenses.paid;
  const total = s.income.paid + s.expenses.paid + s.invested.paid;
  const projectedBalance = s.balancePaid + s.income.unpaid - s.expenses.unpaid;

  const incomePct = total > 0 ? (s.income.paid / total) * 100 : 0;
  const expensePct = total > 0 ? (s.expenses.paid / total) * 100 : 0;
  const investedPct = total > 0 ? (s.invested.paid / total) * 100 : 0;

  const nextIncomeDate = getNextDueDate(transactions, 'income');
  const nextExpenseDate = getNextDueDate(transactions, 'expense');

  const expenseCategories = groupByCategory(transactions, 'expense').slice(0, 5);
  const incomeCategories = groupByCategory(transactions, 'income').slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Fluxo do Período
          </CardTitle>
          <span className={cn('text-xl font-bold', net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
            {formatCurrency(net)}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Segmented bar */}
        {total > 0 ? (
          <div>
            <div className="flex h-3 rounded-full overflow-hidden bg-bg-elevated">
              {incomePct > 0 && (
                <div
                  className="h-full transition-all"
                  style={{ width: `${incomePct}%`, backgroundColor: '#22c55e' }}
                  title={`Receitas: ${incomePct.toFixed(0)}%`}
                />
              )}
              {expensePct > 0 && (
                <div
                  className="h-full transition-all"
                  style={{ width: `${expensePct}%`, backgroundColor: '#ef4444' }}
                  title={`Despesas: ${expensePct.toFixed(0)}%`}
                />
              )}
              {investedPct > 0 && (
                <div
                  className="h-full transition-all"
                  style={{ width: `${investedPct}%`, backgroundColor: '#a855f7' }}
                  title={`Investimentos: ${investedPct.toFixed(0)}%`}
                />
              )}
            </div>

            <div className="flex items-center gap-4 mt-2 flex-wrap">
              {incomePct > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                  <span className="text-xs text-text-secondary">
                    Receitas <span className="font-medium text-green-600 dark:text-green-400">{incomePct.toFixed(0)}%</span>
                  </span>
                </div>
              )}
              {expensePct > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                  <span className="text-xs text-text-secondary">
                    Despesas <span className="font-medium text-red-600 dark:text-red-400">{expensePct.toFixed(0)}%</span>
                  </span>
                </div>
              )}
              {investedPct > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0" />
                  <span className="text-xs text-text-secondary">
                    Investimentos <span className="font-medium text-purple-600 dark:text-purple-400">{investedPct.toFixed(0)}%</span>
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-3 rounded-full bg-bg-elevated" />
        )}

        {/* Metric cells */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Pending income */}
          <div className="bg-bg-surface rounded-lg p-3 border border-border">
            <p className="text-xs text-text-muted mb-1">A receber</p>
            <p className="text-base font-semibold text-green-600 dark:text-green-400">
              {formatCurrency(s.income.unpaid)}
            </p>
            {nextIncomeDate && (
              <p className="text-xs text-text-secondary mt-1">
                Próximo: {formatDate(nextIncomeDate)}
              </p>
            )}
          </div>

          {/* Pending expense */}
          <div className="bg-bg-surface rounded-lg p-3 border border-border">
            <p className="text-xs text-text-muted mb-1">A pagar</p>
            <p className="text-base font-semibold text-red-600 dark:text-red-400">
              {formatCurrency(s.expenses.unpaid)}
            </p>
            {nextExpenseDate && (
              <p className="text-xs text-text-secondary mt-1">
                Próximo: {formatDate(nextExpenseDate)}
              </p>
            )}
          </div>

          {/* Projected balance */}
          <div className="bg-bg-surface rounded-lg p-3 border border-border">
            <p className="text-xs text-text-muted mb-1">Saldo projetado</p>
            <p className={cn(
              'text-base font-semibold',
              projectedBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            )}>
              {formatCurrency(projectedBalance)}
            </p>
            <p className="text-xs text-text-secondary mt-1">Se tudo for liquidado</p>
          </div>
        </div>

        {/* Category breakdown */}
        {(expenseCategories.length > 0 || incomeCategories.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-border">
            {expenseCategories.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide mb-2">
                  Despesas por categoria
                </p>
                <ul className="space-y-2">
                  {expenseCategories.map((item) => (
                    <li key={item.name} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded p-1 text-white"
                          style={{ backgroundColor: item.color }}
                        >
                          {item.icon && (() => {
                            const DI = Lucide[item.icon as keyof typeof Lucide] as React.ComponentType<{ className?: string }>;
                            return DI ? <DI className="w-3 h-3" /> : null;
                          })()}
                        </div>
                        <span className="text-xs text-text-primary truncate">{item.name}</span>
                      </div>
                      <span className="text-xs font-medium text-text-primary flex-shrink-0">
                        {formatCurrency(item.value)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {incomeCategories.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide mb-2">
                  Receitas por categoria
                </p>
                <ul className="space-y-2">
                  {incomeCategories.map((item) => (
                    <li key={item.name} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded p-1 text-white"
                          style={{ backgroundColor: item.color }}
                        >
                          {item.icon && (() => {
                            const DI = Lucide[item.icon as keyof typeof Lucide] as React.ComponentType<{ className?: string }>;
                            return DI ? <DI className="w-3 h-3" /> : null;
                          })()}
                        </div>
                        <span className="text-xs text-text-primary truncate">{item.name}</span>
                      </div>
                      <span className="text-xs font-medium text-text-primary flex-shrink-0">
                        {formatCurrency(item.value)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
