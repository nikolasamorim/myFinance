import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, DollarSign, CreditCard, Building, Tag, Target, Eye, Edit, Trash2, Plus } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Dropdown } from '../ui/Dropdown';
import { TabSelector } from '../ui/TabSelector';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAccounts } from '../../hooks/useAccounts';
import { useCreditCards } from '../../hooks/useCreditCards';
import { useCategories } from '../../hooks/useCategories';
import { useCostCenters } from '../../hooks/useCostCenters';
import { formatCurrency, formatDate } from '../../lib/utils';
import { cn } from '../../lib/utils';

const transactionSchema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória'),
  emission_date: z.string().min(1, 'Data de emissão é obrigatória'),
  due_date: z.string().min(1, 'Data de vencimento é obrigatória'),
  competence_date: z.string().min(1, 'Data de competência é obrigatória'),
  amount: z.number().min(0.01, 'Valor deve ser maior que zero'),
  account_id: z.string().min(1, 'Conta é obrigatória'),
  credit_card_id: z.string().optional(),
  cost_center_id: z.string().optional(),
  category_id: z.string().optional(),
  payment_method: z.string().min(1, 'Método de pagamento é obrigatório'),
  is_installment: z.boolean().default(false),
  is_recurring: z.boolean().default(false),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface Installment {
  id: string;
  number: number;
  date: string;
  competence: string;
  cost_center_id: string;
  amount: number;
}

interface AdvancedTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionType: 'income' | 'expense' | 'debt' | 'investment';
  onSave: (data: any) => Promise<void>;
}

const paymentMethodOptions = [
  { value: 'cash', label: 'Dinheiro' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'credit_to_account', label: 'Crédito em Conta' },
  { value: 'debit_to_account', label: 'Débito em Conta' },
  { value: 'check_cash', label: 'Cheque (à vista)' },
  { value: 'check_term', label: 'Cheque (a prazo)' },
  { value: 'credit_card', label: 'Cartão de Crédito' },
  { value: 'debit_card', label: 'Cartão de Débito' },
  { value: 'bank_slip', label: 'Boleto Bancário' },
  { value: 'barter', label: 'Permuta' },
  { value: 'pix', label: 'PIX' },
  { value: 'auto_debit', label: 'Débito Automático' },
];

