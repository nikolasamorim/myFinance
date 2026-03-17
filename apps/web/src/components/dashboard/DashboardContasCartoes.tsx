import React, { useState } from 'react';
import * as Lucide from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatCurrency } from '../../lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { TabSelector } from '../ui/TabSelector';
import { Wallet } from 'lucide-react';
import type { DashboardTransaction, AccountSummary, CardSummary } from '../../lib/dashboardUtils';
import { groupByAccount, groupByCard } from '../../lib/dashboardUtils';

interface DashboardContasCartoesProps {
  transactions: DashboardTransaction[];
}

const TABS = [
  { id: 'contas', label: 'Contas' },
  { id: 'cartoes', label: 'Cartões' },
];

function AccountRow({ account }: { account: AccountSummary }) {
  const iconKey = (account.icon || '') as keyof typeof Lucide;
  const DynamicIcon = Lucide[iconKey] as React.ComponentType<{ className?: string }> | undefined;

  const isPositive = account.net >= 0;

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
      <div
        className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 text-white"
        style={{ backgroundColor: account.color || '#6b7280' }}
      >
        {DynamicIcon ? <DynamicIcon className="w-4 h-4" /> : null}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{account.name}</p>
        <p className="text-xs text-text-muted">{account.count} lançamento{account.count !== 1 ? 's' : ''}</p>
      </div>

      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className={cn('text-sm font-semibold', isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
          {formatCurrency(account.net)}
        </span>
        <span className={cn(
          'text-xs px-1.5 py-0.5 rounded-full font-medium',
          isPositive
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
        )}>
          {isPositive ? 'saldo positivo' : 'saldo negativo'}
        </span>
      </div>
    </div>
  );
}

function CardInitials({ name, color }: { name: string; color: string | null }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div
      className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 text-white text-xs font-bold"
      style={{ backgroundColor: color || '#6b7280' }}
    >
      {initials}
    </div>
  );
}

function CardRow({ card }: { card: CardSummary }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
      <CardInitials name={card.name} color={card.color} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{card.name}</p>
      </div>

      <span className="text-sm font-semibold text-text-primary flex-shrink-0">
        {formatCurrency(card.total)}
      </span>
    </div>
  );
}

export function DashboardContasCartoes({ transactions }: DashboardContasCartoesProps) {
  const [activeTab, setActiveTab] = useState<'contas' | 'cartoes'>('contas');

  const accounts = groupByAccount(transactions);
  const cards = groupByCard(transactions);

  const cardTotal = cards.reduce((sum, c) => sum + c.total, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Contas e Cartões
          </CardTitle>
          <TabSelector
            tabs={TABS}
            activeTab={activeTab}
            onChange={(id) => setActiveTab(id as 'contas' | 'cartoes')}
          />
        </div>
      </CardHeader>

      <CardContent className="py-0">
        {activeTab === 'contas' && (
          <div>
            {accounts.length === 0 ? (
              <p className="text-xs text-text-muted py-6 text-center">
                Nenhuma conta no período
              </p>
            ) : (
              accounts.map((account) => (
                <AccountRow key={account.name} account={account} />
              ))
            )}
          </div>
        )}

        {activeTab === 'cartoes' && (
          <div>
            {cards.length === 0 ? (
              <p className="text-xs text-text-muted py-6 text-center">
                Nenhum cartão no período
              </p>
            ) : (
              <>
                {cards.map((card) => (
                  <CardRow key={card.name} card={card} />
                ))}
                <div className="flex items-center justify-between py-3 border-t border-border mt-1">
                  <span className="text-sm font-semibold text-text-primary">Total em cartões</span>
                  <span className="text-sm font-bold text-text-primary">
                    {formatCurrency(cardTotal)}
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
