import React from 'react';
import { formatCurrency } from '../../lib/utils';
import type { MonthlyData } from '../../types';

interface IncomeExpenseTableProps {
  data: MonthlyData[];
}

export function IncomeExpenseTable({ data }: IncomeExpenseTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Mês</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Receitas</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Despesas</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Saldo</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">% Economia</th>
          </tr>
        </thead>
        <tbody>
          {data.map((month, index) => {
            const balance = month.income - month.expenses;
            const savingsRate = month.income > 0 ? ((balance / month.income) * 100) : 0;
            
            return (
              <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4 text-sm font-medium text-gray-900 capitalize">
                  {month.month}
                </td>
                <td className="py-3 px-4 text-sm text-right text-green-600 font-medium">
                  {formatCurrency(month.income)}
                </td>
                <td className="py-3 px-4 text-sm text-right text-red-600 font-medium">
                  {formatCurrency(month.expenses)}
                </td>
                <td className={`py-3 px-4 text-sm text-right font-medium ${
                  balance >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(balance)}
                </td>
                <td className={`py-3 px-4 text-sm text-right font-medium ${
                  savingsRate >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {savingsRate.toFixed(1)}%
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-300 bg-gray-50">
            <td className="py-3 px-4 text-sm font-bold text-gray-900">Total</td>
            <td className="py-3 px-4 text-sm text-right text-green-600 font-bold">
              {formatCurrency(data.reduce((acc, month) => acc + month.income, 0))}
            </td>
            <td className="py-3 px-4 text-sm text-right text-red-600 font-bold">
              {formatCurrency(data.reduce((acc, month) => acc + month.expenses, 0))}
            </td>
            <td className={`py-3 px-4 text-sm text-right font-bold ${
              data.reduce((acc, month) => acc + (month.income - month.expenses), 0) >= 0 
                ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(data.reduce((acc, month) => acc + (month.income - month.expenses), 0))}
            </td>
            <td className="py-3 px-4 text-sm text-right text-gray-600 font-bold">
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