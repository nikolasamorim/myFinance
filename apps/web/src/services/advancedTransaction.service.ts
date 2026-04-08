import { supabase } from '../lib/supabase';
import { apiClient } from '../lib/apiClient';
import type { AdvancedTransactionData, InstallmentData, RecurrenceData, Transaction } from '../types';
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
    const { data: transaction, error } = await supabase
      .from('transactions')
      .insert([{
        transaction_workspace_id: workspaceId,
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
      }])
      .select()
      .single();

    if (error) throw new Error('Failed to create transaction: ' + error.message);
    return transaction;
  },

  async createInstallmentTransaction(workspaceId: string, userId: string, transactionType: string, data: AdvancedTransactionData) {
    if (!data.installments || data.installments.length === 0) {
      throw new Error('Installments data is required for installment transactions');
    }

    // First, create the installment group
    const { data: installmentGroup, error: groupError } = await supabase
      .from('installment_groups')
      .insert([{
        workspace_id: workspaceId,
        user_id: userId,
        total_value: data.amount,
        installment_count: data.installments.length,
        initial_due_date: data.due_date,
        description: data.description,
        account_id: data.account_id,
        card_id: data.credit_card_id || null,
      }])
      .select()
      .single();

    if (groupError) throw new Error('Failed to create installment group: ' + groupError.message);

    // Then, create individual installment transactions
    const installmentTransactions = data.installments.map((installment, index) => ({
      transaction_workspace_id: workspaceId,
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

    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .insert(installmentTransactions)
      .select();

    if (transactionsError) throw new Error('Failed to create installment transactions: ' + transactionsError.message);

    return { installmentGroup, transactions };
  },

  async createRecurringTransaction(workspaceId: string, userId: string, transactionType: string, data: AdvancedTransactionData) {
    if (!data.recurrence) {
      throw new Error('Recurrence data is required for recurring transactions');
    }

    const { data: recurrenceRule, error: ruleError } = await supabase
      .from('recurrence_rules')
      .insert([{
        workspace_id: workspaceId,
        created_by_user_id: userId,
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
        status: 'active',
        generation_count: 0,
      }])
      .select()
      .single();

    if (ruleError) throw new Error('Failed to create recurrence rule: ' + ruleError.message);

    const engineResult = await generateRecurrences(recurrenceRule.id, 'on_save', userId);

    if (!engineResult.success) {
      throw new Error('Failed to generate recurrence transactions: ' + (engineResult.error || 'unknown'));
    }

    return { recurrenceRule, generated: engineResult.generated };
  },

  async getInstallmentGroup(groupId: string) {
    const { data, error } = await supabase
      .from('installment_groups')
      .select(`
        *,
        transactions:transactions!installment_group_id(*)
      `)
      .eq('id', groupId)
      .single();

    if (error) throw new Error('Failed to fetch installment group: ' + error.message);
    return data;
  },

  async getRecurrenceRule(ruleId: string) {
    const { data, error } = await supabase
      .from('recurrence_rules')
      .select(`
        *,
        transactions:transactions!recurrence_id(*)
      `)
      .eq('id', ruleId)
      .single();

    if (error) throw new Error('Failed to fetch recurrence rule: ' + error.message);
    return data;
  },

  async updateInstallmentGroup(groupId: string, updates: Partial<any>) {
    const { data, error } = await supabase
      .from('installment_groups')
      .update(updates)
      .eq('id', groupId)
      .select()
      .single();

    if (error) throw new Error('Failed to update installment group: ' + error.message);
    return data;
  },

  async updateRecurrenceRule(ruleId: string, updates: Partial<any>) {
    const { data, error } = await supabase
      .from('recurrence_rules')
      .update(updates)
      .eq('id', ruleId)
      .select()
      .single();

    if (error) throw new Error('Failed to update recurrence rule: ' + error.message);
    return data;
  },

  async deleteInstallmentGroup(groupId: string) {
    // This will cascade delete all related transactions
    const { error } = await supabase
      .from('installment_groups')
      .delete()
      .eq('id', groupId);

    if (error) throw new Error('Failed to delete installment group: ' + error.message);
  },

  async deleteRecurrenceRule(ruleId: string) {
    // This will cascade delete all related transactions
    const { error } = await supabase
      .from('recurrence_rules')
      .delete()
      .eq('id', ruleId);

    if (error) throw new Error('Failed to delete recurrence rule: ' + error.message);
  },

  async markInstallmentAsPaid(transactionId: string, workspaceId: string) {
    return apiClient!.put<Transaction>(
      `/workspaces/${workspaceId}/transactions/${transactionId}`,
      { transaction_status: 'paid' }
    );
  },

  async pauseRecurrenceRule(ruleId: string) {
    return await this.updateRecurrenceRule(ruleId, { status: 'paused' });
  },

  async resumeRecurrenceRule(ruleId: string) {
    return await this.updateRecurrenceRule(ruleId, { status: 'active' });
  },

  async cancelRecurrenceRule(ruleId: string) {
    return await this.updateRecurrenceRule(ruleId, { status: 'canceled' });
  },
};