export function AdvancedTransactionModal({ 
  isOpen, 
  onClose, 
  transactionType, 
  onSave 
}: AdvancedTransactionModalProps) {
  const { currentWorkspace } = useWorkspace();
  const [activeTab, setActiveTab] = useState('data');
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [installmentInput, setInstallmentInput] = useState('');
  const [installmentsGenerated, setInstallmentsGenerated] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Data hooks
  const { data: accounts = [] } = useAccounts({ type: 'all', search: '' });
  const { data: creditCards = [] } = useCreditCards({ search: '' });
  const { data: categories = [] } = useCategories({ type: transactionType === 'income' ? 'income' : 'expense', search: '' });
  const { data: costCenters = [] } = useCostCenters({ status: 'active', search: '' });

  const {
    control,
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      emission_date: new Date().toISOString().split('T')[0],
      due_date: new Date().toISOString().split('T')[0],
      competence_date: new Date().toISOString().slice(0, 7), // YYYY-MM format
      is_installment: false,
      is_recurring: false,
      payment_method: 'pix',
    },
  });

  const watchedValues = watch();
  const isInstallment = watch('is_installment');
  const emissionDate = watch('emission_date');
  const mainAmount = watch('amount');

  // Auto-fill dates when emission date changes
  useEffect(() => {
    if (emissionDate) {
      setValue('due_date', emissionDate);
      setValue('competence_date', emissionDate.slice(0, 7)); // YYYY-MM
    }
  }, [emissionDate, setValue]);

  // Reset installments when installment toggle is turned off
  useEffect(() => {
    if (!isInstallment) {
      setInstallments([]);
      setInstallmentsGenerated(false);
      setInstallmentInput('');
      setActiveTab('data');
    }
  }, [isInstallment]);

  // Format currency input
  const formatCurrencyInput = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    const formattedValue = (parseInt(numericValue) / 100).toFixed(2);
    return parseFloat(formattedValue);
  };

  const generateInstallments = () => {
    if (!installmentInput.match(/^\d{1,2}\/\d{1,2}$/)) {
      setValidationError('Formato inválido. Use o formato 00/00');
      return;
    }

    const [current, total] = installmentInput.split('/').map(Number);
    
    if (current < 1 || current > total || total < 1) {
      setValidationError('Valores inválidos para parcelas');
      return;
    }

    if (!mainAmount || mainAmount <= 0) {
      setValidationError('Defina o valor principal antes de gerar parcelas');
      return;
    }

    setValidationError('');

    const installmentAmount = mainAmount / total;
    const newInstallments: Installment[] = [];

    for (let i = 1; i <= total; i++) {
      const installmentDate = new Date(watchedValues.due_date);
      installmentDate.setMonth(installmentDate.getMonth() + (i - 1));

      newInstallments.push({
        id: `installment-${i}`,
        number: i,
        date: installmentDate.toISOString().split('T')[0],
        competence: installmentDate.toISOString().slice(0, 7),
        cost_center_id: watchedValues.cost_center_id || '',
        amount: installmentAmount,
      });
    }

    setInstallments(newInstallments);
    setInstallmentsGenerated(true);
  };

  const updateInstallment = (id: string, field: keyof Installment, value: any) => {
    setInstallments(prev => prev.map(inst => 
      inst.id === id ? { ...inst, [field]: value } : inst
    ));
  };

  const deleteInstallment = (id: string) => {
    setInstallments(prev => prev.filter(inst => inst.id !== id));
  };

  const addInstallment = () => {
    const newNumber = Math.max(...installments.map(i => i.number), 0) + 1;
    const lastDate = installments.length > 0 
      ? new Date(installments[installments.length - 1].date)
      : new Date(watchedValues.due_date);
    
    lastDate.setMonth(lastDate.getMonth() + 1);

    const newInstallment: Installment = {
      id: `installment-${Date.now()}`,
      number: newNumber,
      date: lastDate.toISOString().split('T')[0],
      competence: lastDate.toISOString().slice(0, 7),
      cost_center_id: watchedValues.cost_center_id || '',
      amount: mainAmount / installments.length || 0,
    };

    setInstallments(prev => [...prev, newInstallment]);
  };

  // Calculate installments total
  const installmentsTotal = useMemo(() => {
    return installments.reduce((sum, inst) => sum + inst.amount, 0);
  }, [installments]);

  // Validation for installments
  const installmentsValid = useMemo(() => {
    if (!isInstallment) return true;
    if (!installmentsGenerated) return false;
    if (installments.length === 0) return false;
    
    const tolerance = 0.01; // Allow 1 cent difference due to rounding
    return Math.abs(installmentsTotal - mainAmount) < tolerance;
  }, [isInstallment, installmentsGenerated, installments.length, installmentsTotal, mainAmount]);

  const onSubmit = async (data: TransactionFormData) => {
    setValidationError('');

    // Validate installments if needed
    if (data.is_installment) {
      if (!installmentsGenerated) {
        setValidationError('Gere as parcelas antes de salvar');
        setActiveTab('installments');
        return;
      }

      if (!installmentsValid) {
        setValidationError('A soma das parcelas deve ser igual ao valor principal');
        setActiveTab('installments');
        return;
      }
    }

    try {
      const transactionData = {
        ...data,
        transaction_type: transactionType,
        transaction_workspace_id: currentWorkspace?.workspace_id,
        installments: data.is_installment ? installments : undefined,
      };

      await onSave(transactionData);
      handleClose();
    } catch (error) {
      console.error('Error saving transaction:', error);
      setValidationError('Erro ao salvar transação. Tente novamente.');
    }
  };

  const handleClose = () => {
    reset();
    setInstallments([]);
    setInstallmentsGenerated(false);
    setInstallmentInput('');
    setActiveTab('data');
    setValidationError('');
    onClose();
  };

  // Options for dropdowns
  const accountOptions = accounts.map(account => ({
    value: account.id,
    label: account.title,
    icon: <Building className="w-4 h-4" />,
  }));

  const creditCardOptions = creditCards.map(card => ({
    value: card.id,
    label: card.title,
    icon: <CreditCard className="w-4 h-4" />,
  }));

  const categoryOptions = [
    { value: '', label: 'Nenhuma categoria' },
    ...categories.map(category => ({
      value: category.category_id,
      label: category.category_name,
      icon: <Tag className="w-4 h-4" />,
    }))
  ];

  const costCenterOptions = [
    { value: '', label: 'Nenhum centro de custo' },
    ...costCenters.map(center => ({
      value: center.id,
      label: center.title,
      icon: <Target className="w-4 h-4" />,
    }))
  ];

  const tabs = [
    { id: 'data', label: 'Dados', icon: <Calendar className="w-4 h-4" /> },
    { 
      id: 'installments', 
      label: 'Parcelas', 
      icon: <CreditCard className="w-4 h-4" />,
      disabled: !isInstallment 
    },
  ];

  const getTransactionTypeLabel = () => {
    switch (transactionType) {
      case 'income': return 'Receita';
      case 'expense': return 'Despesa';
      case 'debt': return 'Dívida';
      case 'investment': return 'Investimento';
      default: return 'Transação';
    }
  };

  const getTransactionTypeColor = () => {
    switch (transactionType) {
      case 'income': return 'text-green-600';
      case 'expense': return 'text-red-600';
      case 'debt': return 'text-orange-600';
      case 'investment': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <div className="flex items-center space-x-2">
          <span>Nova {getTransactionTypeLabel()}</span>
          <span className={`text-sm font-normal ${getTransactionTypeColor()}`}>
            ({transactionType})
          </span>
        </div>
      }
      size="xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Error Display */}
        {validationError && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
            <p className="text-sm font-medium">{validationError}</p>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <TabSelector
            tabs={tabs.filter(tab => !tab.disabled)}
            activeTab={activeTab}
            onChange={setActiveTab}
            className="mb-0"
          />
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeTab === 'data' && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Informações Básicas
                </h3>
                
                <Input
                  label="Descrição"
                  {...register('description')}
                  placeholder="Ex: Salário, Conta de luz, Freelance..."
                  error={errors.description?.message}
                  required
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="Data de Emissão"
                    type="date"
                    {...register('emission_date')}
                    error={errors.emission_date?.message}
                    required
                  />

                  <Input
                    label="Data de Vencimento"
                    type="date"
                    {...register('due_date')}
                    error={errors.due_date?.message}
                    required
                  />

                  <Input
                    label="Data de Competência"
                    type="month"
                    {...register('competence_date')}
                    error={errors.competence_date?.message}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Controller
                    name="amount"
                    control={control}
                    render={({ field }) => (
                      <Input
                        label="Valor"
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={field.value || ''}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        error={errors.amount?.message}
                        required
                      />
                    )}
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Método de Pagamento *
                    </label>
                    <Controller
                      name="payment_method"
                      control={control}
                      render={({ field }) => (
                        <Dropdown
                          options={paymentMethodOptions}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Selecione o método"
                        />
                      )}
                    />
                    {errors.payment_method && (
                      <p className="text-xs text-red-600 mt-1">{errors.payment_method.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Account and Payment Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Conta e Pagamento
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Conta Bancária / Caixa *
                    </label>
                    <Controller
                      name="account_id"
                      control={control}
                      render={({ field }) => (
                        <Dropdown
                          options={accountOptions}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Selecione uma conta"
                        />
                      )}
                    />
                    {errors.account_id && (
                      <p className="text-xs text-red-600 mt-1">{errors.account_id.message}</p>
                    )}
                  </div>

                  {/* Credit Card - Only for expenses and not installments */}
                  {transactionType === 'expense' && !isInstallment && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cartão de Crédito
                      </label>
                      <Controller
                        name="credit_card_id"
                        control={control}
                        render={({ field }) => (
                          <Dropdown
                            options={[
                              { value: '', label: 'Nenhum cartão' },
                              ...creditCardOptions
                            ]}
                            value={field.value || ''}
                            onChange={field.onChange}
                            placeholder="Selecione um cartão"
                          />
                        )}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Organization */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Organização
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Centro de Custo
                    </label>
                    <Controller
                      name="cost_center_id"
                      control={control}
                      render={({ field }) => (
                        <Dropdown
                          options={costCenterOptions}
                          value={field.value || ''}
                          onChange={field.onChange}
                          placeholder="Selecione um centro"
                        />
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Categoria
                    </label>
                    <Controller
                      name="category_id"
                      control={control}
                      render={({ field }) => (
                        <Dropdown
                          options={categoryOptions}
                          value={field.value || ''}
                          onChange={field.onChange}
                          placeholder="Selecione uma categoria"
                        />
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Options */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Opções
                </h3>

                <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      {...register('is_installment')}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">É parcelado?</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      {...register('is_recurring')}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">É recorrente?</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'installments' && isInstallment && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Configuração de Parcelas
                </h3>
                <div className="text-sm text-gray-600">
                  Valor principal: <span className="font-semibold">{formatCurrency(mainAmount || 0)}</span>
                </div>
              </div>

              {/* Installment Input */}
              <div className="flex items-end space-x-3">
                <div className="flex-1 max-w-xs">
                  <Input
                    label="Parcelas"
                    value={installmentInput}
                    onChange={(e) => setInstallmentInput(e.target.value)}
                    placeholder="01/12"
                    pattern="\d{1,2}/\d{1,2}"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Formato: parcela atual/total (ex: 01/12)
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={generateInstallments}
                  disabled={!installmentInput || !mainAmount}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Ver Parcelas
                </Button>
              </div>

              {/* Installments List */}
              {installmentsGenerated && installments.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900">
                      Lista de Parcelas ({installments.length})
                    </h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addInstallment}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar
                    </Button>
                  </div>

                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="max-h-64 overflow-y-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Parcela</th>
                            <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Data</th>
                            <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Competência</th>
                            <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Centro de Custo</th>
                            <th className="text-right py-2 px-3 text-xs font-medium text-gray-600">Valor</th>
                            <th className="text-center py-2 px-3 text-xs font-medium text-gray-600">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {installments.map((installment, index) => (
                            <tr key={installment.id} className="border-t border-gray-100">
                              <td className="py-2 px-3 text-sm text-gray-900">
                                {installment.number}/{installments.length}
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="date"
                                  value={installment.date}
                                  onChange={(e) => updateInstallment(installment.id, 'date', e.target.value)}
                                  className="text-xs border border-gray-300 rounded px-2 py-1 w-full"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="month"
                                  value={installment.competence}
                                  onChange={(e) => updateInstallment(installment.id, 'competence', e.target.value)}
                                  className="text-xs border border-gray-300 rounded px-2 py-1 w-full"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <select
                                  value={installment.cost_center_id}
                                  onChange={(e) => updateInstallment(installment.id, 'cost_center_id', e.target.value)}
                                  className="text-xs border border-gray-300 rounded px-2 py-1 w-full"
                                >
                                  <option value="">Nenhum</option>
                                  {costCenters.map(center => (
                                    <option key={center.id} value={center.id}>
                                      {center.title}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={installment.amount}
                                  onChange={(e) => updateInstallment(installment.id, 'amount', Number(e.target.value))}
                                  className="text-xs border border-gray-300 rounded px-2 py-1 w-full text-right"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <div className="flex justify-center space-x-1">
                                  <button
                                    type="button"
                                    onClick={() => deleteInstallment(installment.id)}
                                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                    title="Excluir parcela"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Summary Row */}
                    <div className="bg-gray-50 border-t border-gray-200 px-3 py-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-900">
                          Total das Parcelas:
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className={cn(
                            'text-sm font-bold',
                            installmentsValid ? 'text-green-600' : 'text-red-600'
                          )}>
                            {formatCurrency(installmentsTotal)}
                          </span>
                          {!installmentsValid && (
                            <span className="text-xs text-red-600">
                              (Diferença: {formatCurrency(Math.abs(installmentsTotal - (mainAmount || 0)))})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {!installmentsValid && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-sm text-yellow-800">
                        <strong>Atenção:</strong> A soma das parcelas ({formatCurrency(installmentsTotal)}) 
                        não confere com o valor principal ({formatCurrency(mainAmount || 0)}). 
                        Ajuste os valores antes de salvar.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {!installmentsGenerated && (
                <div className="text-center py-8 text-gray-500">
                  <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm font-medium">Nenhuma parcela gerada</p>
                  <p className="text-xs">Configure o número de parcelas e clique em "Ver Parcelas"</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex justify-between items-center pt-6 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            {isInstallment && (
              <span>
                Parcelas: {installmentsGenerated ? `${installments.length} geradas` : 'Não geradas'}
              </span>
            )}
          </div>
          
          <div className="flex space-x-3">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              loading={isSubmitting}
              disabled={isInstallment && !installmentsValid}
            >
              Salvar {getTransactionTypeLabel()}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}