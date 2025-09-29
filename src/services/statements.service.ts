import { supabase } from '../lib/supabase';
import { z } from 'zod';

const StatementWindowSchema = z.object({
  period_start: z.string(),
  period_end: z.string(),
  due_date: z.string(),
});

const PaymentDataSchema = z.object({
  amount: z.number().positive(),
  paid_at: z.string(),
  method: z.enum(['pix', 'boleto', 'ted', 'dda']),
});

export const statementsService = {
  async computeStatementWindow(cardId: string, anchorDate: string) {
    const { data, error } = await supabase.rpc('compute_statement_window', {
      anchor_date: anchorDate,
      card_id: cardId,
    });

    if (error) throw new Error('Failed to compute statement window: ' + error.message);
    return StatementWindowSchema.parse(data[0]);
  },

  async ensureOpenStatement(cardId: string, periodStart: string) {
    const { data, error } = await supabase.rpc('ensure_open_statement', {
      card_id: cardId,
      period_start: periodStart,
    });

    if (error) throw new Error('Failed to ensure open statement: ' + error.message);
    return data;
  },

  async syncItemFromTransaction(transactionId: string) {
    const { error } = await supabase.rpc('sync_item_from_transaction', {
      transaction_id: transactionId,
    });

    if (error) throw new Error('Failed to sync transaction: ' + error.message);
  },

  async closeStatement(statementId: string) {
    const { error } = await supabase.rpc('close_statement', {
      statement_id: statementId,
    });

    if (error) throw new Error('Failed to close statement: ' + error.message);
  },

  async registerStatementPayment(statementId: string, paymentData: z.infer<typeof PaymentDataSchema>) {
    const validated = PaymentDataSchema.parse(paymentData);
    
    const { error } = await supabase.rpc('register_statement_payment', {
      statement_id: statementId,
      amount_param: validated.amount,
      paid_at_param: validated.paid_at,
      method_param: validated.method,
    });

    if (error) throw new Error('Failed to register payment: ' + error.message);
  },

  async moveItemToNextCycle(itemId: string) {
    const { error } = await supabase.rpc('move_item_to_next_cycle', {
      statement_item_id: itemId,
    });

    if (error) throw new Error('Failed to move item: ' + error.message);
  },

  async getStatement(workspaceId: string, cardId: string, periodStart: string) {
    const { data, error } = await supabase
      .from('card_statements')
      .select(`
        *,
        credit_card:credit_cards!inner(credit_card_name, color, icon)
      `)
      .eq('workspace_id', workspaceId)
      .eq('credit_card_id', cardId)
      .eq('period_start', periodStart)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error('Failed to fetch statement: ' + error.message);
    }

    return data;
  },

  async getStatementItems(statementId: string, filters?: any) {
    let query = supabase
      .from('statement_items')
      .select(`
        *,
        category:categories(category_name),
        cost_center:cost_centers(cost_center_name),
        transaction:transactions(transaction_id)
      `)
      .eq('card_statement_id', statementId)
      .order('occurred_at', { ascending: false });

    if (filters?.type && filters.type !== 'all') {
      query = query.eq('type', filters.type);
    }

    if (filters?.search) {
      query = query.ilike('description', `%${filters.search}%`);
    }

    const { data, error } = await query;
    if (error) throw new Error('Failed to fetch statement items: ' + error.message);
    return data || [];
  },

  async attachTransactionToInvoice(transactionId: string) {
    return this.syncItemFromTransaction(transactionId);
  },
};