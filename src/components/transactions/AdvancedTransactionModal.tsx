import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, DollarSign, CreditCard, Building, Tag, Target, Eye, CreditCard as Edit, Trash2, Plus, AlertCircle, Repeat, Clock } from 'lucide-react';
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
import type { AdvancedTransactionData, InstallmentData, RecurrenceData } from '../../types';

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

const paymentMethodOptions = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'credito_em_conta', label: 'Crédito em Conta' },
  { value: 'debito_em_conta', label: 'Débito em Conta' },
  { value: 'cheque_a_vista', label: 'Cheque à Vista' },
  { value: 'cheque_a_prazo', label: 'Cheque a Prazo' },
  { value: 'cartao_de_credito', label: 'Cartão de Crédito' },
  { value: 'cartao_de_debito', label: 'Cartão de Débito' },
  { value: 'guia', label: 'Guia' },
  { value: 'permuta', label: 'Permuta' },
  { value: 'pix', label: 'PIX' },
  { value: 'debito_automatico', label: 'Débito Automático' },
];

const recurrenceTypeOptions = [
  { value: 'daily', label: 'Diário' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'yearly', label: 'Anual' },
];

const dueAdjustmentOptions = [
  { value: 'none', label: 'Nenhum ajuste' },
  { value: 'previous_business_day', label: 'Dia útil anterior' },
  { value: 'next_business_day', label: 'Próximo dia útil' },
];

// Smart currency formatter
const formatCurrencyInput = (value: string): string => {
  const numericValue = value.replace(/\D/g, '');
  if (!numericValue) return '';
  const number = parseInt(numericValue) / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(number);
};

// Parse currency input to number
const parseCurrencyInput = (value: string): number => {
  const numericValue = value.replace(/\D/g, '');
  return numericValue ? parseInt(numericValue) / 100 : 0;
};

interface AdvancedTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionType: 'income' | 'expense' | 'debt' | 'investment';
  onSave: (data: AdvancedTransactionData) => Promise<void>;
}

