import { cn } from '../../lib/utils';
import { formatCurrency } from '../../lib/utils';
import { Card, CardContent } from '../ui/Card';

interface Summary {
  balancePaid: number;
  income: { paid: number; unpaid: number };
  expenses: { paid: number; unpaid: number };
  invested: { paid: number; unpaid: number };
}

interface DashboardKpiCardsProps {
  summary: Summary | undefined;
}

interface KpiCardProps {
  title: string;
  mainValue: number;
  mainColor: string;
  accentBarColor: string;
  paidLabel: string;
  paidValue: number;
  paidColor: string;
  pendingLabel: string;
  pendingValue: number;
  pillLabel: string;
  pillStyle: string;
}

function KpiCard({
  title,
  mainValue,
  mainColor,
  accentBarColor,
  paidLabel,
  paidValue,
  paidColor,
  pendingLabel,
  pendingValue,
  pillLabel,
  pillStyle,
}: KpiCardProps) {
  return (
    <Card className="overflow-hidden">
      <div className={cn('h-1 rounded-t-xl', accentBarColor)} />
      <CardContent className="p-3 sm:p-4">
        <p className="text-xs font-medium text-text-secondary mb-1">{title}</p>
        <p className={cn('text-xl sm:text-2xl font-bold', mainColor)}>
          {formatCurrency(mainValue)}
        </p>

        <div className="mt-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-secondary">{paidLabel}</span>
            <span className={cn('text-xs font-medium', paidColor)}>
              {formatCurrency(paidValue)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-secondary">{pendingLabel}</span>
            <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
              {formatCurrency(pendingValue)}
            </span>
          </div>
        </div>

        {pendingValue > 0 && (
          <div className="mt-3">
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', pillStyle)}>
              {formatCurrency(pendingValue)} {pillLabel}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardKpiCards({ summary }: DashboardKpiCardsProps) {
  const s = summary ?? {
    balancePaid: 0,
    income: { paid: 0, unpaid: 0 },
    expenses: { paid: 0, unpaid: 0 },
    invested: { paid: 0, unpaid: 0 },
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* Saldo */}
      <KpiCard
        title="Saldo"
        mainValue={s.balancePaid}
        mainColor={s.balancePaid >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}
        accentBarColor="bg-blue-500"
        paidLabel="Receitas pagas"
        paidValue={s.income.paid}
        paidColor="text-green-600 dark:text-green-400"
        pendingLabel="Despesas pagas"
        pendingValue={s.expenses.paid}
        pillLabel="em despesas pagas"
        pillStyle="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
      />

      {/* Receitas */}
      <KpiCard
        title="Receitas"
        mainValue={s.income.paid}
        mainColor="text-green-600 dark:text-green-400"
        accentBarColor="bg-green-500"
        paidLabel="Recebido"
        paidValue={s.income.paid}
        paidColor="text-green-600 dark:text-green-400"
        pendingLabel="Pendente"
        pendingValue={s.income.unpaid}
        pillLabel="a receber"
        pillStyle="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
      />

      {/* Despesas */}
      <KpiCard
        title="Despesas"
        mainValue={s.expenses.paid}
        mainColor="text-red-600 dark:text-red-400"
        accentBarColor="bg-red-500"
        paidLabel="Pago"
        paidValue={s.expenses.paid}
        paidColor="text-red-600 dark:text-red-400"
        pendingLabel="Pendente"
        pendingValue={s.expenses.unpaid}
        pillLabel="a pagar"
        pillStyle="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
      />

      {/* Investimentos */}
      <KpiCard
        title="Investimentos"
        mainValue={s.invested.paid}
        mainColor="text-purple-600 dark:text-purple-400"
        accentBarColor="bg-purple-500"
        paidLabel="Aportado"
        paidValue={s.invested.paid}
        paidColor="text-purple-600 dark:text-purple-400"
        pendingLabel="Pendente"
        pendingValue={s.invested.unpaid}
        pillLabel="a aportar"
        pillStyle="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400"
      />
    </div>
  );
}
