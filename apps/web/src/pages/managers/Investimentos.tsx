import React from 'react';
import { PiggyBank } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';

export function Investimentos() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <PiggyBank className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Investimentos</h1>
          <p className="text-text-secondary">Acompanhe seus investimentos</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gerenciador de Investimentos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <PiggyBank className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibeled text-text-primary mb-2">
              Módulo em Desenvolvimento
            </h3>
            <p className="text-text-secondary">
              O gerenciador de investimentos será implementado em breve.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}