import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { ViewSelector } from './ViewSelector';
import { IncomeExpenseCards } from './IncomeExpenseCards';
import { IncomeExpenseTable } from './IncomeExpenseTable';
import { useDefaultVisualization } from '../../hooks/useVisualizations';
import { formatCurrency } from '../../lib/utils';
import type { MonthlyData, Visualization } from '../../types';

// Define fallback visualization outside component to ensure stable reference
const FALLBACK_VISUALIZATION: Visualization = {
  visualization_id: 'fallback',
  visualization_workspace_id: '',
  visualization_user_id: '',
  visualization_name: 'Cards (Padrão)',
  visualization_type: 'cards',
  visualization_screen_context: 'income_expense_summary',
  visualization_config: {},
  visualization_is_default: false,
  visualization_created_at: new Date().toISOString(),
  visualization_updated_at: new Date().toISOString(),
};

interface MonthlyChartProps {
  data: MonthlyData[];
}

export function MonthlyChart({ data }: MonthlyChartProps) {
  const screenContext = 'income_expense_summary';
  const { data: defaultVisualization } = useDefaultVisualization(screenContext);
  const [selectedVisualization, setSelectedVisualization] = useState<Visualization | null>(null);
  const hasInitialVizBeenSet = useRef(false);

  // Set visualization from default query result
  useEffect(() => {
    // Only set initial visualization once
    if (!hasInitialVizBeenSet.current) {
      setSelectedVisualization(defaultVisualization || FALLBACK_VISUALIZATION);
      hasInitialVizBeenSet.current = true;
    }
  }, [defaultVisualization]);

  const handleVisualizationChange = (visualization: Visualization) => {
    setSelectedVisualization(visualization);
  };

  const renderVisualization = () => {
    if (!selectedVisualization) return null;

    switch (selectedVisualization.visualization_type) {
      case 'cards':
        return <IncomeExpenseCards data={data} />;
      case 'table':
        return <IncomeExpenseTable data={data} />;
      case 'graph':
      default:
        return <MonthlyChartGraph data={data} />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
          <CardTitle>Receitas vs Despesas (Mensal)</CardTitle>
          <ViewSelector
            screenContext={screenContext}
            currentVisualization={selectedVisualization}
            onVisualizationChange={handleVisualizationChange}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-x-auto">
          {renderVisualization()}
        </div>
      </CardContent>
    </Card>
  );
}

// Original chart component as a separate component
function MonthlyChartGraph({ data }: { data: MonthlyData[] }) {
  const maxValue = Math.max(...data.flatMap(d => [d.income, d.expenses]));

  return (
    <div className="space-y-4">
      {data.map((month, index) => (
        <div key={index} className="space-y-2">
          <div className="flex justify-between text-sm font-medium">
            <span className="capitalize text-text-primary">{month.month}</span>
            <div className="flex space-x-4">
              <span className="text-green-600 dark:text-green-400">
                {formatCurrency(month.income)}
              </span>
              <span className="text-red-600 dark:text-red-400">
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
      <div className="flex justify-center space-x-6 mt-6 text-sm">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-200 rounded-full mr-2" />
          <span className="text-text-secondary">Receitas</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-red-200 rounded-full mr-2" />
          <span className="text-text-secondary">Despesas</span>
        </div>
      </div>
    </div>
  );
}