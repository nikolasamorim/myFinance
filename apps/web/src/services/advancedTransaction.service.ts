import { apiClient } from '../lib/apiClient';
import type { AdvancedTransactionData, Transaction } from '../types';
import { generateRecurrences } from './recurrenceEngine.service';

export const advancedTransactionService = {
  async createAdvancedTransaction(workspaceId: string, transactionType: string, data: AdvancedTransactionData, userId: string) {
    try {
      // Handle installment transactions
      if (data.is_installment && data.installments && data.installments.length > 0) {
        return await this.createInstallmentTransaction(workspaceId, userId, data.transaction_type, data);
      }

      // Handle recurring transactions
      if (data.is_recurring && data.recurrence) {
        return await this.createRecurringTransaction(workspaceId, userId, data.transaction_type, data);
      }

      // Handle simple transaction
      return await this.createSimpleTransaction(workspaceId, userId, data.transaction_type, data);
    } catch (error) {
      console.error('Error in createAdvancedTransaction:', error);
      throw error;
    }
  },

  async createSimpleTransaction(workspaceId: string, userId: string, transactionType: string, data: AdvancedTransactionData) {
    return apiClient!.post<Transaction>(`/workspaces/${workspaceId}/transactions`, {
      transaction_created_by_user_id: userId,
      transaction_type: transactionType,
      transaction_description: data.description,
      transaction_amount: data.amount,
      transaction_date: data.due_date,
      transaction_bank_id: data.account_id,
      transaction_card_id: data.credit_card_id || null,
      transaction_cost_center_id: data.cost_center_id || null,
      transaction_category_id: data.category_id || null,
      transaction_status: 'pending',
    });
  },

  async createInstallmentTransaction(workspaceId: string, userId: string, transactionType: string, data: AdvancedTransactionData) {
    if (!data.installments || data.installments.length === 0) {
      throw new Error('Installments data is required for installment transactions');
    }

    // First, create the installment group
    const installmentGroup = await apiClient!.post<any>(`/workspaces/${workspaceId}/installment-groups`, {
      user_id: userId,
      total_value: data.amount,
      installment_count: data.installments.length,
      initial_due_date: data.due_date,
      description: data.description,
      account_id: data.account_id,
      card_id: data.credit_card_id || null,
    });

    // Then, create individual installment transactions
    const installmentTransactions = data.installments.map((installment) => ({
      transaction_created_by_user_id: userId,
      transaction_type: transactionType,
      transaction_description: `${data.description} - Parcela ${installment.number}/${data.installments!.length}`,
      transaction_amount: installment.amount,
      transaction_date: installment.date,
      transaction_bank_id: data.account_id,
      transaction_card_id: data.credit_card_id || null,
      transaction_cost_center_id: installment.cost_center_id || null,
      transaction_category_id: data.category_id || null,
      transaction_status: 'pending',
      installment_group_id: installmentGroup.id,
      installment_number: installment.number,
      installment_total: data.installments!.length,
    }));

    const transactions = await apiClient!.post<Transaction[]>(`/workspaces/${workspaceId}/transactions`, installmentTransactions);

    return { installmentGroup, transactions };
  },

  async createRecurringTransaction(workspaceId: string, userId: string, transactionType: string, data: AdvancedTransactionData) {
    if (!data.recurrence) {
      throw new Error('Recurrence data is required for recurring transactions');
    }

    const recurrenceRule = await apiClient!.post<any>(`/workspaces/${workspaceId}/recurrence-rules`, {
      transaction_type: transactionType,
      description: data.description,
      amount: data.amount,
      start_date: data.recurrence.start_date,
      recurrence_type: data.recurrence.recurrence_type,
      repeat_count: data.recurrence.repeat_count || null,
      end_date: data.recurrence.end_date || null,
      due_adjustment: data.recurrence.due_adjustment || 'none',
      recurrence_day: data.recurrence.recurrence_day?.toString() || null,
      account_id: data.account_id || null,
      category_id: data.category_id || null,
    });

    const engineResult = await generateRecurrences(recurrenceRule.id, 'on_save', userId, workspaceId);

    if (!engineResult.success) {
      throw new Error('Failed to generate recurrence transactions: ' + (engineResult.error || 'unknown'));
    }

    return { recurrenceRule, generated: engineResult.generated };
  },

  async getInstallmentGroup(groupId: string, workspaceId: string) {
    return apiClient!.get<any>(`/workspaces/${workspaceId}/installment-groups/${groupId}`);
  },

  async getRecurrenceRule(ruleId: string, workspaceId: string) {
    return apiClient!.get<any>(`/workspaces/${workspaceId}/recurrence-rules/${ruleId}`);
  },

  async updateInstallmentGroup(groupId: string, updates: Partial<any>, workspaceId: string) {
    return apiClient!.put<any>(`/workspaces/${workspaceId}/installment-groups/${groupId}`, updates);
  },

  async updateRecurrenceRule(ruleId: string, updates: Partial<any>, workspaceId: string) {
    return apiClient!.put<any>(`/workspaces/${workspaceId}/recurrence-rules/${ruleId}`, updates);
  },

  async deleteInstallmentGroup(groupId: string, workspaceId: string) {
    await apiClient!.delete(`/workspaces/${workspaceId}/installment-groups/${groupId}`);
  },

  async deleteRecurrenceRule(ruleId: string, workspaceId: string) {
    await apiClient!.delete(`/workspaces/${workspaceId}/recurrence-rules/${ruleId}`);
  },

  async markInstallmentAsPaid(transactionId: string, workspaceId: string) {
    return apiClient!.put<Transaction>(
      `/workspaces/${workspaceId}/transactions/${transactionId}`,
      { transaction_status: 'paid' }
    );
  },

  async pauseRecurrenceRule(ruleId: string, workspaceId: string) {
    return apiClient!.post<any>(`/workspaces/${workspaceId}/recurrence-rules/${ruleId}/pause`, {});
  },

  async resumeRecurrenceRule(ruleId: string, workspaceId: string) {
    return apiClient!.post<any>(`/workspaces/${workspaceId}/recurrence-rules/${ruleId}/resume`, {});
  },

  async cancelRecurrenceRule(ruleId: string, workspaceId: string) {
    return apiClient!.post<any>(`/workspaces/${workspaceId}/recurrence-rules/${ruleId}/cancel`, {});
  },
};
