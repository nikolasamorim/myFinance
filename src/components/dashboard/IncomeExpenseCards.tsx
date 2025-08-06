import React from 'react';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import { formatCurrency } from '../../lib/utils';
import type { MonthlyData } from '../../types';

interface IncomeExpenseCardsProps {
  data: MonthlyData[];
}

export function IncomeExpenseCards({ data }: IncomeExpenseCardsProps) {
  const currentMonth = new Date().getMonth();
  const currentMonthData = data[currentMonth] || { month: '', income: 0, expenses: 0 };
  
  const totalIncome = data.reduce((acc, month) => acc + month.income, 0);
  const totalExpenses = data.reduce((acc, month) => acc + month.expenses, 0);
  const balance = totalIncome - totalExpenses;

  const avgIncome = totalIncome / 12;
  const avgExpenses = totalExpenses / 12;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Current Month Income */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Receita do Mês</p>
              <p className="text-lg font-bold text-green-600 mt-1">
                {formatCurrency(currentMonthData.income)}
              </p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Month Expenses */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Despesa do Mês</p>
              <p className="text-lg font-bold text-red-600 mt-1">
                {formatCurrency(currentMonthData.expenses)}
              </p>
            </div>
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Balance */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Saldo Total</p>
              <p className={`text-lg font-bold mt-1 ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(balance)}
              </p>
            </div>
            <div className={`p-2 rounded-lg ${balance >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              <DollarSign className={`w-5 h-5 ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Average Monthly */}
      <Card>
        <CardContent className="p-4">
          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">Média Mensal</p>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-green-600">Receita:</span>
                <span className="font-medium text-green-600">{formatCurrency(avgIncome)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-red-600">Despesa:</span>
                <span className="font-medium text-red-600">{formatCurrency(avgExpenses)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}