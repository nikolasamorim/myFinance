import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Dropdown } from '../ui/Dropdown';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useCreateTransaction, useUpdateTransaction } from '../../hooks/useTransactions';
import type { Transaction } from '../../types';

const transactionSchema = z.object({
  transaction_description: z.string().min(1, 'Descrição é obrigatória'),
  transaction_amount: z.number().min(0.01, 'Valor deve ser maior que zero'),
  transaction_type: z.enum(['income', 'expense', 'debt', 'investment']),
  transaction_date: z.string().min(1, 'Data é obrigatória'),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction?: Transaction;
}

export function TransactionModal({ isOpen, onClose, transaction }: TransactionModalProps) {
  const { currentWorkspace } = useWorkspace();
  const createTransaction = useCreateTransaction();
  const updateTransaction = useUpdateTransaction();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: transaction ? {
      transaction_description: transaction.transaction_description,
      transaction_amount: Number(transaction.transaction_amount),
      transaction_type: transaction.transaction_type,
      transaction_date: transaction.transaction_date,
    } : {
      transaction_date: new Date().toISOString().split('T')[0],
    },
  });

  const transactionType = watch('transaction_type');

  const typeOptions = [
    { value: 'income', label: 'Receita' },
    { value: 'expense', label: 'Despesa' },
    { value: 'debt', label: 'Dívida' },
    { value: 'investment', label: 'Investimento' },
  ];

  const onSubmit = async (data: TransactionFormData) => {
    if (!currentWorkspace) return;

    try {
      if (transaction) {
        await updateTransaction.mutateAsync({
          id: transaction.transaction_id,
          updates: data,
        });
      } else {
        await createTransaction.mutateAsync({
          ...data,
          transaction_workspace_id: currentWorkspace.workspace_id,
        });
      }
      
      reset();
      onClose();
    } catch (error) {
      console.error('Error saving transaction:', error);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={transaction ? 'Editar Transação' : 'Nova Transação'}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Descrição"
          {...register('transaction_description')}
          error={errors.transaction_description?.message}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Valor"
            type="number"
            step="0.01"
            {...register('transaction_amount', { valueAsNumber: true })}
            error={errors.transaction_amount?.message}
          />

          <Input
            label="Data"
            type="date"
            {...register('transaction_date')}
            error={errors.transaction_date?.message}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Tipo
          </label>
          <Dropdown
            options={typeOptions}
            value={transactionType}
            onChange={(value) => setValue('transaction_type', value as any)}
            placeholder="Selecione o tipo"
          />
          {errors.transaction_type && (
            <p className="text-xs text-red-600 mt-1">{errors.transaction_type.message}</p>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {transaction ? 'Atualizar' : 'Criar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}