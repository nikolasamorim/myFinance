import React, { useState, useMemo } from 'react';
import { History as HistoryIcon, Filter, Calendar, User, FileText, Search } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Dropdown } from '../components/ui/Dropdown';
import { useActivityLogs } from '../hooks/useActivityLogs';
import { formatDateTime } from '../lib/utils';
import { cn } from '../lib/utils';

interface HistoryFilters {
  action: string;
  entity_type: string;
  date_from: string;
  date_to: string;
  search: string;
}

const actionOptions = [
  { value: 'all', label: 'Todas as ações' },
  { value: 'create', label: 'Criação' },
  { value: 'update', label: 'Atualização' },
  { value: 'delete', label: 'Exclusão' },
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
  { value: 'view', label: 'Visualização' },
];

const entityTypeOptions = [
  { value: 'all', label: 'Todas as entidades' },
  { value: 'transaction', label: 'Transações' },
  { value: 'account', label: 'Contas' },
  { value: 'credit_card', label: 'Cartões de Crédito' },
  { value: 'category', label: 'Categorias' },
  { value: 'cost_center', label: 'Centros de Custo' },
  { value: 'workspace', label: 'Workspaces' },
];

export function History() {
  const [filters, setFilters] = useState<HistoryFilters>({
    action: 'all',
    entity_type: 'all',
    date_from: '',
    date_to: '',
    search: '',
  });

  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 20;

  const { 
    data: activityLogs, 
    isLoading, 
    hasNextPage, 
    fetchNextPage, 
    isFetchingNextPage 
  } = useActivityLogs(filters, page, limit);

  const handleFilterChange = (key: keyof HistoryFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page when filters change
  };

  const getActionLabel = (action: string) => {
    const option = actionOptions.find(opt => opt.value === action);
    return option ? option.label : action;
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'text-green-600 bg-green-50';
      case 'update':
        return 'text-blue-600 bg-blue-50';
      case 'delete':
        return 'text-red-600 bg-red-50';
      case 'login':
        return 'text-purple-600 bg-purple-50';
      case 'logout':
        return 'text-gray-600 bg-gray-50';
      case 'view':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getEntityTypeLabel = (entityType: string) => {
    const option = entityTypeOptions.find(opt => opt.value === entityType);
    return option ? option.label : entityType;
  };

  const formatChanges = (changes: any) => {
    if (!changes || typeof changes !== 'object') return null;
    
    return Object.entries(changes).map(([field, [oldValue, newValue]]) => (
      <div key={field} className="text-xs text-gray-600 mt-1">
        <span className="font-medium">{field}:</span> {String(oldValue)} → {String(newValue)}
      </div>
    ));
  };

  const allLogs = useMemo(() => {
    if (!activityLogs?.pages) return [];
    return activityLogs.pages.flatMap(page => page.data);
  }, [activityLogs]);

  return (
    <div className="space-y-4 sm:space-y-6 w-full min-w-0 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 px-1 sm:px-0">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="p-1.5 sm:p-2 bg-gray-100 rounded-lg flex-shrink-0">
            <HistoryIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Histórico de Atividades</h1>
            <p className="text-sm sm:text-base text-gray-600">Acompanhe todas as suas interações no sistema</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-3 flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            Filtros
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="px-1 sm:px-0">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Ação</label>
                  <Dropdown
                    options={actionOptions}
                    value={filters.action}
                    onChange={(value) => handleFilterChange('action', value)}
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Entidade</label>
                  <Dropdown
                    options={entityTypeOptions}
                    value={filters.entity_type}
                    onChange={(value) => handleFilterChange('entity_type', value)}
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Data inicial</label>
                  <Input
                    type="date"
                    value={filters.date_from}
                    onChange={(e) => handleFilterChange('date_from', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Data final</label>
                  <Input
                    type="date"
                    value={filters.date_to}
                    onChange={(e) => handleFilterChange('date_to', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Buscar</label>
                  <Input
                    placeholder="Buscar na descrição..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Activity Logs Table */}
      <div className="px-1 sm:px-0">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Registro de Atividades</CardTitle>
          </CardHeader>
          <CardContent className="py-0 px-1 sm:px-6">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600" />
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 min-w-[140px]">Data/Hora</th>
                      <th className="text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 min-w-[80px]">Ação</th>
                      <th className="text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 min-w-[100px]">Entidade</th>
                      <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 min-w-[200px]">Descrição</th>
                      <th className="text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 min-w-[100px]">Usuário</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allLogs.map((log) => (
                      <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-gray-600">
                          {formatDateTime(log.created_at)}
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-center">
                          <span className={`inline-flex px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-medium rounded-full ${getActionColor(log.action)}`}>
                            {getActionLabel(log.action)}
                          </span>
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-center text-xs sm:text-sm text-gray-600">
                          {getEntityTypeLabel(log.entity_type)}
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4">
                          <div>
                            <p className="text-xs sm:text-sm text-gray-900">
                              {log.description || `${getActionLabel(log.action)} em ${getEntityTypeLabel(log.entity_type)}`}
                            </p>
                            {log.changes && formatChanges(log.changes)}
                          </div>
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-center text-xs sm:text-sm text-gray-600">
                          {log.user_name || 'Sistema'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {allLogs.length === 0 && (
                  <div className="text-center py-6 sm:py-8 text-gray-500 px-4">
                    <HistoryIcon className="w-8 h-8 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
                    <p className="text-base sm:text-lg font-medium">Nenhuma atividade encontrada</p>
                    <p className="text-xs sm:text-sm">As atividades aparecerão aqui conforme você usar o sistema</p>
                  </div>
                )}

                {/* Load More Button */}
                {hasNextPage && (
                  <div className="flex justify-center py-4">
                    <Button
                      variant="outline"
                      onClick={() => fetchNextPage()}
                      loading={isFetchingNextPage}
                    >
                      Carregar mais
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}