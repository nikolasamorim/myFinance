import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, DollarSign, CreditCard, Building, Tag, Target, Eye, CreditCard as Edit, Trash2, Plus, AlertCircle, Repeat, Clock, CheckCircle, CheckCheck, Save } from 'lucide-react';
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
import { useInstallmentGroup, useInstallmentsByGroup } from '../../hooks/useInstallments';
import { useUpdateTransaction, useDeleteTransaction } from '../../hooks/useTransactions';
import { formatCurrency, formatDate, cn } from '../../lib/utils';
import type { AdvancedTransactionData, InstallmentData, RecurrenceData, Transaction } from '../../types';

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
  transaction?: Transaction;
}

export function AdvancedTransactionModal({ 
  isOpen, 
  onClose, 
  transactionType, 
  onSave,
  transaction,
}: AdvancedTransactionModalProps) {
  const { currentWorkspace } = useWorkspace();
  const isEditing = !!transaction;
  const hasInstallmentGroup = isEditing && !!transaction?.installment_group_id;
  const installmentGroupId = transaction?.installment_group_id ?? null;
  const [activeTab, setActiveTab] = useState('data');
  const [installments, setInstallments] = useState<InstallmentData[]>([]);
  const [installmentsGenerated, setInstallmentsGenerated] = useState(false);
  const [currencyDisplayValue, setCurrencyDisplayValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [currentInstallmentNumber, setCurrentInstallmentNumber] = useState(1);
  const [totalInstallments, setTotalInstallments] = useState(12);
  // Estado local de edições por linha na tabela de gerenciamento de parcelas
  const [rowEdits, setRowEdits] = useState<Record<string, Partial<Transaction>>>({});
  const [markingAllPaid, setMarkingAllPaid] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkEditData, setBulkEditData] = useState<Record<string, string>>({});
  const [applyingBulkEdit, setApplyingBulkEdit] = useState(false);

  // Hooks para gerenciamento de parcelas existentes
  const { data: installmentGroupData } = useInstallmentGroup(installmentGroupId);
  const { data: installmentTransactions = [], isLoading: loadingInstallments } = useInstallmentsByGroup(installmentGroupId || '');
  const updateTransaction = useUpdateTransaction();
  const deleteTransaction = useDeleteTransaction();
  
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
    defaultValues: isEditing && transaction ? {
      // Preenche os campos usando a transação existente
      description: transaction.transaction_description,
      emission_date: transaction.transaction_issue_date || transaction.transaction_date,
      due_date: transaction.transaction_date,
      competence_date: transaction.transaction_competence_date,
      amount: Number(transaction.transaction_amount),
      account_id: transaction.transaction_bank_id || '',
      credit_card_id: transaction.transaction_card_id || undefined,
      cost_center_id: transaction.transaction_cost_center_id || undefined,
      category_id: transaction.transaction_category_id || undefined,
      payment_method: transaction.transaction_payment_method,
      is_installment: false,
      is_recurring: false,
    } : {
      emission_date: new Date().toISOString().split('T')[0],
      due_date: new Date().toISOString().split('T')[0],
      competence_date: new Date().toISOString().slice(0, 7),
      is_installment: false,
      is_recurring: false,
      payment_method: 'pix',
      amount: 0,
    },
  });

  // Normaliza o método de pagamento para os valores aceitos pelo Dropdown
  const normalizePaymentMethod = (raw?: string, cardId?: string) => {
    if (cardId) return 'cartao_de_credito';
    if (!raw) return 'pix'; // fallback
  
    const key = raw.trim().toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_');
  
    const map: Record<string, string> = {
      dinheiro: 'dinheiro',
      boleto: 'boleto',
      credito_em_conta: 'credito_em_conta',
      debito_em_conta: 'debito_em_conta',
      cheque_a_vista: 'cheque_a_vista',
      cheque_a_prazo: 'cheque_a_prazo',
      credito: 'cartao_de_credito',
      cartao_de_credito: 'cartao_de_credito',
      cartao_credito: 'cartao_de_credito',
      debito: 'cartao_de_debito',
      cartao_de_debito: 'cartao_de_debito',
      cartao_debito: 'cartao_de_debito',
      guia: 'guia',
      permuta: 'permuta',
      pix: 'pix',
      debito_automatico: 'debito_automatico',
    };
    return map[key] || 'pix';
  };

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab('data');
  
    if (transaction) {
      const emission = transaction.transaction_issue_date || transaction.transaction_date || new Date().toISOString().split('T')[0];
      const cardId = transaction.transaction_card_id || '';
      const payment = normalizePaymentMethod(transaction.transaction_payment_method, cardId);
  
      reset({
        description: transaction.transaction_description || '',
        emission_date: emission,
        due_date: transaction.transaction_date || emission,
        competence_date: transaction.transaction_competence_date || emission.slice(0, 7),
        amount: Number(transaction.transaction_amount) || 0,
        account_id: transaction.transaction_bank_id || '',
        credit_card_id: cardId || '',
        cost_center_id: transaction.transaction_cost_center_id || '',
        category_id: transaction.transaction_category_id || '',
        payment_method: payment,
        is_installment: false,
        is_recurring: false,
      });
  
      setCurrencyDisplayValue(
        formatCurrencyInput(String(Math.round((Number(transaction.transaction_amount) || 0) * 100)))
      );
  
      setInstallments([]);
      setInstallmentsGenerated(false);
      setRecurrenceData({
        enabled: false,
        start_date: emission,
        recurrence_type: 'monthly',
        due_adjustment: 'none',
      });
    } else {
      // valores padrão para criação de nova transação
      const today = new Date().toISOString().split('T')[0];
      reset({
        description: '',
        emission_date: today,
        due_date: today,
        competence_date: today.slice(0, 7),
        amount: 0,
        account_id: '',
        credit_card_id: '',
        cost_center_id: '',
        category_id: '',
        payment_method: 'pix',
        is_installment: false,
        is_recurring: false,
      });
      setCurrencyDisplayValue('');
    }
  }, [isOpen, transaction]);  

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

  // Inicializa o campo de moeda no modo de edição
  useEffect(() => {
    if (isEditing && transaction) {
      setCurrencyDisplayValue(
        formatCurrencyInput((transaction.transaction_amount * 100).toString())
      );
    }
  }, [isEditing, transaction]);

  // Handle tab change - NO VALIDATION, NO API CALLS
  const handleTabChange = (newTab: string) => {
    if (isEditing && !hasInstallmentGroup) return;
    if (newTab !== activeTab) setSelectedRows(new Set());
    setActiveTab(newTab);
  };

  // Gerenciamento de edição inline por linha
  const getRowValue = <K extends keyof Transaction>(txId: string, field: K, original: Transaction[K]): Transaction[K] => {
    return (rowEdits[txId]?.[field] as Transaction[K]) ?? original;
  };

  const setRowField = (txId: string, field: keyof Transaction, value: unknown) => {
    setRowEdits(prev => ({ ...prev, [txId]: { ...prev[txId], [field]: value } }));
  };

  const isRowDirty = (txId: string) => txId in rowEdits && Object.keys(rowEdits[txId]).length > 0;

  const saveRow = async (tx: Transaction) => {
    const edits = rowEdits[tx.transaction_id];
    if (!edits || Object.keys(edits).length === 0) return;
    if (edits.transaction_amount !== undefined && Number(edits.transaction_amount) <= 0) {
      alert('O valor da parcela deve ser maior que zero.');
      return;
    }
    await updateTransaction.mutateAsync({ id: tx.transaction_id, updates: edits });
    setRowEdits(prev => { const next = { ...prev }; delete next[tx.transaction_id]; return next; });
  };

  const togglePaid = async (tx: Transaction) => {
    const isPaid = tx.transaction_status === 'paid' || tx.transaction_status === 'received';
    const newStatus = isPaid ? 'pending' : (tx.transaction_type === 'income' ? 'received' : 'paid');
    await updateTransaction.mutateAsync({ id: tx.transaction_id, updates: { transaction_status: newStatus } });
  };

  const deleteInstallmentTx = async (tx: Transaction) => {
    if (tx.transaction_status === 'paid' || tx.transaction_status === 'received') {
      alert('Não é possível excluir uma parcela já paga.');
      return;
    }
    if (installmentTransactions.length === 1) {
      alert('Não é possível excluir a última parcela do grupo. O grupo ficaria sem parcelas.');
      return;
    }
    if (!window.confirm(`Excluir parcela ${tx.installment_number}/${tx.installment_total}? Esta ação não pode ser desfeita.`)) return;
    await deleteTransaction.mutateAsync(tx.transaction_id);
  };

  const markAllPending = async () => {
    const pending = installmentTransactions.filter(
      tx => tx.transaction_status !== 'paid' && tx.transaction_status !== 'received'
    );
    if (pending.length === 0) return;
    if (!window.confirm(`Marcar ${pending.length} parcela(s) pendente(s) como pagas? Esta ação pode ser revertida individualmente.`)) return;
    setMarkingAllPaid(true);
    try {
      await Promise.all(pending.map(tx => {
        const newStatus = tx.transaction_type === 'income' ? 'received' : 'paid';
        return updateTransaction.mutateAsync({ id: tx.transaction_id, updates: { transaction_status: newStatus } });
      }));
    } finally {
      setMarkingAllPaid(false);
    }
  };

  const toggleRowSelection = (txId: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(txId)) next.delete(txId);
      else next.add(txId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedRows.size === installmentTransactions.length && installmentTransactions.length > 0) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(installmentTransactions.map(t => t.transaction_id)));
    }
  };

  const deleteSelected = async () => {
    const selectedTxs = installmentTransactions.filter(tx => selectedRows.has(tx.transaction_id));
    const paidSelected = selectedTxs.filter(tx => tx.transaction_status === 'paid' || tx.transaction_status === 'received');
    if (paidSelected.length > 0) {
      alert(`Não é possível excluir ${paidSelected.length} parcela(s) já paga(s). Desmarque-as e tente novamente.`);
      return;
    }
    if (installmentTransactions.length - selectedRows.size === 0) {
      alert('Não é possível excluir todas as parcelas do grupo. Pelo menos uma deve ser mantida.');
      return;
    }
    if (!window.confirm(`Excluir ${selectedRows.size} parcela(s) selecionada(s)? Esta ação não pode ser desfeita.`)) return;
    await Promise.all(Array.from(selectedRows).map(id => deleteTransaction.mutateAsync(id)));
    setSelectedRows(new Set());
  };

  const markSelectedAsPaid = async () => {
    const selectedTxs = installmentTransactions.filter(tx => selectedRows.has(tx.transaction_id));
    const pending = selectedTxs.filter(tx => tx.transaction_status !== 'paid' && tx.transaction_status !== 'received');
    if (pending.length === 0) {
      alert('Todas as parcelas selecionadas já estão pagas.');
      return;
    }
    if (!window.confirm(`Marcar ${pending.length} parcela(s) selecionada(s) como pagas?`)) return;
    await Promise.all(pending.map(tx => {
      const newStatus = tx.transaction_type === 'income' ? 'received' : 'paid';
      return updateTransaction.mutateAsync({ id: tx.transaction_id, updates: { transaction_status: newStatus } });
    }));
    setSelectedRows(new Set());
  };

  const applyBulkEdit = async () => {
    if (selectedRows.size === 0) return;
    const updates: Record<string, string | null> = {};
    for (const [key, value] of Object.entries(bulkEditData)) {
      if (value === '') continue;
      updates[key] = value === '__clear__' ? null : value;
    }
    if (Object.keys(updates).length === 0) {
      alert('Selecione pelo menos um campo para alterar.');
      return;
    }
    if (!window.confirm(`Aplicar alterações em ${selectedRows.size} parcela(s)?`)) return;
    setApplyingBulkEdit(true);
    try {
      await Promise.all(
        Array.from(selectedRows).map(id =>
          updateTransaction.mutateAsync({ id, updates: updates as Partial<Transaction> })
        )
      );
      setShowBulkEditModal(false);
      setSelectedRows(new Set());
      setBulkEditData({});
    } finally {
      setApplyingBulkEdit(false);
    }
  };

  const getInstallmentStatusBadge = (tx: Transaction) => {
    const isPaid = tx.transaction_status === 'paid' || tx.transaction_status === 'received';
    if (isPaid) return { label: tx.transaction_type === 'income' ? 'Recebida' : 'Paga', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };
    const isOverdue = new Date(tx.transaction_date) < new Date(new Date().toISOString().split('T')[0]);
    if (isOverdue) return { label: 'Vencida', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
    return { label: 'Pendente', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' };
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
    setSelectedRows(new Set());
    setShowBulkEditModal(false);
    setBulkEditData({});
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

  const installmentsTotalAmount = installmentTransactions.reduce((s, t) => s + Number(t.transaction_amount), 0);
  const sumMismatch = !!installmentGroupData?.total_value &&
    Math.abs(installmentsTotalAmount - installmentGroupData.total_value) > 0.01;
  const allRowsSelected = selectedRows.size === installmentTransactions.length && installmentTransactions.length > 0;
  const someRowsSelected = selectedRows.size > 0 && !allRowsSelected;

  const tabs = [
    { id: 'data', label: 'Dados', icon: <Calendar className="w-4 h-4" /> },
    {
      id: 'installments',
      label: 'Parcelas',
      icon: <CreditCard className="w-4 h-4" />,
      disabled: hasInstallmentGroup ? false : !isInstallment,
    },
    ...(!isEditing ? [{
      id: 'recurrence',
      label: 'Recorrência',
      icon: <Repeat className="w-4 h-4" />,
      disabled: !isRecurring,
    }] : []),
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
      default: return 'text-text-secondary';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <div className="flex items-center space-x-2">
          <span>{isEditing ? 'Editar' : 'Nova'} {getTransactionTypeLabel()}</span>
          <span className={`text-sm font-normal ${getTransactionTypeColor()}`}>
            ({transactionType})
          </span>
        </div>
      }
      size="xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* Tab Navigation */}
        {(!isEditing || hasInstallmentGroup) && (
          <TabSelector
            tabs={tabs}
            activeTab={activeTab}
            onChange={handleTabChange}
          />
        )}

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeTab === 'data' && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-text-primary border-b border-border pb-2">
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
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Valor *
                    </label>
                    <input
                      type="text"
                      value={currencyDisplayValue}
                      onChange={handleCurrencyChange}
                      placeholder="R$ 0,00"
                      className={cn(
                        'block w-full px-3 py-2 text-sm border border-border rounded-md shadow-sm bg-bg-page text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-transparent',
                        errors.amount && 'border-red-300 focus:ring-red-500'
                      )}
                      required
                    />
                    {errors.amount && (
                      <p className="text-xs text-red-600 mt-1">{errors.amount.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
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
                <h3 className="text-lg font-semibold text-text-primary border-b border-border pb-2">
                  Conta e Pagamento
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
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
                      <label className="block text-sm font-medium text-text-secondary mb-2">
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
                <h3 className="text-lg font-semibold text-text-primary border-b border-border pb-2">
                  Organização
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
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

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
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
                </div>
              </div>

              {/* Options */}
              {!isEditing && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-text-primary border-b border-border pb-2">
                    Opções Avançadas
                  </h3>

                  <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-6">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        {...register('is_installment')}
                        className="mr-2 h-4 w-4 text-accent focus:ring-accent border-border rounded"
                      />
                      <span className="text-sm font-medium text-text-secondary">É parcelado?</span>
                    </label>

                    {/* Installment Field - Only show when installment is enabled */}
                    {isInstallment && (
                      <div className="flex items-center space-x-2">
                        <label className="text-sm font-medium text-text-secondary">Parcela:</label>
                        <div className="flex items-center space-x-1">
                          <input
                            type="number"
                            min="1"
                            max={totalInstallments}
                            value={currentInstallmentNumber}
                            onChange={(e) => setCurrentInstallmentNumber(Number(e.target.value))}
                            className="w-16 px-2 py-1 text-sm border border-border rounded bg-bg-page text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                          />
                          <span className="text-sm text-text-secondary">/</span>
                          <input
                            type="number"
                            min="2"
                            max="99"
                            value={totalInstallments}
                            onChange={(e) => setTotalInstallments(Number(e.target.value))}
                            className="w-16 px-2 py-1 text-sm border border-border rounded bg-bg-page text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                          />
                        </div>
                      </div>
                    )}

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        {...register('is_recurring')}
                        className="mr-2 h-4 w-4 text-accent focus:ring-accent border-border rounded"
                      />
                      <span className="text-sm font-medium text-text-secondary">É recorrente?</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Modo gerenciamento: parcelas existentes */}
          {activeTab === 'installments' && hasInstallmentGroup && (
            <div className="space-y-4">
              {/* Header do grupo */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-text-primary">
                    {installmentGroupData?.description ?? transaction?.transaction_description ?? 'Parcelas'}
                  </h3>
                  <p className="text-sm text-text-secondary mt-0.5">
                    {installmentGroupData
                      ? `${installmentGroupData.installment_count} parcelas · Total: ${formatCurrency(installmentGroupData.total_value)}`
                      : `${installmentTransactions.length} parcelas`}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {installmentTransactions.length > 0 && (() => {
                    const paid = installmentTransactions.filter(t => t.transaction_status === 'paid' || t.transaction_status === 'received').length;
                    return (
                      <span className="text-xs px-2 py-1 rounded-full bg-bg-surface text-text-secondary">
                        {paid}/{installmentTransactions.length} pagas
                      </span>
                    );
                  })()}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={markAllPending}
                    disabled={markingAllPaid || installmentTransactions.every(t => t.transaction_status === 'paid' || t.transaction_status === 'received')}
                  >
                    <CheckCheck className="w-3.5 h-3.5 mr-1.5" />
                    Marcar pendentes como pagas
                  </Button>
                </div>
              </div>

              {/* Toolbar de seleção */}
              {selectedRows.size > 0 && (
                <div className="flex items-center justify-between bg-accent/10 border border-accent/20 rounded-lg px-3 py-2 flex-wrap gap-2">
                  <span className="text-sm font-medium text-text-primary">
                    {selectedRows.size} parcela{selectedRows.size > 1 ? 's' : ''} selecionada{selectedRows.size > 1 ? 's' : ''}
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={markSelectedAsPaid}
                      disabled={updateTransaction.isPending}
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                      Marcar como pagas
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => { setBulkEditData({}); setShowBulkEditModal(true); }}
                    >
                      <Edit className="w-3.5 h-3.5 mr-1.5" />
                      Editar em massa
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={deleteSelected}
                      disabled={deleteTransaction.isPending}
                      className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Excluir selecionadas
                    </Button>
                    <button
                      type="button"
                      onClick={() => setSelectedRows(new Set())}
                      className="p-1 rounded text-text-muted hover:text-text-primary transition-colors"
                      title="Limpar seleção"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Tabela */}
              {loadingInstallments ? (
                <div className="text-center py-8 text-text-muted text-sm">Carregando parcelas...</div>
              ) : (
                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-bg-surface sticky top-0">
                        <tr>
                          <th className="py-2 px-3 w-8">
                            <input
                              type="checkbox"
                              checked={allRowsSelected}
                              ref={(el: HTMLInputElement | null) => { if (el) el.indeterminate = someRowsSelected; }}
                              onChange={toggleSelectAll}
                              className="h-3.5 w-3.5 rounded border-border text-accent focus:ring-accent cursor-pointer"
                            />
                          </th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-text-secondary">#</th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-text-secondary">Vencimento</th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-text-secondary">Competência</th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-text-secondary">Centro de Custo</th>
                          <th className="text-right py-2 px-3 text-xs font-medium text-text-secondary">Valor</th>
                          <th className="text-center py-2 px-3 text-xs font-medium text-text-secondary">Status</th>
                          <th className="text-center py-2 px-3 text-xs font-medium text-text-secondary">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {installmentTransactions.map((tx) => {
                          const badge = getInstallmentStatusBadge(tx);
                          const dirty = isRowDirty(tx.transaction_id);
                          const isPaid = tx.transaction_status === 'paid' || tx.transaction_status === 'received';
                          const isSelected = selectedRows.has(tx.transaction_id);
                          const txDate = String(getRowValue(tx.transaction_id, 'transaction_date', tx.transaction_date));
                          const isOverdue = !isPaid && txDate < new Date().toISOString().split('T')[0];
                          return (
                            <tr
                              key={tx.transaction_id}
                              className={cn('border-t border-border hover:bg-bg-surface/50', isSelected && 'bg-accent/5')}
                            >
                              <td className="py-2 px-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleRowSelection(tx.transaction_id)}
                                  className="h-3.5 w-3.5 rounded border-border text-accent focus:ring-accent cursor-pointer"
                                />
                              </td>
                              <td className="py-2 px-3 text-sm text-text-primary whitespace-nowrap">
                                {tx.installment_number}/{tx.installment_total}
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="date"
                                  value={txDate}
                                  onChange={e => setRowField(tx.transaction_id, 'transaction_date', e.target.value)}
                                  disabled={isPaid}
                                  title={isPaid ? 'Parcela paga — edição bloqueada' : undefined}
                                  className={cn(
                                    'text-xs border rounded px-2 py-1 w-full bg-bg-page text-text-primary focus:outline-none focus:ring-1 focus:ring-accent',
                                    isOverdue ? 'border-red-400 focus:ring-red-500' : 'border-border',
                                    isPaid && 'opacity-50 cursor-not-allowed'
                                  )}
                                />
                                {isOverdue && <p className="text-xs text-red-500 mt-0.5">Vencida</p>}
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="month"
                                  value={String(getRowValue(tx.transaction_id, 'transaction_competence_date', tx.transaction_competence_date ?? tx.transaction_date.slice(0, 7)))}
                                  onChange={e => setRowField(tx.transaction_id, 'transaction_competence_date', e.target.value)}
                                  disabled={isPaid}
                                  title={isPaid ? 'Parcela paga — edição bloqueada' : undefined}
                                  className={cn(
                                    'text-xs border border-border rounded px-2 py-1 w-full bg-bg-page text-text-primary focus:outline-none focus:ring-1 focus:ring-accent',
                                    isPaid && 'opacity-50 cursor-not-allowed'
                                  )}
                                />
                              </td>
                              <td className="py-2 px-3">
                                <select
                                  value={String(getRowValue(tx.transaction_id, 'transaction_cost_center_id', tx.transaction_cost_center_id) ?? '')}
                                  onChange={e => setRowField(tx.transaction_id, 'transaction_cost_center_id', e.target.value || null)}
                                  className="text-xs border border-border rounded px-2 py-1 w-full bg-bg-page text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                                >
                                  <option value="">Nenhum</option>
                                  {costCenters.map(c => (
                                    <option key={c.id} value={c.id}>{c.title}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0.01"
                                  value={Number(getRowValue(tx.transaction_id, 'transaction_amount', tx.transaction_amount))}
                                  onChange={e => setRowField(tx.transaction_id, 'transaction_amount', Number(e.target.value))}
                                  disabled={isPaid}
                                  title={isPaid ? 'Parcela paga — edição bloqueada' : undefined}
                                  className={cn(
                                    'text-xs border border-border rounded px-2 py-1 w-24 text-right bg-bg-page text-text-primary focus:outline-none focus:ring-1 focus:ring-accent',
                                    isPaid && 'opacity-50 cursor-not-allowed'
                                  )}
                                />
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', badge.className)}>
                                  {badge.label}
                                </span>
                              </td>
                              <td className="py-2 px-3">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => saveRow(tx)}
                                    disabled={!dirty || isPaid || updateTransaction.isPending}
                                    title={isPaid ? 'Parcela paga — edição bloqueada' : 'Salvar alterações'}
                                    className={cn(
                                      'p-1 rounded transition-colors',
                                      dirty && !isPaid
                                        ? 'text-accent hover:text-accent-hover'
                                        : 'text-text-muted cursor-not-allowed opacity-40'
                                    )}
                                  >
                                    <Save className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => togglePaid(tx)}
                                    disabled={updateTransaction.isPending}
                                    title={isPaid ? 'Marcar como pendente' : 'Marcar como paga'}
                                    className={cn(
                                      'p-1 rounded transition-colors',
                                      isPaid ? 'text-green-600 hover:text-green-700' : 'text-text-muted hover:text-green-600'
                                    )}
                                  >
                                    <CheckCircle className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => deleteInstallmentTx(tx)}
                                    disabled={deleteTransaction.isPending || isPaid || installmentTransactions.length === 1}
                                    title={
                                      isPaid ? 'Não é possível excluir parcela paga' :
                                      installmentTransactions.length === 1 ? 'Não é possível excluir a última parcela' :
                                      'Excluir parcela'
                                    }
                                    className={cn(
                                      'p-1 rounded transition-colors',
                                      isPaid || installmentTransactions.length === 1
                                        ? 'text-text-muted opacity-40 cursor-not-allowed'
                                        : 'text-text-muted hover:text-red-600'
                                    )}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Totalizador */}
                  {installmentTransactions.length > 0 && (
                    <div className={cn(
                      'border-t border-border px-3 py-2 flex justify-between items-center gap-2 flex-wrap',
                      sumMismatch ? 'bg-red-50 dark:bg-red-900/10' : 'bg-bg-surface'
                    )}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text-primary">Total das parcelas:</span>
                        {sumMismatch && (
                          <span className="text-xs text-red-600 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full">
                            Diverge do total do grupo ({formatCurrency(installmentGroupData!.total_value)})
                          </span>
                        )}
                      </div>
                      <span className={cn('text-sm font-bold', sumMismatch ? 'text-red-600' : 'text-text-primary')}>
                        {formatCurrency(installmentsTotalAmount)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Modo criação: gerar parcelas novas */}
          {activeTab === 'installments' && !isEditing && isInstallment && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-text-primary">
                  Configuração de Parcelas
                </h3>
                <div className="text-sm text-text-secondary">
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
                    <h4 className="font-medium text-text-primary">
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

                  <div className="border border-border rounded-lg overflow-hidden">
                    <div className="max-h-64 overflow-y-auto">
                      <table className="w-full">
                        <thead className="bg-bg-surface sticky top-0">
                          <tr>
                            <th className="text-left py-2 px-3 text-xs font-medium text-text-secondary">Parcela</th>
                            <th className="text-left py-2 px-3 text-xs font-medium text-text-secondary">Data</th>
                            <th className="text-left py-2 px-3 text-xs font-medium text-text-secondary">Competência</th>
                            <th className="text-left py-2 px-3 text-xs font-medium text-text-secondary">Centro de Custo</th>
                            <th className="text-right py-2 px-3 text-xs font-medium text-text-secondary">Valor</th>
                            <th className="text-center py-2 px-3 text-xs font-medium text-text-secondary">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {installments.map((installment, index) => (
                            <tr key={installment.id} className="border-t border-border">
                              <td className="py-2 px-3 text-sm text-text-primary">
                                {installment.number}/{installments.length}
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="date"
                                  value={installment.date}
                                  onChange={(e) => updateInstallment(installment.id, 'date', e.target.value)}
                                  className="text-xs border border-border rounded px-2 py-1 w-full bg-bg-page text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="month"
                                  value={installment.competence}
                                  onChange={(e) => updateInstallment(installment.id, 'competence', e.target.value)}
                                  className="text-xs border border-border rounded px-2 py-1 w-full bg-bg-page text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <select
                                  value={installment.cost_center_id}
                                  onChange={(e) => updateInstallment(installment.id, 'cost_center_id', e.target.value)}
                                  className="text-xs border border-border rounded px-2 py-1 w-full bg-bg-page text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
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
                                  className="text-xs border border-border rounded px-2 py-1 w-full text-right bg-bg-page text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <div className="flex justify-center space-x-1">
                                  <button
                                    type="button"
                                    onClick={() => deleteInstallment(installment.id)}
                                    className="p-1 text-text-muted hover:text-red-600 transition-colors"
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
                    <div className="bg-bg-surface border-t border-border px-3 py-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-text-primary">
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
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                      <p className="text-sm text-yellow-800 dark:text-yellow-300">
                        <strong>Atenção:</strong> A soma das parcelas ({formatCurrency(installmentsTotal)}) 
                        não confere com o valor principal ({formatCurrency(mainAmount || 0)}). 
                        Ajuste os valores antes de salvar.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {!installmentsGenerated && (
                <div className="text-center py-8 text-text-muted">
                  <CreditCard className="w-12 h-12 text-text-muted mx-auto mb-3" />
                  <p className="text-sm font-medium">Nenhuma parcela gerada</p>
                  <p className="text-xs">Clique em "Visualizar Parcelas" para gerar as parcelas automaticamente</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'recurrence' && !isEditing && isRecurring && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-text-primary">
                  Configuração de Recorrência
                </h3>
                <div className="text-sm text-text-secondary">
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
                    <label className="block text-sm font-medium text-text-secondary mb-2">
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
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Ajuste de Vencimento
                  </label>
                  <Dropdown
                    options={dueAdjustmentOptions}
                    value={recurrenceData.due_adjustment}
                    onChange={(value) => setRecurrenceData(prev => ({ ...prev, due_adjustment: value as any }))}
                  />
                  <p className="text-xs text-text-muted mt-1">
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
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-3 flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  Prévia da Recorrência
                </h4>
                
                <div className="space-y-2">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    <strong>Tipo:</strong> {recurrenceTypeOptions.find(t => t.value === recurrenceData.recurrence_type)?.label}
                  </p>
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    <strong>Início:</strong> {new Date(recurrenceData.start_date).toLocaleDateString('pt-BR')}
                  </p>
                  {recurrenceData.end_date && (
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      <strong>Fim:</strong> {new Date(recurrenceData.end_date).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                  {recurrenceData.repeat_count && (
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      <strong>Repetições:</strong> {recurrenceData.repeat_count}x
                    </p>
                  )}
                  
                  <div className="mt-3">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">Próximas ocorrências:</p>
                    <div className="flex flex-wrap gap-2">
                      {generateRecurrencePreview().map((date, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs rounded">
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
        <div className="flex justify-between items-center pt-6 border-t border-border">
          <div className="text-sm text-text-secondary space-y-1">
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

      {/* Modal de edição em massa */}
      <Modal
        isOpen={showBulkEditModal}
        onClose={() => { setShowBulkEditModal(false); setBulkEditData({}); }}
        title={`Editar em massa — ${selectedRows.size} parcela${selectedRows.size > 1 ? 's' : ''}`}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Os campos preenchidos abaixo serão aplicados a todas as parcelas selecionadas. Campos com "— não alterar —" serão ignorados. Datas e valores só podem ser alterados individualmente.
          </p>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Centro de Custo</label>
            <select
              value={bulkEditData.transaction_cost_center_id ?? ''}
              onChange={e => setBulkEditData(prev => ({ ...prev, transaction_cost_center_id: e.target.value }))}
              className="text-sm border border-border rounded-md px-3 py-2 w-full bg-bg-page text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">— não alterar —</option>
              <option value="__clear__">Nenhum (remover)</option>
              {costCenters.map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Categoria</label>
            <select
              value={bulkEditData.transaction_category_id ?? ''}
              onChange={e => setBulkEditData(prev => ({ ...prev, transaction_category_id: e.target.value }))}
              className="text-sm border border-border rounded-md px-3 py-2 w-full bg-bg-page text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">— não alterar —</option>
              <option value="__clear__">Nenhuma (remover)</option>
              {categories.map(c => (
                <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Conta Bancária / Caixa</label>
            <select
              value={bulkEditData.transaction_bank_id ?? ''}
              onChange={e => setBulkEditData(prev => ({ ...prev, transaction_bank_id: e.target.value }))}
              className="text-sm border border-border rounded-md px-3 py-2 w-full bg-bg-page text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">— não alterar —</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Método de Pagamento</label>
            <select
              value={bulkEditData.transaction_payment_method ?? ''}
              onChange={e => setBulkEditData(prev => ({ ...prev, transaction_payment_method: e.target.value }))}
              className="text-sm border border-border rounded-md px-3 py-2 w-full bg-bg-page text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">— não alterar —</option>
              {paymentMethodOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setShowBulkEditModal(false); setBulkEditData({}); }}
              disabled={applyingBulkEdit}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              loading={applyingBulkEdit}
              onClick={applyBulkEdit}
            >
              Aplicar em {selectedRows.size} parcela{selectedRows.size > 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      </Modal>
    </Modal>
  );
}