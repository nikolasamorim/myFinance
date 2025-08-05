import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { formatCurrency } from '../../lib/utils';
import type { MonthlyData } from '../../types';

interface MonthlyChartProps {
  data: MonthlyData[];
}

export function MonthlyChart({ data }: MonthlyChartProps) {
  const maxValue = Math.max(...data.flatMap(d => [d.income, d.expenses]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Receitas vs Despesas (Mensal)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((month, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span className="capitalize">{month.month}</span>
                <div className="flex space-x-4">
                  <span className="text-green-600">
                    {formatCurrency(month.income)}
                  </span>
                  <span className="text-red-600">
                    {formatCurrency(month.expenses)}
                  </span>
                </div>
              </div>
              <div className="flex space-x-2 h-2">
                <div
                  className="bg-green-200 rounded-full"
                  style={{
                    width: `${maxValue > 0 ? (month.income / maxValue) * 100 : 0}%`,
                  }}
                />
                <div
                  className="bg-red-200 rounded-full"
                  style={{
                    width: `${maxValue > 0 ? (month.expenses / maxValue) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-center space-x-6 mt-6 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-200 rounded-full mr-2" />
            <span>Receitas</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-200 rounded-full mr-2" />
            <span>Despesas</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}