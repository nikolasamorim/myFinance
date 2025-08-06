import React from 'react';
import { Wallet } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';

export function Contas() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-green-100 rounded-lg">
          <Wallet className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Caixa / Conta</h1>
          <p className="text-gray-600">Gerencie contas bancárias e caixa</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gerenciador de Contas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Wallet className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Módulo em Desenvolvimento
            </h3>
            <p className="text-gray-600">
              O gerenciador de contas será implementado em breve.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}