import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { formatCurrency } from '../../lib/utils';
import { cn } from '../../lib/utils';

interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function StatsCard({ title, value, icon, trend, className }: StatsCardProps) {
  return (
    <Card className={cn('', className)}>
      <CardContent className="p-3 sm:p-4 lg:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs sm:text-xs font-medium text-text-secondary">{title}</p>
            <p className="text-lg sm:text-xl font-bold text-text-primary mt-1">
              {formatCurrency(value)}
            </p>
            {trend && (
              <p className={cn(
                'text-xs mt-1',
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              )}>
                {trend.isPositive ? '+' : ''}{trend.value}%
              </p>
            )}
          </div>
          <div className="p-2 sm:p-3 bg-bg-elevated rounded-lg flex-shrink-0">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}