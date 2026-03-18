import React, { useState } from 'react';
import { Wallet, Plus, Edit, Trash2, Building, Calendar, TreePine, Table } from 'lucide-react';
import * as Lucide from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Dropdown } from '../../components/ui/Dropdown';
import { Modal } from '../../components/ui/Modal';
import { ColorPicker } from '../../components/ui/ColorPicker';
import { IconPicker } from '../../components/ui/IconPicker';
import { BreadcrumbBar } from '../../components/ui/BreadcrumbBar';
import { VisualizationToolbar } from '../../components/ui/VisualizationToolbar';
import { FiltersPanel } from '../../components/ui/FiltersPanel';
import { SortPanel } from '../../components/ui/SortPanel';
import { TabSelector } from '../../components/ui/TabSelector';
import { KanbanBoard } from '../../components/kanban/KanbanBoard';
import type { FilterField } from '../../components/ui/FiltersPanel';
import type { SortOption } from '../../components/ui/SortPanel';
import { useAccounts } from '../../hooks/useAccounts';
import { formatCurrency, formatDate } from '../../lib/utils';
import { cn } from '../../lib/utils';
import type { AccountData } from '../../services/account.service';

interface AccountFilters {
  type: string;
  search: string;
}

interface AccountFormData {
  title: string;
  type: 'cash' | 'bank';
  initial_balance: number;
  opened_at: string;
  cost_center_id: string;
  color: string;
  icon: string;
  description: string;
  parent_id: string;
}

const DEFAULT_FILTERS: AccountFilters = {
  type: 'all',
  search: '',
};

const typeOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'cash', label: 'Caixa' },
  { value: 'bank', label: 'Banco' },
];

const filterFields: FilterField[] = [
  { key: 'type', label: 'Tipo', type: 'dropdown', options: typeOptions },
  { key: 'search', label: 'Buscar', type: 'text', placeholder: 'Buscar contas...' },
];

const sortOptions: SortOption[] = [
  { value: 'name_asc', label: 'Nome (A-Z)' },
  { value: 'name_desc', label: 'Nome (Z-A)' },
  { value: 'balance_desc', label: 'Saldo (maior primeiro)' },
  { value: 'balance_asc', label: 'Saldo (menor primeiro)' },
];

