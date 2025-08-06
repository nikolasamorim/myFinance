import React from 'react';
import { CreditCard } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';

export function Cartoes() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-purple-100 rounded-lg">
          <CreditCard className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cartões de Crédito</h1>
          <p className="text-gray-600">Gerencie seus cartões de crédito</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gerenciador de Cartões</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <CreditCard className="w-16 h-16 text-purple-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Módulo em Desenvolvimento
            </h3>
            <p className="text-gray-600">
              O gerenciador de cartões de crédito será implementado em breve.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}