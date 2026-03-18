import React, { useState } from 'react';
import * as Lucide from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatCurrency } from '../../lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { TabSelector } from '../ui/TabSelector';
import { PieChart } from 'lucide-react';
import type { DashboardTransaction, GroupedItem } from '../../lib/dashboardUtils';
import { groupByCategory, groupByCostCenter } from '../../lib/dashboardUtils';

interface DashboardDistribuicaoProps {
  transactions: DashboardTransaction[];
}

const TABS = [
  { id: 'categorias', label: 'Categorias' },
  { id: 'centros', label: 'Centros de Custo' },
];

function GroupedList({ items, emptyMessage }: { items: GroupedItem[]; emptyMessage: string }) {
  if (items.length === 0) {
    return <p className="text-xs text-text-muted py-2">{emptyMessage}</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.name} className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded p-0.5 text-white"
                style={{ backgroundColor: item.color }}
              >
                {item.icon && (() => {
                  const DI = Lucide[item.icon as keyof typeof Lucide] as React.ComponentType<{ className?: string }>;
                  return DI ? <DI className="w-3 h-3" /> : null;
                })()}
              </div>
              <span className="text-xs text-text-primary truncate">{item.name}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs font-medium text-text-primary">
                {formatCurrency(item.value)}
              </span>
              <span className="text-xs text-text-muted w-8 text-right">
                {item.pct.toFixed(0)}%
              </span>
            </div>
          </div>
          <div className="bg-bg-elevated rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full transition-all"
              style={{ width: `${item.pct}%`, backgroundColor: item.color }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function DashboardDistribuicao({ transactions }: DashboardDistribuicaoProps) {
  const [activeTab, setActiveTab] = useState<'categorias' | 'centros'>('categorias');

  const groupFn = activeTab === 'categorias' ? groupByCategory : groupByCostCenter;

  const incomeItems = groupFn(transactions, 'income');
  const expenseItems = groupFn(transactions, 'expense');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2">
            <PieChart className="w-5 h-5" />
            Distribuição
          </CardTitle>
          <TabSelector
            tabs={TABS}
            activeTab={activeTab}
            onChange={(id) => setActiveTab(id as 'categorias' | 'centros')}
          />
        </div>
      </CardHeader>

      <CardContent>
        <div className={cn('grid gap-6', 'grid-cols-1 md:grid-cols-2')}>
          {/* Income column */}
          <div>
            <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide mb-3">
              Receitas
            </p>
            <GroupedList items={incomeItems} emptyMessage="Nenhuma receita no período" />
          </div>

          {/* Expense column */}
          <div>
            <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide mb-3">
              Despesas
            </p>
            <GroupedList items={expenseItems} emptyMessage="Nenhuma despesa no período" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
