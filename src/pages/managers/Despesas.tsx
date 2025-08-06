import React from 'react';
import { TrendingDown } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';

export function Despesas() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-red-100 rounded-lg">
          <TrendingDown className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Despesas</h1>
          <p className="text-gray-600">Controle seus gastos e despesas</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gerenciador de Despesas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <TrendingDown className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Módulo em Desenvolvimento
            </h3>
            <p className="text-gray-600">
              O gerenciador de despesas será implementado em breve.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}