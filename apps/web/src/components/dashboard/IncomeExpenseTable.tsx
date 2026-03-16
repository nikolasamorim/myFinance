import React from 'react';
import { formatCurrency } from '../../lib/utils';
import type { MonthlyData } from '../../types';

interface IncomeExpenseTableProps {
  data: MonthlyData[];
}

export function IncomeExpenseTable({ data }: IncomeExpenseTableProps) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-text-secondary min-w-[60px]">Mês</th>
            <th className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-text-secondary min-w-[80px]">Receitas</th>
            <th className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-text-secondary min-w-[80px]">Despesas</th>
            <th className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-text-secondary min-w-[70px]">Saldo</th>
            <th className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-text-secondary min-w-[70px]">% Economia</th>
          </tr>
        </thead>
        <tbody>
          {data.map((month, index) => {
            const balance = month.income - month.expenses;
            const savingsRate = month.income > 0 ? ((balance / month.income) * 100) : 0;
            
            return (
              <tr key={index} className="border-b border-border hover:bg-bg-elevated">
                <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-text-primary capitalize">
                  {month.month}
                </td>
                <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-right text-green-600 font-medium">
                  {formatCurrency(month.income)}
                </td>
                <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-right text-red-600 font-medium">
                  {formatCurrency(month.expenses)}
                </td>
                <td className={`py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-right font-medium ${
                  balance >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(balance)}
                </td>
                <td className={`py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-right font-medium ${
                  savingsRate >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {savingsRate.toFixed(1)}%
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-border bg-bg-surface">
            <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-bold text-text-primary">Total</td>
            <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-right text-green-600 font-bold">
              {formatCurrency(data.reduce((acc, month) => acc + month.income, 0))}
            </td>
            <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-right text-red-600 font-bold">
              {formatCurrency(data.reduce((acc, month) => acc + month.expenses, 0))}
            </td>
            <td className={`py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-right font-bold ${
              data.reduce((acc, month) => acc + (month.income - month.expenses), 0) >= 0 
                ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(data.reduce((acc, month) => acc + (month.income - month.expenses), 0))}
            </td>
            <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-right text-text-secondary font-bold">
              {data.reduce((acc, month) => acc + month.income, 0) > 0 
                ? (((data.reduce((acc, month) => acc + (month.income - month.expenses), 0)) / 
                   data.reduce((acc, month) => acc + month.income, 0)) * 100).toFixed(1)
                : '0.0'}%
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}