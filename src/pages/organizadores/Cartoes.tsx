import React, { useState, useMemo } from 'react';
import { CreditCard, Plus, Filter, Edit, Trash2, Calendar, DollarSign, Table, Wallet } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Dropdown } from '../../components/ui/Dropdown';
import { Modal } from '../../components/ui/Modal';
import { TabSelector } from '../../components/ui/TabSelector';
import { ColorPicker } from '../../components/ui/ColorPicker';
import { IconPicker } from '../../components/ui/IconPicker';
import { CreditCardWallet } from '../../components/creditCards/CreditCardWallet';
import { useCreditCards } from '../../hooks/useCreditCards';
import { useAccounts } from '../../hooks/useAccounts';
import { formatCurrency, formatDate } from '../../lib/utils';
import { cn } from '../../lib/utils';
import type { CreditCardData } from '../../services/creditCard.service';

interface CreditCardFilters {
  search: string;
}

interface CreditCardFormData {
  title: string;
  flag: string;
  limit: number;
  initial_balance: number;
  account_id: string;
  due_day: number;
  closing_day: number;
  last_four_digits: string;
  color: string;
  icon: string;
  description: string;
}

const flagOptions = [
  { value: 'visa', label: 'Visa' },
  { value: 'mastercard', label: 'Mastercard' },
  { value: 'american_express', label: 'American Express' },
  { value: 'elo', label: 'Elo' },
  { value: 'hipercard', label: 'Hipercard' },
  { value: 'diners', label: 'Diners Club' },
  { value: 'other', label: 'Outro' },
];