export function AdvancedTransactionModal({ 
  isOpen, 
  onClose, 
  transactionType, 
  onSave 
}: AdvancedTransactionModalProps) {
  const { currentWorkspace } = useWorkspace();
  const [activeTab, setActiveTab] = useState('data');
  const [installments, setInstallments] = useState<InstallmentData[]>([]);
  const [installmentsGenerated, setInstallmentsGenerated] = useState(false);
  const [currencyDisplayValue, setCurrencyDisplayValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [currentInstallmentNumber, setCurrentInstallmentNumber] = useState(1);
  const [totalInstallments, setTotalInstallments] = useState(12);
  
  const [recurrenceData, setRecurrenceData] = useState<RecurrenceData>({
    enabled: false,
    start_date: new Date().toISOString().split('T')[0],
    recurrence_type: 'monthly',
    due_adjustment: 'none',
  });

  // Data hooks
  const { data: accounts = [] } = useAccounts({ type: 'all', search: '' });
  const { data: creditCards = [] } = useCreditCards({ search: '' });
  const { data: categories = [] } = useCategories({ 
    type: transactionType === 'income' ? 'income' : 'expense', 
    search: '' 
  });
  const { data: costCenters = [] } = useCostCenters({ status: 'active', search: '' });

  const {
    control,
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      emission_date: new Date().toISOString().split('T')[0],
      due_date: new Date().toISOString().split('T')[0],
      competence_date: new Date().toISOString().slice(0, 7),
      is_installment: false,
      is_recurring: false,
      payment_method: 'pix',
      amount: 0,
    },
  });

  const watchedValues = watch();
  const isInstallment = watch('is_installment');
  const isRecurring = watch('is_recurring');
  const emissionDate = watch('emission_date');
  const mainAmount = watch('amount');

  // Auto-fill dates when emission date changes
  useEffect(() => {
    if (emissionDate) {
      setValue('due_date', emissionDate);
      setValue('competence_date', emissionDate.slice(0, 7));
      setRecurrenceData(prev => ({ ...prev, start_date: emissionDate }));
    }
  }, [emissionDate, setValue]);

  // Reset installments when installment toggle is turned off
  useEffect(() => {
    if (!isInstallment) {
      setInstallments([]);
      setInstallmentsGenerated(false);
      setCurrentInstallmentNumber(1);
      setTotalInstallments(12);
    }
  }, [isInstallment]);

  // Reset recurrence when recurring toggle is turned off
  useEffect(() => {
    if (!isRecurring) {
      setRecurrenceData(prev => ({ ...prev, enabled: false }));
    } else {
      setRecurrenceData(prev => ({ ...prev, enabled: true }));
    }
  }, [isRecurring]);

  // Initialize currency display value
  useEffect(() => {
    if (mainAmount > 0) {
      setCurrencyDisplayValue(formatCurrencyInput((mainAmount * 100).toString()));
    }
  }, [mainAmount]);

  // Handle tab change - NO VALIDATION, NO API CALLS
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
  };

  // Handle currency input with real-time formatting
  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const formatted = formatCurrencyInput(inputValue);
    setCurrencyDisplayValue(formatted);
    
    const numericValue = parseCurrencyInput(inputValue);
    setValue('amount', numericValue || 0, { shouldValidate: true });
  };

  // Generate installments - NO API CALLS
  const generateInstallments = () => {
    if (!mainAmount || mainAmount <= 0) {
      return;
    }

    const installmentCount = totalInstallments;
    const installmentAmount = mainAmount / installmentCount;
    const newInstallments: InstallmentData[] = [];

    for (let i = 1; i <= installmentCount; i++) {
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

  const updateInstallment = (id: string, field: keyof InstallmentData, value: any) => {
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

    const newInstallment: InstallmentData = {
      id: `installment-${Date.now()}`,
      number: newNumber,
      date: lastDate.toISOString().split('T')[0],
      competence: lastDate.toISOString().slice(0, 7),
      cost_center_id: watchedValues.cost_center_id || '',
      amount: mainAmount / (installments.length + 1) || 0,
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
    
    const tolerance = 0.01;
    return Math.abs(installmentsTotal - mainAmount) < tolerance;
  }, [isInstallment, installmentsGenerated, installments.length, installmentsTotal, mainAmount]);

  // Generate recurrence preview
  const generateRecurrencePreview = (): string[] => {
    if (!recurrenceData.enabled) return [];
    
    const preview: string[] = [];
    const startDate = new Date(recurrenceData.start_date);
    const endDate = recurrenceData.end_date ? new Date(recurrenceData.end_date) : null;
    const maxPreview = 5;
    
    for (let i = 0; i < (recurrenceData.repeat_count || maxPreview); i++) {
      const date = new Date(startDate);
      
      switch (recurrenceData.recurrence_type) {
        case 'daily':
          date.setDate(date.getDate() + i);
          break;
        case 'weekly':
          date.setDate(date.getDate() + (i * 7));
          break;
        case 'monthly':
          date.setMonth(date.getMonth() + i);
          break;
        case 'yearly':
          date.setFullYear(date.getFullYear() + i);
          break;
      }
      
      if (endDate && date > endDate) break;
      if (preview.length >= maxPreview) break;
      
      preview.push(date.toLocaleDateString('pt-BR'));
    }
    
    return preview;
  };

  // Final validation before save
  const validateBeforeSave = async (): Promise<boolean> => {
    // Validate required fields
    const requiredFields = [
      'description',
      'emission_date', 
      'due_date',
      'competence_date',
      'amount',
      'account_id',
      'payment_method'
    ] as const;

    const isDataValid = await trigger(requiredFields);
    if (!isDataValid) {
      return false;
    }

    // Validate installments if enabled
    if (isInstallment) {
      if (!installmentsGenerated) {
        return false;
      }

      if (!installmentsValid) {
        return false;
      }
    }

    // Validate recurrence if enabled
    if (isRecurring && !recurrenceData.enabled) {
      return false;
    }

    return true;
  };

  // ONLY submit function that makes API calls
  const onSubmit = async (data: TransactionFormData) => {
    setIsSaving(true);

    try {
      // Final validation
      const isValid = await validateBeforeSave();
      if (!isValid) {
        setIsSaving(false);
        alert('Por favor, preencha todos os campos obrigatórios e configure as opções selecionadas antes de salvar.');
        return;
      }

      // Prepare transaction data
      const transactionData: AdvancedTransactionData = {
        transaction_type: transactionType,
        description: data.description,
        emission_date: data.emission_date,
        due_date: data.due_date,
        competence_date: data.competence_date,
        amount: data.amount,
        account_id: data.account_id,
        credit_card_id: data.credit_card_id,
        cost_center_id: data.cost_center_id,
        category_id: data.category_id,
        payment_method: data.payment_method,
        is_installment: data.is_installment,
        is_recurring: data.is_recurring,
        installments: data.is_installment ? installments : undefined,
        recurrence: data.is_recurring ? recurrenceData : undefined,
      };

      // Make API call
      await onSave(transactionData);
      handleClose();
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert('Erro ao salvar transação. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    reset();
    setInstallments([]);
    setInstallmentsGenerated(false);
    setActiveTab('data');
    setCurrencyDisplayValue('');
    setIsSaving(false);
    setCurrentInstallmentNumber(1);
    setTotalInstallments(12);
    setRecurrenceData({
      enabled: false,
      start_date: new Date().toISOString().split('T')[0],
      recurrence_type: 'monthly',
      due_adjustment: 'none',
    });
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
    { 
      id: 'recurrence', 
      label: 'Recorrência', 
      icon: <Repeat className="w-4 h-4" />,
      disabled: !isRecurring 
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
        {/* Tab Navigation */}
        <TabSelector
          tabs={tabs}
          activeTab={activeTab}
          onChange={handleTabChange}
        />

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
                  label="Descrição *"
                  {...register('description')}
                  placeholder="Ex: Salário, Conta de luz, Freelance..."
                  error={errors.description?.message}
                  required
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="Data de Emissão *"
                    type="date"
                    {...register('emission_date')}
                    error={errors.emission_date?.message}
                    required
                  />

                  <Input
                    label="Data de Vencimento *"
                    type="date"
                    {...register('due_date')}
                    error={errors.due_date?.message}
                    required
                  />

                  <Input
                    label="Data de Competência *"
                    type="month"
                    {...register('competence_date')}
                    error={errors.competence_date?.message}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Valor *
                    </label>
                    <input
                      type="text"
                      value={currencyDisplayValue}
                      onChange={handleCurrencyChange}
                      placeholder="R$ 0,00"
                      className={cn(
                        'block w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-black focus:border-transparent',
                        errors.amount && 'border-red-300 focus:ring-red-500'
                      )}
                      required
                    />
                    {errors.amount && (
                      <p className="text-xs text-red-600 mt-1">{errors.amount.message}</p>
                    )}
                  </div>

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

                  {/* Credit Card - Only for expenses */}
                  {transactionType === 'expense' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cartão de Crédito (opcional)
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
                      Centro de Custo (opcional)
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
                      Categoria (opcional)
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
                  Opções Avançadas
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

                  {/* Installment Field - Only show when installment is enabled */}
                  {isInstallment && (
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-gray-700">Parcela:</label>
                      <div className="flex items-center space-x-1">
                        <input
                          type="number"
                          min="1"
                          max={totalInstallments}
                          value={currentInstallmentNumber}
                          onChange={(e) => setCurrentInstallmentNumber(Number(e.target.value))}
                          className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-600">/</span>
                        <input
                          type="number"
                          min="2"
                          max="99"
                          value={totalInstallments}
                          onChange={(e) => setTotalInstallments(Number(e.target.value))}
                          className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}

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

              {/* Generate Installments Button */}
              <div className="flex items-center justify-center">
                <Button
                  type="button"
                  onClick={generateInstallments}
                  disabled={!mainAmount || mainAmount <= 0}
                  variant="outline"
                  size="lg"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Visualizar Parcelas
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
                                  className="text-xs border border-gray-300 rounded px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="month"
                                  value={installment.competence}
                                  onChange={(e) => updateInstallment(installment.id, 'competence', e.target.value)}
                                  className="text-xs border border-gray-300 rounded px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <select
                                  value={installment.cost_center_id}
                                  onChange={(e) => updateInstallment(installment.id, 'cost_center_id', e.target.value)}
                                  className="text-xs border border-gray-300 rounded px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                                  className="text-xs border border-gray-300 rounded px-2 py-1 w-full text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                  <p className="text-xs">Clique em "Visualizar Parcelas" para gerar as parcelas automaticamente</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'recurrence' && isRecurring && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Configuração de Recorrência
                </h3>
                <div className="text-sm text-gray-600">
                  Valor por ocorrência: <span className="font-semibold">{formatCurrency(mainAmount || 0)}</span>
                </div>
              </div>

              {/* Recurrence Configuration */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Data de Início"
                    type="date"
                    value={recurrenceData.start_date}
                    onChange={(e) => setRecurrenceData(prev => ({ ...prev, start_date: e.target.value }))}
                    required
                  />

                  <Input
                    label="Data de Fim (opcional)"
                    type="date"
                    value={recurrenceData.end_date || ''}
                    onChange={(e) => setRecurrenceData(prev => ({ ...prev, end_date: e.target.value || undefined }))}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Recorrência
                    </label>
                    <Dropdown
                      options={recurrenceTypeOptions}
                      value={recurrenceData.recurrence_type}
                      onChange={(value) => setRecurrenceData(prev => ({ ...prev, recurrence_type: value as any }))}
                    />
                  </div>

                  <Input
                    label="Número de Repetições (opcional)"
                    type="number"
                    min="1"
                    value={recurrenceData.repeat_count || ''}
                    onChange={(e) => setRecurrenceData(prev => ({ 
                      ...prev, 
                      repeat_count: e.target.value ? Number(e.target.value) : undefined 
                    }))}
                    placeholder="Ex: 12 para 12 meses"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ajuste de Vencimento
                  </label>
                  <Dropdown
                    options={dueAdjustmentOptions}
                    value={recurrenceData.due_adjustment}
                    onChange={(value) => setRecurrenceData(prev => ({ ...prev, due_adjustment: value as any }))}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Como ajustar vencimentos que caem em fins de semana ou feriados
                  </p>
                </div>

                {/* Recurrence Day for specific types */}
                {(recurrenceData.recurrence_type === 'monthly' || recurrenceData.recurrence_type === 'yearly') && (
                  <Input
                    label={`Dia do ${recurrenceData.recurrence_type === 'monthly' ? 'Mês' : 'Ano'}`}
                    type="number"
                    min="1"
                    max={recurrenceData.recurrence_type === 'monthly' ? "31" : "365"}
                    value={recurrenceData.recurrence_day || ''}
                    onChange={(e) => setRecurrenceData(prev => ({ ...prev, recurrence_day: e.target.value }))}
                    placeholder={recurrenceData.recurrence_type === 'monthly' ? "Ex: 15 para dia 15" : "Ex: 90 para 90º dia do ano"}
                  />
                )}
              </div>

              {/* Recurrence Preview */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-3 flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  Prévia da Recorrência
                </h4>
                
                <div className="space-y-2">
                  <p className="text-sm text-blue-800">
                    <strong>Tipo:</strong> {recurrenceTypeOptions.find(t => t.value === recurrenceData.recurrence_type)?.label}
                  </p>
                  <p className="text-sm text-blue-800">
                    <strong>Início:</strong> {new Date(recurrenceData.start_date).toLocaleDateString('pt-BR')}
                  </p>
                  {recurrenceData.end_date && (
                    <p className="text-sm text-blue-800">
                      <strong>Fim:</strong> {new Date(recurrenceData.end_date).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                  {recurrenceData.repeat_count && (
                    <p className="text-sm text-blue-800">
                      <strong>Repetições:</strong> {recurrenceData.repeat_count}x
                    </p>
                  )}
                  
                  <div className="mt-3">
                    <p className="text-sm font-medium text-blue-900 mb-2">Próximas ocorrências:</p>
                    <div className="flex flex-wrap gap-2">
                      {generateRecurrencePreview().map((date, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          {date}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex justify-between items-center pt-6 border-t border-gray-200">
          <div className="text-sm text-gray-600 space-y-1">
            {isInstallment && (
              <div className={cn(
                installmentsGenerated && installmentsValid ? 'text-green-600' : 'text-yellow-600'
              )}>
                Parcelas: {installmentsGenerated ? 
                  (installmentsValid ? `${installments.length} válidas` : `${installments.length} com erro`) : 
                  'Não geradas'
                }
              </div>
            )}
            {isRecurring && (
              <div className={cn(
                recurrenceData.enabled ? 'text-green-600' : 'text-yellow-600'
              )}>
                Recorrência: {recurrenceData.enabled ? 'Configurada' : 'Não configurada'}
              </div>
            )}
          </div>
          
          <div className="flex space-x-3">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSaving}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              loading={isSaving}
            >
              Salvar {getTransactionTypeLabel()}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}