export function Contas() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('hierarchy');
  const [filters, setFilters] = useState<AccountFilters>({ ...DEFAULT_FILTERS });
  const [sortBy, setSortBy] = useState<string>('name_asc');
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);

  const {
    data: accounts = [],
    isLoading,
    createAccount,
    updateAccount,
    deleteAccount
  } = useAccounts(filters);

  const hasActiveFilters = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);

  const sortedAccounts = [...accounts].sort((a, b) => {
    switch (sortBy) {
      case 'name_asc':
        return a.title.localeCompare(b.title);
      case 'name_desc':
        return b.title.localeCompare(a.title);
      case 'balance_desc':
        return Number(b.initial_balance) - Number(a.initial_balance);
      case 'balance_asc':
        return Number(a.initial_balance) - Number(b.initial_balance);
      default:
        return 0;
    }
  });

  const handleApplyFilters = (newFilters: Record<string, string>) => {
    setFilters(newFilters as unknown as AccountFilters);
  };

  const handleApplySort = (newSort: string) => {
    setSortBy(newSort);
  };

  const handleCreateAccount = () => {
    setEditingAccount(null);
    setShowModal(true);
  };

  const handleEditAccount = (account: any) => {
    setEditingAccount(account);
    setShowModal(true);
  };

  const handleDeleteAccount = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta conta?')) {
      await deleteAccount.mutateAsync(id);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'cash':
        return 'Caixa';
      case 'bank':
        return 'Banco';
      default:
        return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'cash':
        return 'text-green-600 bg-green-50';
      case 'bank':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-text-secondary bg-bg-surface';
    }
  };

  const tabs = [
    { id: 'hierarchy', label: 'Hierarquia', icon: <TreePine className="w-4 h-4" /> },
    { id: 'table', label: 'Tabela', icon: <Table className="w-4 h-4" /> },
  ];

  const renderAccountContent = (account: any) => (
    <div className="flex items-center justify-between w-full">
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-3">
          {(account.color || account.icon) && (
            <div
              className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg p-1 text-white"
              style={{ backgroundColor: account.color || '#6b7280' }}
            >
              {account.icon && (() => {
                const DI = Lucide[account.icon as keyof typeof Lucide] as React.ComponentType<{ className?: string }>;
                return DI ? <DI className="w-4 h-4" /> : null;
              })()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-text-primary truncate">{account.title}</p>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getTypeColor(account.type)}`}>
                {getTypeLabel(account.type)}
              </span>
              <span className="text-xs text-text-muted">
                {formatCurrency(Number(account.initial_balance))}
              </span>
            </div>
            {account.description && (
              <p className="text-sm text-text-muted mt-1 truncate">{account.description}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="space-y-4 sm:space-y-6 w-full min-w-0">
        <div className="flex items-center justify-between px-1 sm:px-0">
          <BreadcrumbBar
            segments={['Organizadores', 'Contas']}
            onBack={() => navigate('/dashboard')}
          />
          <div className="relative">
            <VisualizationToolbar
              onFilter={() => setShowFilters(prev => !prev)}
              onSort={() => setShowSort(prev => !prev)}
              onShare={() => {}}
              onSettings={() => {}}
              activeFilter={hasActiveFilters}
            />
            <FiltersPanel
              isOpen={showFilters}
              onClose={() => setShowFilters(false)}
              fields={filterFields}
              currentFilters={filters as unknown as Record<string, string>}
              defaultFilters={DEFAULT_FILTERS as unknown as Record<string, string>}
              onApply={handleApplyFilters}
            />
            <SortPanel
              isOpen={showSort}
              onClose={() => setShowSort(false)}
              options={sortOptions}
              currentSort={sortBy}
              onApply={handleApplySort}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 px-1 sm:px-0">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg flex-shrink-0">
              <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Caixa / Conta</h1>
              <p className="text-sm sm:text-base text-text-secondary">Gerencie contas bancarias e caixa</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TabSelector tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
            <Button onClick={handleCreateAccount} size="sm">
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Nova Conta
            </Button>
          </div>
        </div>

        <div className="px-1 sm:px-0">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
            </div>
          ) : (
            <>
              {activeTab === 'hierarchy' && (
                <KanbanBoard
                  items={accounts.map(acc => ({ ...acc }))}
                  columns={[
                    { id: 'accounts', title: 'Contas' },
                  ]}
                  onEdit={handleEditAccount}
                  onDelete={handleDeleteAccount}
                  onCreate={handleCreateAccount}
                  onReorder={async () => {}}
                  renderItemContent={renderAccountContent}
                />
              )}

              {activeTab === 'table' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">Contas Cadastradas</CardTitle>
                  </CardHeader>
                  <CardContent className="py-0 px-1 sm:px-6">
                    <div className="w-full overflow-x-auto">
                      <table className="w-full min-w-[700px]">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-text-secondary min-w-[120px]">Título</th>
                            <th className="text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-text-secondary min-w-[80px]">Tipo</th>
                            <th className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-text-secondary min-w-[100px]">Saldo Inicial</th>
                            <th className="text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-text-secondary min-w-[100px]">Centro de Custo</th>
                            <th className="text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-text-secondary min-w-[90px]">Data Abertura</th>
                            <th className="text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-text-secondary min-w-[80px]">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedAccounts.map((account) => (
                            <tr key={account.id} className="border-b border-border hover:bg-bg-elevated">
                              <td className="py-2 sm:py-3 px-2 sm:px-4">
                                <div className="flex items-center gap-2">
                                  {(account.color || account.icon) && (
                                    <div
                                      className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded p-1 text-white"
                                      style={{ backgroundColor: account.color || '#6b7280' }}
                                    >
                                      {account.icon && (() => {
                                        const DI = Lucide[account.icon as keyof typeof Lucide] as React.ComponentType<{ className?: string }>;
                                        return DI ? <DI className="w-3 h-3" /> : null;
                                      })()}
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-xs sm:text-sm font-medium text-text-primary truncate">{account.title}</p>
                                    {account.description && (
                                      <p className="text-xs text-text-muted truncate">{account.description}</p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="py-2 sm:py-3 px-2 sm:px-4 text-center">
                                <span className={`inline-flex px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-medium rounded-full ${getTypeColor(account.type)}`}>
                                  {getTypeLabel(account.type)}
                                </span>
                              </td>
                              <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-xs sm:text-sm font-medium text-text-primary">
                                {formatCurrency(Number(account.initial_balance))}
                              </td>
                              <td className="py-2 sm:py-3 px-2 sm:px-4 text-center text-xs sm:text-sm text-text-secondary">
                                {account.cost_center_name || '-'}
                              </td>
                              <td className="py-2 sm:py-3 px-2 sm:px-4 text-center text-xs sm:text-sm text-text-secondary">
                                {formatDate(account.opened_at)}
                              </td>
                              <td className="py-2 sm:py-3 px-2 sm:px-4">
                                <div className="flex justify-center space-x-1 sm:space-x-2">
                                  <button
                                    onClick={() => handleEditAccount(account)}
                                    className="p-0.5 sm:p-1 text-text-muted hover:text-text-secondary transition-colors"
                                    title="Editar"
                                  >
                                    <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteAccount(account.id)}
                                    className="p-0.5 sm:p-1 text-text-muted hover:text-red-600 transition-colors"
                                    title="Excluir"
                                  >
                                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {accounts.length === 0 && (
                        <div className="text-center py-6 sm:py-8 text-text-muted px-4">
                          <Wallet className="w-8 h-8 sm:w-12 sm:h-12 text-text-muted mx-auto mb-3 sm:mb-4" />
                          <p className="text-base sm:text-lg font-medium">Nenhuma conta encontrada</p>
                          <p className="text-xs sm:text-sm">Comece criando sua primeira conta</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <AccountModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        account={editingAccount}
        bankAccounts={accounts.filter(a => a.type === 'bank')}
        onSave={async (data) => {
          if (editingAccount) {
            await updateAccount.mutateAsync({ id: editingAccount.id, updates: data });
          } else {
            await createAccount.mutateAsync(data);
          }
          setShowModal(false);
        }}
      />
    </>
  );
}

// Modal Component
interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  account?: any;
  onSave: (data: any) => Promise<void>;
  bankAccounts: any[];
}

function AccountModal({ isOpen, onClose, account, onSave, bankAccounts }: AccountModalProps) {
  const [formData, setFormData] = useState<AccountFormData>({
    title: '',
    type: 'bank',
    initial_balance: 0,
    opened_at: new Date().toISOString().split('T')[0],
    cost_center_id: '',
    color: '',
    icon: '',
    description: '',
    parent_id: '',
  });

  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    if (account) {
      setFormData({
        title: account.title || '',
        type: account.type || 'bank',
        initial_balance: Number(account.initial_balance) || 0,
        opened_at: account.opened_at || new Date().toISOString().split('T')[0],
        cost_center_id: account.cost_center_id || '',
        color: account.color || '',
        icon: account.icon || '',
        description: account.description || '',
        parent_id: account.parent_id || '',
      });
    } else {
      setFormData({
        title: '',
        type: 'bank',
        initial_balance: 0,
        opened_at: new Date().toISOString().split('T')[0],
        cost_center_id: '',
        color: '',
        icon: '',
        description: '',
        parent_id: '',
      });
    }
  }, [account]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const accountData: AccountData = {
        title: formData.title,
        type: formData.type,
        initial_balance: formData.initial_balance,
        opened_at: formData.opened_at,
        cost_center_id: formData.cost_center_id || null,
        color: formData.color || undefined,
        icon: formData.icon || undefined,
        description: formData.description,
        parent_id: formData.type === 'cash' ? (formData.parent_id || null) : null,
      };
      await onSave(accountData);
    } catch (error) {
      console.error('Error saving account:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof AccountFormData, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      // Ao mudar para banco, limpar parent_id
      if (field === 'type' && value === 'bank') {
        updated.parent_id = '';
      }
      return updated;
    });
  };

  const modalTypeOptions = [
    { value: 'bank', label: 'Banco' },
    { value: 'cash', label: 'Caixa' },
  ];

  const parentOptions = bankAccounts.map(a => ({ value: a.id, label: a.title }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={account ? 'Editar Conta' : 'Nova Conta'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input
              label="Título"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Ex: Conta Corrente Itaú"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Tipo de conta
            </label>
            <Dropdown
              options={modalTypeOptions}
              value={formData.type}
              onChange={(value) => handleInputChange('type', value)}
            />
          </div>

          {formData.type === 'cash' && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Banco vinculado <span className="text-red-500">*</span>
              </label>
              <Dropdown
                options={parentOptions}
                value={formData.parent_id}
                onChange={(value) => handleInputChange('parent_id', value)}
                placeholder="Selecione o banco"
              />
              {!formData.parent_id && (
                <p className="text-xs text-red-500 mt-1">Contas do tipo Caixa precisam de um banco vinculado.</p>
              )}
            </div>
          )}

          <Input
            label="Saldo inicial"
            type="number"
            step="0.01"
            value={formData.initial_balance}
            onChange={(e) => handleInputChange('initial_balance', Number(e.target.value))}
            required
          />

          <Input
            label="Data de abertura"
            type="date"
            value={formData.opened_at}
            onChange={(e) => handleInputChange('opened_at', e.target.value)}
            required
          />

          <ColorPicker
            label="Cor da conta"
            value={formData.color}
            onChange={(value) => handleInputChange('color', value)}
          />

          <IconPicker
            label="Ícone da conta"
            value={formData.icon}
            onChange={(value) => handleInputChange('icon', value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Descrição
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Descrição adicional da conta..."
            className="w-full px-3 py-2 border border-border rounded-md bg-bg-page text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-transparent"
            rows={3}
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={isLoading} disabled={formData.type === 'cash' && !formData.parent_id}>
            {account ? 'Atualizar' : 'Criar'} Conta
          </Button>
        </div>
      </form>
    </Modal>
  );
}