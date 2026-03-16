import React from 'react';
import { CreditCard } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';

export function Dividas() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-orange-100 rounded-lg">
          <CreditCard className="w-6 h-6 text-orange-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dívidas</h1>
          <p className="text-text-secondary">Organize e quite suas dívidas</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gerenciador de Dívidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <CreditCard className="w-16 h-16 text-orange-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Módulo em Desenvolvimento
            </h3>
            <p className="text-text-secondary">
              O gerenciador de dívidas será implementado em breve.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}