export function Cartoes() {
  const [activeTab, setActiveTab] = useState('wallet');
  const [filters, setFilters] = useState<CreditCardFilters>({
    search: '',
  });

  const [showModal, setShowModal] = useState(false);
  const [editingCard, setEditingCard] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);

  const { 
    data: creditCards = [], 
    isLoading, 
    createCreditCard, 
    updateCreditCard, 
    deleteCreditCard 
  } = useCreditCards(filters);

  const handleFilterChange = (key: keyof CreditCardFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleCreateCard = () => {
    setEditingCard(null);
    setShowModal(true);
  };

  const handleEditCard = (card: any) => {
    setEditingCard(card);
    setShowModal(true);
  };

  const handleDeleteCard = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este cartão?')) {
      await deleteCreditCard.mutateAsync(id);
    }
  };

  const getFlagLabel = (flag: string) => {
    const option = flagOptions.find(opt => opt.value === flag);
    return option ? option.label : flag;
  };

  const getFlagColor = (flag: string) => {
    switch (flag) {
      case 'visa':
        return 'text-blue-600 bg-blue-50';
      case 'mastercard':
        return 'text-red-600 bg-red-50';
      case 'american_express':
        return 'text-green-600 bg-green-50';
      case 'elo':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-purple-600 bg-purple-50';
    }
  };

  const tabs = [
    { id: 'wallet', label: 'Carteira', icon: <Wallet className="w-4 h-4" /> },
    { id: 'table', label: 'Tabela', icon: <Table className="w-4 h-4" /> },
  ];

  return (
    <>
      <div className="space-y-4 sm:space-y-6 w-full min-w-0 ">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 px-1 sm:px-0">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="p-1.5 sm:p-2 bg-purple-100 rounded-lg flex-shrink-0">
              <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Cartões de Crédito</h1>
              <p className="text-sm sm:text-base text-gray-600">Gerencie seus cartões de crédito</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3 flex-wrap gap-2">
            <TabSelector
              tabs={tabs}
              activeTab={activeTab}
              onChange={setActiveTab}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Filtros
            </Button>
            <Button onClick={handleCreateCard} size="sm">
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Novo Cartão
            </Button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="px-1 sm:px-0">
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <div className="sm:col-span-2 lg:col-span-1">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Buscar</label>
                    <Input
                      placeholder="Buscar cartões..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Content based on active tab */}
        <div className="px-1 sm:px-0">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
            </div>
          ) : (
            <>
              {activeTab === 'wallet' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">Meus Cartões</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6">
                    <CreditCardWallet
                      cards={creditCards}
                      onEdit={handleEditCard}
                      onDelete={handleDeleteCard}
                    />
                  </CardContent>
                </Card>
              )}

              {activeTab === 'table' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">Cartões Cadastrados</CardTitle>
                  </CardHeader>
                  <CardContent className="py-0 px-1 sm:px-6">
                    <div className="w-full overflow-x-auto">
                      <table className="w-full min-w-[900px]">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 min-w-[120px]">Nome</th>
                            <th className="text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 min-w-[80px]">Bandeira</th>
                            <th className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 min-w-[100px]">Limite</th>
                            <th className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 min-w-[100px]">Saldo Inicial</th>
                            <th className="text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 min-w-[80px]">Fechamento</th>
                            <th className="text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 min-w-[80px]">Vencimento</th>
                            <th className="text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 min-w-[100px]">Conta Associada</th>
                            <th className="text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 min-w-[80px]">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {creditCards.map((card) => (
                            <tr key={card.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-2 sm:py-3 px-2 sm:px-4">
                                <div className="flex items-center space-x-2">
                                  <div 
                                    className="w-6 h-6 rounded flex items-center justify-center text-white"
                                    style={{ backgroundColor: card.color || '#6366F1' }}
                                  >
                                    {card.icon && React.createElement(
                                      LucideIcons[card.icon as keyof typeof LucideIcons] as React.ComponentType<any>,
                                      { className: 'w-3 h-3' }
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{card.title}</p>
                                    {card.description && (
                                      <p className="text-xs text-gray-500 truncate">{card.description}</p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="py-2 sm:py-3 px-2 sm:px-4 text-center">
                                <span className={`inline-flex px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-medium rounded-full ${getFlagColor(card.flag)}`}>
                                  {getFlagLabel(card.flag)}
                                </span>
                              </td>
                              <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-xs sm:text-sm font-medium text-gray-900">
                                {formatCurrency(Number(card.limit))}
                              </td>
                              <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-xs sm:text-sm font-medium text-gray-900">
                                {formatCurrency(Number(card.initial_balance || 0))}
                              </td>
                              <td className="py-2 sm:py-3 px-2 sm:px-4 text-center text-xs sm:text-sm text-gray-600">
                                Dia {card.closing_day}
                              </td>
                              <td className="py-2 sm:py-3 px-2 sm:px-4 text-center text-xs sm:text-sm text-gray-600">
                                Dia {card.due_day}
                              </td>
                              <td className="py-2 sm:py-3 px-2 sm:px-4">
                                <div className="flex justify-center space-x-1 sm:space-x-2">
                                  <button
                                    onClick={() => handleEditCard(card)}
                                    className="p-0.5 sm:p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                    title="Editar"
                                  >
                                    <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCard(card.id)}
                                    className="p-0.5 sm:p-1 text-gray-400 hover:text-red-600 transition-colors"
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
                      
                      {creditCards.length === 0 && (
                        <div className="text-center py-6 sm:py-8 text-gray-500 px-4">
                          <CreditCard className="w-8 h-8 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
                          <p className="text-base sm:text-lg font-medium">Nenhum cartão encontrado</p>
                          <p className="text-xs sm:text-sm">Comece criando seu primeiro cartão</p>
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
      <CreditCardModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        card={editingCard}
        onSave={async (data) => {
          if (editingCard) {
            await updateCreditCard.mutateAsync({ id: editingCard.id, updates: data });
          } else {
            await createCreditCard.mutateAsync(data);
          }
          setShowModal(false);
        }}
      />
    </>
  );
}

// Modal Component
interface CreditCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  card?: any;
  onSave: (data: any) => Promise<void>;
}

function CreditCardModal({ isOpen, onClose, card, onSave }: CreditCardModalProps) {
  const { data: accounts = [] } = useAccounts({ type: 'all', search: '' });
  
  const [formData, setFormData] = useState<CreditCardFormData>({
    title: '',
    flag: 'visa',
    limit: 0,
    initial_balance: 0,
    account_id: '',
    due_day: 10,
    closing_day: 5,
    last_four_digits: '',
    color: '#6366F1',
    icon: 'CreditCard',
    description: '',
  });

  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    if (card) {
      setFormData({
        title: card.title || '',
        flag: card.flag || 'visa',
        limit: Number(card.limit) || 0,
        initial_balance: Number(card.initial_balance) || 0,
        due_day: card.due_day || 10,
        closing_day: card.closing_day || 5,
        last_four_digits: card.last_four_digits || '',
        color: card.color || '#6366F1',
        icon: card.icon || 'CreditCard',
        description: card.description || '',
      });
    } else {
      setFormData({
        title: '',
        flag: 'visa',
        limit: 0,
        initial_balance: 0,
        due_day: 10,
        closing_day: 5,
        last_four_digits: '',
        color: '#6366F1',
        icon: 'CreditCard',
        description: '',
      });
    }
  }, [card]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const cardData: CreditCardData = {
        title: formData.title,
        flag: formData.flag,
        limit: formData.limit,
        initial_balance: formData.initial_balance,
        due_day: formData.due_day,
        closing_day: formData.closing_day,
        last_four_digits: formData.last_four_digits,
        color: formData.color,
        icon: formData.icon,
        description: formData.description,
      };
      await onSave(cardData);
    } catch (error) {
      console.error('Error saving credit card:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreditCardFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const typeOptions = [
    { value: 'bank', label: 'Banco' },
    { value: 'cash', label: 'Dinheiro' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={card ? 'Editar Cartão' : 'Novo Cartão'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input
              label="Nome do cartão"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Ex: Cartão Nubank Roxinho"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bandeira
            </label>
            <Dropdown
              options={flagOptions}
              value={formData.flag}
              onChange={(value) => handleInputChange('flag', value)}
            />
          </div>

          <Input
            label="Últimos 4 dígitos"
            value={formData.last_four_digits}
            onChange={(e) => handleInputChange('last_four_digits', e.target.value)}
            placeholder="1234"
            maxLength={4}
          />

          <Input
            label="Limite"
            type="number"
            step="0.01"
            value={formData.limit}
            onChange={(e) => handleInputChange('limit', Number(e.target.value))}
            required
          />

          <Input
            label="Saldo inicial"
            type="number"
            step="0.01"
            value={formData.initial_balance}
            onChange={(e) => handleInputChange('initial_balance', Number(e.target.value))}
          />

          <Input
            label="Dia do fechamento"
            type="number"
            min="1"
            max="31"
            value={formData.closing_day}
            onChange={(e) => handleInputChange('closing_day', Number(e.target.value))}
            required
          />

          <Input
            label="Dia do vencimento"
            type="number"
            min="1"
            max="31"
            value={formData.due_day}
            onChange={(e) => handleInputChange('due_day', Number(e.target.value))}
            required
          />

          <ColorPicker
            label="Cor do cartão"
            value={formData.color}
            onChange={(value) => handleInputChange('color', value)}
          />

          <IconPicker
            label="Ícone do cartão"
            value={formData.icon}
            onChange={(value) => handleInputChange('icon', value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descrição
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Descrição adicional do cartão..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent"
            rows={3}
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={isLoading}>
            {card ? 'Atualizar' : 'Criar'} Cartão
          </Button>
        </div>
      </form>
    </Modal>
  );
}