import React from 'react';
import { Target } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';

export function CentrosDeCusto() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <Target className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Centro de Custo</h1>
          <p className="text-gray-600">Organize custos por centros de responsabilidade</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gerenciador de Centros de Custo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Target className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Módulo em Desenvolvimento
            </h3>
            <p className="text-gray-600">
              O gerenciador de centros de custo será implementado em breve.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}