import React from 'react';
import { Tag } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';

export function Categorias() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-yellow-100 rounded-lg">
          <Tag className="w-6 h-6 text-yellow-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categorias</h1>
          <p className="text-gray-600">Organize transações por categorias</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gerenciador de Categorias</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Tag className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Módulo em Desenvolvimento
            </h3>
            <p className="text-gray-600">
              O gerenciador de categorias será implementado em breve.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}