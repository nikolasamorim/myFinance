import { getSupabaseAdmin } from './supabase';
import { getAllTransactions, type PluggyTransaction } from './pluggy.service';

/**
 * Importa transações de uma conexão Pluggy para a tabela `transactions`.
 * Idempotente via upsert (onConflict workspace+source+external_id, ignoreDuplicates).
 *
 * Operação potencialmente longa (pagina todas as transações do período) — deve
 * rodar numa Netlify background function, não dentro do webhook síncrono.
 */
export async function importarTransacoes(
    connection: any,
    from?: string,
    to?: string,
): Promise<void> {
    const admin = getSupabaseAdmin();
    const pluggyAccountId = connection.pluggy_account_id;
    if (!pluggyAccountId) return;

    const today = to || new Date().toISOString().split('T')[0];
    const transactions = await getAllTransactions(pluggyAccountId, from, today);

    if (transactions.length === 0) return;

    const rows = transactions.map((t: PluggyTransaction) => ({
        transaction_workspace_id: connection.workspace_id,
        transaction_type: t.amount > 0 ? 'income' : 'expense',
        transaction_description: t.description || '',
        transaction_amount: Math.abs(t.amount),
        transaction_date: t.date.split('T')[0],
        transaction_status: 'pending',
        transaction_bank_id: connection.account_id || null,
        transaction_origin: 'api',
        transaction_created_by_user_id: connection.created_by,
        transaction_payment_method: null,
        transaction_cost_center_id: null,
        transaction_category_id: null,
        transaction_card_id: null,
        transaction_person_id: null,
        transaction_recurrence: null,
        recurring: false,
        recurrence_id: null,
        recurrence_rule_id: null,
        recurrence_sequence: null,
        recurrence_instance_date: null,
        parent_recurrence_rule_id: null,
        is_recurrence_generated: false,
        generated_at: null,
        version: null,
        installment_group_id: null,
        installment_number: null,
        installment_total: null,
        import_source: 'open_finance',
        external_id: t.id,
        raw_data: t as unknown as Record<string, unknown>,
    }));

    const { data: inserted, error: insertErr } = await admin
        .from('transactions')
        .upsert(rows, {
            onConflict: 'transaction_workspace_id,import_source,external_id',
            ignoreDuplicates: true,
        })
        .select('transaction_id');

    if (insertErr) {
        console.error('[import] erro ao inserir transações:', insertErr.message);
        return;
    }

    const importedCount = (inserted ?? []).length;
    const skippedCount = transactions.length - importedCount;

    await admin
        .from('import_batches')
        .insert({
            workspace_id: connection.workspace_id,
            account_id: connection.account_id || null,
            source: 'open_finance',
            created_by: connection.created_by,
            item_count: importedCount,
            skipped_count: skippedCount,
            status: 'completed',
        });
}
