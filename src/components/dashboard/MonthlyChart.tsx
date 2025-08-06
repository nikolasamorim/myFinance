import React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { VisualizationControls } from './VisualizationControls';
import { IncomeExpenseCards } from './IncomeExpenseCards';
import { IncomeExpenseTable } from './IncomeExpenseTable';
import { useDefaultVisualization } from '../../hooks/useVisualizations';
import { formatCurrency } from '../../lib/utils';
import type { MonthlyData, Visualization } from '../../types';

interface MonthlyChartProps {
  data: MonthlyData[];
}

export function MonthlyChart({ data }: MonthlyChartProps) {
  const screenContext = 'income_expense_summary';
  const { data: defaultVisualization } = useDefaultVisualization(screenContext);
  const [currentVisualization, setCurrentVisualization] = useState<Visualization | null>(null);

  // Set default visualization on load
  useEffect(() => {
    if (defaultVisualization) {
      setCurrentVisualization(defaultVisualization);
    } else {
      // Fallback to cards view
      setCurrentVisualization({
        visualization_id: 'fallback',
        visualization_workspace_id: '',
        visualization_user_id: '',
        visualization_name: 'Cards (Padrão)',
        visualization_type: 'cards',
        visualization_screen_context: screenContext,
        visualization_config: {},
        visualization_is_default: false,
        visualization_created_at: new Date().toISOString(),
        visualization_updated_at: new Date().toISOString(),
      });
    }
  }, [defaultVisualization]);

  const renderVisualization = () => {
    if (!currentVisualization) return null;

    switch (currentVisualization.visualization_type) {
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
        <div className="flex items-center justify-between">
          <CardTitle>Receitas vs Despesas (Mensal)</CardTitle>
          <VisualizationControls
            screenContext={screenContext}
            currentVisualization={currentVisualization}
            onVisualizationChange={setCurrentVisualization}
          />
        </div>
      </CardHeader>
      <CardContent>
        {renderVisualization()}
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
    </div>
  );
}
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