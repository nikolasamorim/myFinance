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
            <p className="text-xs sm:text-xs font-medium text-gray-600">{title}</p>
            <p className="text-lg sm:text-xl font-bold text-gray-900 mt-1">
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
          <div className="p-2 sm:p-3 bg-gray-100 rounded-lg flex-shrink-0">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}